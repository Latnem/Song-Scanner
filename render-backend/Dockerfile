# Debian base to make ffmpeg/yt-dlp installs smooth
FROM node:20-bullseye-slim

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends     ffmpeg     ca-certificates     python3     python3-pip   && rm -rf /var/lib/apt/lists/*

# yt-dlp via pip
RUN pip3 install --no-cache-dir yt-dlp

WORKDIR /app
COPY package.json ./
RUN npm ci --omit=dev || npm install --only=production

# ensure uploads dir exists in the image
RUN mkdir -p /app/uploads

COPY server_combined_cjs_fixed.js ./
COPY scan-songs.js ./
# COPY public ./public   # static files served by the server

EXPOSE 3000
CMD ["node", "server_combined_cjs_fixed.js"]
