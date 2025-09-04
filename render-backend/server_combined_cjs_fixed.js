// server_combined_cjs_fixed.js
// Production-ready Express server for Song Scanner (with uploads/ fix)
const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const app = express();

// Ensure uploads dir exists before Multer uses it
const uploadsDir = path.join(__dirname, 'uploads');
try { if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
const upload = multer({ dest: uploadsDir });

app.use(cors({ origin: '*', methods: ['GET','POST','OPTIONS'], allowedHeaders: ['Content-Type'] }));
app.options('*', cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '2mb' }));

const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('/', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
} else {
  app.get('/', (_req, res) => res.status(200).json({ ok: true, msg: 'SongScanner backend up' }));
}

const jobs = Object.create(null);

async function downloadToTmp(url, ext = '.bin') {
  const tmp = path.join(os.tmpdir(), `media_${Date.now()}${ext}`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch URL: ${r.status} ${r.statusText}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(tmp, buf);
  return tmp;
}

function downloadYouTube(url) {
  return new Promise((resolve, reject) => {
    const outPath = path.join(os.tmpdir(), `yt_${Date.now()}.m4a`);
    const dl = spawn('yt-dlp', ['-f', 'bestaudio', '-o', outPath, url], { stdio: ['ignore','pipe','pipe'] });
    let stderr = '';
    dl.stderr.on('data', d => { stderr += d.toString(); });
    dl.on('close', code => {
      if (code === 0 && fs.existsSync(outPath)) resolve(outPath);
      else reject(new Error(`yt-dlp failed (code ${code}): ${stderr || 'unknown error'}`));
    });
  });
}

function findNewestSongsJson(dir) {
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.songs.json'))
    .map(f => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files.length ? path.join(dir, files[0].f) : null;
}

// POST /scan — accepts file or url
app.post('/scan', upload.single('file'), async (req, res) => {
  try {
    const { url, market = 'us', lyricsPreviewWords = '10', window: windowSec = '12', hop = '6', minConfidence = '0.6', minSpan = '8', mergeGap = '3', concurrency = '3' } = req.body || {};
    let inputPath = null, cleanup = null;

    if (req.file) { inputPath = req.file.path; cleanup = inputPath; }
    else if (url && url.trim()) {
      const u = url.trim();
      if (u.includes('youtube.com') || u.includes('youtu.be')) {
        inputPath = await downloadYouTube(u); cleanup = inputPath;
      } else {
        const clean = u.split('?')[0].toLowerCase();
        const ext = clean.endsWith('.mp3') ? '.mp3' : clean.endsWith('.m4a') ? '.m4a' : clean.endsWith('.wav') ? '.wav' : clean.endsWith('.mp4') ? '.mp4' : '.bin';
        inputPath = await downloadToTmp(u, ext); cleanup = inputPath;
      }
    } else {
      return res.status(400).json({ error: 'Provide a file or a url.' });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    jobs[jobId] = { state: 'processing', progress: { done: 0, total: 0 } };

    const outdir = os.tmpdir();
    const args = ['scan-songs.js', inputPath, '--outdir', outdir, '--market', String(market), '--lyrics-preview-words', String(lyricsPreviewWords), '--window', String(windowSec), '--hop', String(hop), '--min-confidence', String(minConfidence), '--min-span', String(minSpan), '--merge-gap', String(mergeGap), '--concurrency', String(concurrency)];

    const child = spawn('node', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (d) => {
      const s = d.toString();
      const m = s.match(/recognized\s+(\d+)\/(\d+)/i);
      if (m) jobs[jobId].progress = { done: Number(m[1]), total: Number(m[2]) };
    });
    let errBuf = '';
    child.stderr.on('data', d => { errBuf += d.toString(); });
    child.on('close', (code) => {
      try {
        if (code === 0) {
          const outFile = findNewestSongsJson(outdir);
          if (outFile && fs.existsSync(outFile)) {
            const merged = JSON.parse(fs.readFileSync(outFile, 'utf8'));
            jobs[jobId] = { state: 'done', progress: jobs[jobId].progress, merged };
          } else {
            jobs[jobId] = { state: 'error', error: 'Output JSON not found.' };
          }
        } else {
          jobs[jobId] = { state: 'error', error: `Scanner exited with code ${code}: ${errBuf}` };
        }
      } catch (e) {
        jobs[jobId] = { state: 'error', error: String(e) };
      } finally {
        try { if (cleanup && fs.existsSync(cleanup)) fs.unlinkSync(cleanup); } catch {}
        try { if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch {}
      }
    });

    return res.json({ jobId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

// GET /scan/:id — check job state
app.get('/scan/:id', (req, res) => {
  const job = jobs[req.params.id];
  if (!job) return res.status(404).json({ error: 'Not found' });
  return res.json(job);
});

app.listen(PORT, () => console.log(`SongScanner backend listening on :${PORT}`));
