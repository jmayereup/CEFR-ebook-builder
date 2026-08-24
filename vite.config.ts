import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'tj-logo.svg'],
        manifest: {
          name: 'CEFR Stories - Reading Companion',
          short_name: 'CEFR Stories',
          description:
            'Graded reading companion for language learners with interactive translations and speech synthesis.',
          theme_color: '#004d2c',
          background_color: '#f4f8f6',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: '/tj-logo.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: '/tj-logo-maskable.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
            {
              src: '/tj-logo-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/tj-logo-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/tj-logo-maskable-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/tj-logo-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          screenshots: [
            {
              src: '/screenshot-desktop.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: 'CEFR Stories Desktop View',
            },
            {
              src: '/screenshot-mobile.png',
              sizes: '768x1024',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'CEFR Stories Mobile View',
            },
          ],
        },
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
          navigateFallbackDenylist: [/^\/covers/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\/api\/stories\/metadata/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'stories-metadata-cache',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 1,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({ url }) =>
                url.pathname.startsWith('/covers/') ||
                url.hostname === 'files.teacherjake.com' ||
                url.hostname === 'gen.teacherjake.com' ||
                (url.hostname === 'pb.teacherjake.com' &&
                  url.pathname.startsWith('/api/files/')),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'story-covers-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd()),
      },
    },
    esbuild: {
      target: 'es2022',
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'es2022',
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {
              ignored: ['**/.metadata-cache-pb.json'],
            },
      allowedHosts: ['.teacherjake.com', 'localhost'],
    },
    build: {
      target: 'es2022',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Group React core libraries
              if (
                id.includes('react/') ||
                id.includes('react-dom/') ||
                id.includes('scheduler/')
              ) {
                return 'vendor-react';
              }
              // Group PocketBase SDK
              if (id.includes('pocketbase')) {
                return 'vendor-pocketbase';
              }
              // Group Framer Motion / Motion
              if (id.includes('motion') || id.includes('framer-motion')) {
                return 'vendor-motion';
              }
              // Group Lucide React icons
              if (id.includes('lucide-react')) {
                return 'vendor-lucide';
              }
              // Everything else from node_modules goes to vendor-core
              return 'vendor-core';
            }
          },
        },
      },
    },
  };
});
