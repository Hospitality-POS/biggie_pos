import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5373,
  },
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      manifest: 'C:\\FSS\\biggie_pos\\public\\site.webmanifest', // Use double backslashes in the path
      workbox: {
        cleanupOutdatedCaches: true,
        sourcemap: true,
      },
    }),
  ],
});
