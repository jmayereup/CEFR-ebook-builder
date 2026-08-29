import './src/server/lib/loadEnv';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { initStoriesMetadataListener } from './src/server/lib/database';
import { TJ_GEN_URL } from './src/server/lib/proxy';
import { createSSRHandler } from './src/server/lib/ssrHandler';
import { apiRouter } from './src/server/routes/api';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5173;

app.use(express.json({ limit: '10mb' }));

// Mount modular API routes
app.use(apiRouter);

async function bootstrap() {
  // Serve dynamic public covers directly from public directory (works in both dev & prod)
  app.get('/covers/:storyId.jpg', (req, res, next) => {
    next();
  });

  // Handle missing cover images cleanly with no-cache headers
  app.use('/covers', (req, res, next) => {
    const filename = req.path.replace(/^\//, '');
    if (filename && filename.includes('.')) {
      const filePath = path.join(process.cwd(), 'public', 'covers', filename);
      if (!fs.existsSync(filePath)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.status(404).send('Cover image not found');
      }
    }
    next();
  });

  app.use(
    '/covers',
    express.static(path.join(process.cwd(), 'public', 'covers'), {
      maxAge: '1d',
      setHeaders: (res) => {
        res.setHeader(
          'Cache-Control',
          'public, max-age=86400, stale-while-revalidate=604800',
        );
      },
    }),
  );

  // Start the PocketBase real-time listener on server startup
  initStoriesMetadataListener();

  let vite: any;
  if (process.env.NODE_ENV !== 'production') {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    // Serve client static assets
    app.use(
      express.static(path.join(distPath, 'client'), {
        index: false,
        maxAge: '1d',
        setHeaders: (res, filePath) => {
          if (
            filePath.includes('/assets/') ||
            filePath.includes('\\assets\\')
          ) {
            res.setHeader(
              'Cache-Control',
              'public, max-age=31536000, immutable',
            );
          } else if (
            filePath.endsWith('sw.js') ||
            filePath.endsWith('manifest.webmanifest') ||
            filePath.includes('workbox-') ||
            filePath.endsWith('registerSW.js')
          ) {
            res.setHeader(
              'Cache-Control',
              'no-cache, no-store, must-revalidate',
            );
          }
        },
      }),
    );
  }

  // Unified dynamic SSR page rendering and metadata preload catch-all route
  app.get('*', createSSRHandler(() => vite));

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Delegating AI generations to tj-gen at ${TJ_GEN_URL}`);
  });
}

bootstrap();
