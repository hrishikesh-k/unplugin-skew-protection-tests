import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import skewProtection from '@netlify/unplugin-skew-protection/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        about: resolve(__dirname, 'about.html'),
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  plugins: [
    react(),
    skewProtection(),
  ],
})
