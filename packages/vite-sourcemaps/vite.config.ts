import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import skewProtection from '@netlify/unplugin-skew-protection/vite'

export default defineConfig({
  build: {
    minify: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('vendorThrower')) {
            return 'vendor-thrower'
          }
          if (id.includes('vendorHelper')) {
            return 'vendor-helper'
          }
          return undefined
        },
      },
    },
    sourcemap: true,
  },
  plugins: [
    react(),
    skewProtection(),
  ],
})
