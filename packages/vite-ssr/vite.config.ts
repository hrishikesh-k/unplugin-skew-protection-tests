import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import skewProtection from '@netlify/unplugin-skew-protection/vite'

// https://vite.dev/config/
export default defineConfig({
  build: {
    cssCodeSplit: true,
  },
  plugins: [
    react(),
    skewProtection(),
  ],
})
