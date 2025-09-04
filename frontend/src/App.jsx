import React, { useMemo, useRef, useState } from "react";

export default function App() {
  const defaultApi = useMemo(() => {
    if (typeof window !== "undefined" && window.API_BASE) return window.API_BASE;
    return "https://songscanner-backend.onrender.com";
  }, []);

  const [apiBase, setApiBase] = useState(defaultApi);
  const [status, setStatus] = useState("Idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fileRef = useRef(null);
  const urlRef = useRef(null);

  async function handleScan() {
    setError("");
    setRows([]);
    setStatus("Starting…");
    setProgress({ done: 0, total: 0 });

    const file = fileRef.current?.files?.[0] || null;
    const url = urlRef.current?.value?.trim() || "";

    if (!file && !url) {
      setError("Choose a file or enter a URL.");
      return;
    }
    if (!apiBase) {
      setError("Set API Base URL first.");
      return;
    }

    try {
      setBusy(true);
      const fd = new FormData();
      if (file) fd.append("file", file);
      if (url) fd.append("url", url);

      const post = await fetch(`${apiBase.replace(/\/$/, "")}/scan`, {
        method: "POST",
        body: fd,
      });
      if (!post.ok) throw new Error(`POST /scan failed: ${post.status}`);
      const { jobId } = await post.json();
      setStatus(`Job: ${jobId}`);

      async function poll() {
        const r = await fetch(`${apiBase.replace(/\/$/, "")}/scan/${jobId}`);
        if (!r.ok) throw new Error(`GET /scan/:id failed: ${r.status}`);
        const j = await r.json();
        if (j.progress) setProgress({ done: j.progress.done || 0, total: j.progress.total || 0 });
        if (j.state === "done") {
          setRows(Array.isArray(j.merged) ? j.merged : []);
          setStatus("Completed.");
          setBusy(false);
          return;
        }
        if (j.state === "error") {
          throw new Error(j.error || "Unknown error");
        }
        setTimeout(poll, 1000);
      }
      poll();
    } catch (e) {
      setBusy(false);
      setStatus("Idle");
      setError(e && e.message ? e.message : String(e));
    }
  }

  function ProgressBar() {
    const pct = progress.total ? Math.floor((progress.done / progress.total) * 100) : 0;
    return (
      <div>
        <label className="block text-sm font-medium mb-1">Progress</label>
        <div className="w-full h-3 bg-slate-100 rounded-xl overflow-hidden">
          <div className="h-3 bg-slate-900" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-xs text-slate-600">
          {progress.total ? `${progress.done}/${progress.total} (${pct}%)` : status || "Idle"}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="h-2 w-full bg-green-600" />

      <main className="max-w-5xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">🎵 Song Scanner</h1>
          <p className="text-sm text-slate-600">Upload a file or paste a direct media / YouTube URL. This page calls your API and renders recognized songs.</p>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Choose Video/Audio File</label>
                <input ref={fileRef} type="file" accept="video/*,audio/*" className="block w-full text-sm border rounded-xl px-3 py-2" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Enter File URL</label>
                <input ref={urlRef} type="url" placeholder="https://example.com/media.mp4  OR  https://youtu.be/..." className="w-full rounded-xl border px-3 py-2" />
              </div>

              <div className="flex items-center gap-2">
                <input className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs" value={apiBase} onChange={(e) => setApiBase(e.target.value)} placeholder="https://songscanner-backend.onrender.com" />
                <button disabled={busy} onClick={handleScan} className="inline-flex items-center rounded-xl bg-green-600 text-white px-4 py-2 text-sm font-medium shadow hover:bg-green-700 disabled:opacity-50">{busy ? "Scanning…" : "Scan Songs"}</button>
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>

            <div className="space-y-3">
              <ProgressBar />
              <pre className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs h-40 overflow-auto whitespace-pre-wrap" aria-label="log">
{status}
              </pre>
            </div>

            <div className="text-sm text-slate-600">
              <p className="font-medium mb-2">Tips</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>For YouTube links, your API should fetch audio with yt-dlp + ffmpeg.</li>
                <li>Direct file URLs (MP4/M4A/MP3/WAV) are downloaded server-side and scanned.</li>
                <li>Some streaming sites use DRM and won’t work—upload a non-DRM file instead.</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200"></div>
          <div className="p-5">
            <h2 className="text-lg font-semibold">Results</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100">
                  <tr className="text-left text-xs text-slate-600">
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">End</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Artist</th>
                    <th className="px-3 py-2">Conf</th>
                    <th className="px-3 py-2">Lyric Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1">{r.start_hms ?? ""}</td>
                      <td className="px-3 py-1">{r.end_hms ?? ""}</td>
                      <td className="px-3 py-1">{r.title ?? ""}</td>
                      <td className="px-3 py-1">{r.artist ?? ""}</td>
                      <td className="px-3 py-1">{r.confidence != null ? Number(r.confidence).toFixed(3) : ""}</td>
                      <td className="px-3 py-1 text-slate-600">{r.lyrics_preview ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
