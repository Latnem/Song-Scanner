import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Repo name is "Song-Scanner" (case-sensitive)
export default defineConfig({
  plugins: [react()],
  base: '/Song-Scanner/',
})
