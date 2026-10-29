import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Dev proxy target. Override in .env.development.local (git-ignored), e.g.
  // VITE_API_PROXY_TARGET=http://192.168.1.159:4100 to test against the LAN server.
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_PROXY_TARGET || 'https://lang.hexadelta.in'

  return {
    plugins: [react()],
    server: {
      port: 5174,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/uploads': { target, changeOrigin: true },
      },
    },
  }
})
