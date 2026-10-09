import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const environment = loadEnv(mode, process.cwd(), 'VITE_')
  const api = process.env.VITE_API_BASE_URL || environment.VITE_API_BASE_URL || environment.VITE_API_URL || '/api'
  if (command === 'build' && /localhost|127\.0\.0\.1|\[::1\]/i.test(api)) throw new Error('Production API URL cannot point to localhost')
  return {
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
  }
})
