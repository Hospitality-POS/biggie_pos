import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    server: {
      host: '0.0.0.0',
      port: 5374,
    },
    esbuild: isProduction
      ? {
          drop: ['debugger'],
          pure: ['console.log', 'console.info', 'console.debug'],
        }
      : {},
    build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom/') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('@ant-design/icons')) {
              return 'vendor-antd-icons';
            }
            if (id.includes('/antd/')) {
              return 'vendor-antd';
            }
            if (
              id.includes('@ant-design/pro-components') ||
              id.includes('@ant-design/pro-table') ||
              id.includes('@ant-design/pro-utils') ||
              id.includes('@ant-design/pro-layout') ||
              id.includes('@ant-design/pro-card') ||
              id.includes('@ant-design/pro-form')
            ) {
              return 'vendor-pro-components';
            }
            if (id.includes('@ant-design/charts') || id.includes('@antv')) {
              return 'vendor-antv';
            }
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-recharts';
            }
            if (
              id.includes('@tanstack/react-query') ||
              id.includes('@reduxjs/toolkit') ||
              id.includes('react-redux')
            ) {
              return 'vendor-query-redux';
            }
            if (
              id.includes('jspdf') ||
              id.includes('jspdf-autotable') ||
              id.includes('pdfjs-dist')
            ) {
              return 'vendor-pdf';
            }
            if (id.includes('xlsx')) {
              return 'vendor-xlsx';
            }
            if (id.includes('@zxing')) {
              return 'vendor-zxing';
            }
            if (id.includes('dexie')) {
              return 'vendor-dexie';
            }
          }
        },
      },
    },
  },
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: false,
      },
      workbox: {
        cleanupOutdatedCaches: true,
        // Activate a new SW as soon as it's installed, and take control of
        // any open tabs immediately, instead of waiting for a reload. This
        // shrinks the window where an old tab could request an asset that
        // no longer exists in the newly-activated precache.
        skipWaiting: true,
        clientsClaim: true,
        sourcemap: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache all API GET requests — NetworkFirst so fresh data is preferred
            // but cached data is served when offline
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // NOTE: JS/CSS/worker files are intentionally NOT given a separate
          // runtime CacheFirst rule here. They are already precached above
          // (globPatterns) with content-hashed, revisioned URLs, which is
          // the correct place for cache-busting to happen. A second,
          // independent CacheFirst layer on top of that is redundant and
          // dangerous: if a script is ever fetched mid-deploy (e.g. a race
          // between an updated index.html and a not-yet-uploaded chunk), a
          // broken/partial response would get cached and served to that
          // user for up to 30 days, well past the point the server itself
          // was fixed.
          {
            // Cache images (e.g. product photos) that aren't part of the
            // build output and so aren't covered by precaching.
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Biggie POS',
        short_name: 'Biggie',
        description: 'Biggie Point of Sale',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  };
});