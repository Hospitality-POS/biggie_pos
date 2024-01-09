import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      manifest: 'C:\FSS\biggie_pos\public\site.webmanifest',
      workbox: {
        cleanupOutdatedCaches: true,
        sourcemap: true,
      },
    }),
    tsconfigPaths()
  ],
})