import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import skewProtection from '@netlify/unplugin-skew-protection/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), skewProtection()],
  build: {
    // Force lazy CSS into its own file (instead of inlining) so the stamped chunk request is easy to inspect.
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Splits a vendor chunk out of the entry's own eager/static import graph (a common
        // real-world pattern) — reproduces the modulepreload-vs-static-import stamping mismatch.
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
})
