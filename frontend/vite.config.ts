import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        // The AI Shield web API (ai_shield/api.py), started with `python -m ai_shield serve`.
        // Port 8000 is reserved for the demo target agent (see README Quickstart).
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  },
})
