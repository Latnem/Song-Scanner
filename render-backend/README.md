# SongScanner Backend — Render-ready (Docker)

This folder contains everything you need to deploy your Node/Express backend on **Render** (or any Docker host). It includes **ffmpeg** and **yt-dlp** inside the Docker image.

## Files
- `server_combined_cjs_fixed.js` — CommonJS Express server with CORS + `/scan` API and YouTube support.
- `scan-songs.js` — Your scanner CLI (place your version here).
- `package.json` — Dependencies + start script.
- `Dockerfile` — Installs ffmpeg + yt-dlp and runs the server.
- `public/index.html` (optional) — If you add this, the server will serve a tiny UI too.

## Deploy to Render (Docker)
1. Push the **root** of this bundle (which has `render.yaml`) to GitHub.
2. On [render.com](https://render.com), click **New +** → **Blueprint** and select your repo.
3. Render will read `render.yaml` and provision the Web Service automatically.

When it’s live, you’ll get a URL like:
```
https://your-service.onrender.com
```
Use that URL in your GH Pages `index.html`:
```html
<script>window.API_BASE = "https://your-service.onrender.com";</script>
```

## Local Development (Docker)
```bash
cd render-backend
docker build -t songscanner .
docker run --rm -p 3000:3000 songscanner
# open http://localhost:3000/
```

## Local Development (Node)
Make sure **ffmpeg** and **yt-dlp** are installed locally:
```bash
cd render-backend
npm install
node server_combined_cjs_fixed.js
```

## Notes
- This server expects `scan-songs.js` to write a `*.songs.json` to a temp directory (as in the earlier examples).
- CORS is permissive (`*`) so your GH Pages frontend can call it from another origin. Tighten if needed.
- DRM-protected streaming platforms (Netflix, Disney+, Hulu, Prime Video, Viki, Viu, KOCOWA) are not supported.
