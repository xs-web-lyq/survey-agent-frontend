import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // 开发期代理到 FastAPI(生产由 FastAPI 静态托管,无需代理)
      '/api': 'http://localhost:8000',
    },
  },
})
