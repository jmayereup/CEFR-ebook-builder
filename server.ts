import './src/server/lib/loadEnv';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import {
  fetchStoryServer,
  getStoriesMetadata,
  getStoriesMetadataSync,
  initStoriesMetadataListener,
  syncUserProfileServer,
} from './src/server/lib/database';
import batchChapterRouter from './src/server/routes/batch-chapter';
import chapterRouter from './src/server/routes/chapter';
import glossaryRouter from './src/server/routes/glossary';
import maintenanceRouter from './src/server/routes/maintenance';
import outlineRouter from './src/server/routes/outline';
import translateRouter from './src/server/routes/translate';
import { getStoryIdFromSegment } from './src/utils/slugify';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3009;

app.use(express.json({ limit: '10mb' }));

// ---------------------------------------------------------------------------
// Rate Limiters
// ---------------------------------------------------------------------------

// General API Rate Limiter (metadata, etc.)
const metadataLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit each IP to 100 requests per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many metadata requests. Please try again later.' },
});

// AI Generation Rate Limiter (expensive operations)
const generationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15, // Limit each IP to 15 generation requests per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      'Generation rate limit exceeded. Please wait a few minutes before generating more content.',
  },
});

// Translation Rate Limiter (frequent translations during reading)
const translationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 translations per minute (average 1 per second)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Translation limit reached. Please pause for a moment.' },
});

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------

app.get('/api/stories/metadata', metadataLimiter, async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  const storyId = req.query.storyId as string;
  const deleteId = req.query.deleteId as string;
  const forceAll = req.query.forceAll === 'true';
  try {
    const metadata = await getStoriesMetadata({
      refresh: forceRefresh,
      storyId,
      deleteId,
      forceAll,
    });
    return res.status(200).json(metadata);
  } catch (err: any) {
    console.error('[Server API] /api/stories/metadata error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to fetch stories metadata',
    });
  }
});

app.use('/api/stories/generate-outline', generationLimiter, outlineRouter);
app.use('/api/stories/generate-chapter', generationLimiter, chapterRouter);
app.use('/api/stories/generate-batch', generationLimiter, batchChapterRouter);
app.use('/api/stories/generate-glossary', generationLimiter, glossaryRouter);
app.use('/api/stories/maintenance', generationLimiter, maintenanceRouter);
app.use('/api/translate', translationLimiter, translateRouter);

app.post('/api/users/sync', async (req, res) => {
  try {
    const {
      userId,
      savedVocab,
      bookshelf,
      recentlyRead,
      lookupLimitData,
      translationTargetLanguage,
      readerFontSize,
      readerUseSerif,
    } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId.' });
    }
    const updates: Record<string, any> = {};
    if (savedVocab !== undefined) updates.savedVocab = savedVocab;
    if (bookshelf !== undefined) updates.bookshelf = bookshelf;
    if (recentlyRead !== undefined) updates.recentlyRead = recentlyRead;
    if (lookupLimitData !== undefined)
      updates.lookupLimitData = lookupLimitData;
    if (translationTargetLanguage !== undefined)
      updates.translationTargetLanguage = translationTargetLanguage;
    if (readerFontSize !== undefined) updates.readerFontSize = readerFontSize;
    if (readerUseSerif !== undefined) updates.readerUseSerif = readerUseSerif;

    await syncUserProfileServer(userId, updates);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[Server API] /api/users/sync error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to sync user profile',
    });
  }
});

async function bootstrap() {
  // Start the Firestore real-time listener on server startup
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
        index: false, // Don't serve index.html directly; let the catch-all SSR route render it
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
          } else if (filePath.endsWith('sw.js')) {
            res.setHeader(
              'Cache-Control',
              'public, max-age=0, must-revalidate',
            );
          }
        },
      }),
    );
  }

  // Unified dynamic SSR page rendering and metadata preload catch-all route
  app.get('*', async (req, res, next) => {
    const url = req.originalUrl;

    // Skip API, static assets, and other background URLs
    if (url.startsWith('/api/') || url.includes('.')) {
      return next();
    }

    try {
      let template: string;
      let render: any;

      const distPath = path.join(process.cwd(), 'dist');

      if (process.env.NODE_ENV !== 'production') {
        template = fs.readFileSync(path.resolve('index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        const parts = await vite.ssrLoadModule('/src/entry-server.tsx');
        render = parts.render;
      } else {
        template = fs.readFileSync(
          path.join(distPath, 'client', 'index.html'),
          'utf-8',
        );
        const serverEntryPath = path.join(
          distPath,
          'server',
          'entry-server.js',
        );
        const parts = await import(serverEntryPath);
        render = parts.render;
      }

      // Fetch preloaded data for hydration
      const preloadedData: any = { stories: getStoriesMetadataSync() };

      const bookMatch = url.match(/^\/book\/([^/]+)/);
      if (bookMatch) {
        const segment = bookMatch[1];
        const storyId = getStoryIdFromSegment(segment);
        const story = await fetchStoryServer(storyId);
        if (story) {
          preloadedData.story = story;
        }
      }

      // Dynamic social meta tag injection
      if (preloadedData.story) {
        const story = preloadedData.story;
        const title = `${story.title} - Graded ${story.language} Reader (${story.cefrLevel})`;
        const description = `Read "${story.title}" graded for ${story.language} at CEFR ${story.cefrLevel} difficulty. Includes interactive dictionary lookups and custom eBook downloads.`;

        template = template.replace(
          /<title>.*?<\/title>/,
          `<title>${title}</title>`,
        );

        const dynamicMeta = `
          <meta name="description" content="${description}" />
          <meta property="og:title" content="${title}" />
          <meta property="og:description" content="${description}" />
          <meta property="og:url" content="${req.protocol}://${req.get('host')}${req.originalUrl}" />
          <meta name="twitter:title" content="${title}" />
          <meta name="twitter:description" content="${description}" />
        `;
        template = template.replace('</head>', `${dynamicMeta}</head>`);
      }

      // Render React components to HTML
      const { html } = render(url, preloadedData);

      // Inject the hydration script and ssr output
      const dataScript = `<script>window.__PRELOADED_DATA__ = ${JSON.stringify(preloadedData).replace(/</g, '\\u003c')};</script>`;
      const appHtml = template
        .replace('<!--ssr-outlet-->', html)
        .replace('</head>', `${dataScript}</head>`);

      return res.status(200).set({ 'Content-Type': 'text/html' }).send(appHtml);
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        vite?.ssrFixStacktrace(err);
      }
      console.error('[Server SSR] Render error:', err);
      // Fallback to sending the index.html template as-is (SPA fallback)
      const distPath = path.join(process.cwd(), 'dist');
      const fallbackPath =
        process.env.NODE_ENV !== 'production'
          ? path.resolve('index.html')
          : path.join(distPath, 'client', 'index.html');
      if (fs.existsSync(fallbackPath)) {
        return res.sendFile(fallbackPath);
      }
      return next(err);
    }
  });

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

bootstrap();
