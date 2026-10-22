import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://lang.hexadelta.in',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'https://lang.hexadelta.in',
        changeOrigin: true,
      }
    }
  }
})
