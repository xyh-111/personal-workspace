import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 前端 /api/* → FastAPI http://127.0.0.1:8000
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        // FastAPI 同时是 API 和 OpenAPI 文档根路径，不需要 rewrite
      },
    },
  },
})
