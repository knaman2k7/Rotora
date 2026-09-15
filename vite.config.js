import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { config } from "dotenv";


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://rotora.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
