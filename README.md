# Song Scanner — Monorepo (final)

## Structure
- `render-backend/` — Express API (Docker) with CORS, YouTube via yt-dlp, landing page
- `frontend/` — Vite + React (base: `/Song-Scanner/`) calling your backend
- `.github/workflows/deploy-frontend.yml` — builds `./frontend` and deploys to GitHub Pages
- `render.yaml` — Render Blueprint (deploy backend)

## Deploy
1) Push this repo to GitHub (name it **Song-Scanner**).
2) Render → New → Blueprint → select repo → deploy backend.
3) GitHub → Settings → Pages → Source = GitHub Actions → workflow publishes frontend.
4) Frontend: https://latnem.github.io/Song-Scanner/
5) Backend:   https://songscanner-backend.onrender.com

## Notes
- Replace `render-backend/scan-songs.js` with your real scanner. It must write a `*.songs.json` file to a directory readable by the server (server passes `--outdir` = OS tmp).
- DRM streaming sites are not supported.
