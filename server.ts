import './src/server/lib/loadEnv';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import sharp from 'sharp';
import { createServer as createViteServer } from 'vite';
import {
  fetchStoryServer,
  getStoriesMetadata,
  getStoriesMetadataSync,
  initStoriesMetadataListener,
  syncUserProfileServer,
} from './src/server/lib/database';
import { getStoryCoverUrl } from './src/utils/coverUtils';
import { getStoryIdFromSegment, slugify } from './src/utils/slugify';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5173;

app.use(express.json({ limit: '10mb' }));

// ---------------------------------------------------------------------------
// Target generation service URL (tj-gen)
// ---------------------------------------------------------------------------
const TJ_GEN_URL = (
  process.env.TJ_GEN_URL || 'https://gen.teacherjake.com'
).replace(/\/$/, '');

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
  max: 30,
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
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Translation limit reached. Please pause for a moment.' },
});

// ---------------------------------------------------------------------------
// Generation Proxy Handler
// Forward generation requests from tj-books to tj-gen microservice
// ---------------------------------------------------------------------------
async function proxyToTJGen(req: express.Request, res: express.Response) {
  try {
    const targetUrl = `${TJ_GEN_URL}${req.originalUrl}`;
    const headers: Record<string, string> = {
      'content-type': req.headers['content-type'] || 'application/json',
    };

    if (req.headers.authorization) {
      headers['authorization'] = req.headers.authorization as string;
    }
    if (req.headers['x-token']) {
      headers['x-token'] = req.headers['x-token'] as string;
    }
    if (req.headers['x-service-key']) {
      headers['x-service-key'] = req.headers['x-service-key'] as string;
    } else if (process.env.INTERNAL_SERVICE_KEY) {
      headers['x-service-key'] = process.env.INTERNAL_SERVICE_KEY;
    }

    const customKey =
      req.headers['x-openrouter-api-key'] ||
      req.headers['X-OpenRouter-API-Key'];
    if (customKey && typeof customKey === 'string') {
      headers['x-openrouter-api-key'] = customKey;
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.body ? JSON.stringify(req.body) : undefined,
    });

    res.status(response.status);
    response.headers.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== 'content-length' &&
        lowerKey !== 'content-encoding' &&
        lowerKey !== 'transfer-encoding'
      ) {
        res.setHeader(key, val);
      }
    });

    if (response.body) {
      const reader = (response.body as any).getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      const text = await response.text();
      res.send(text);
    }
  } catch (err: any) {
    console.error(
      `[Server Proxy] Failed to proxy ${req.originalUrl} to tj-gen (${TJ_GEN_URL}):`,
      err,
    );
    return res.status(502).json({
      error: `Failed to connect to generation service (${TJ_GEN_URL}): ${err.message}`,
    });
  }
}

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

// Proxied generation routes to tj-gen (gen.teacherjake.com)
app.use('/api/stories/generate-outline', generationLimiter, proxyToTJGen);
app.use('/api/stories/generate-chapter', generationLimiter, proxyToTJGen);
app.use('/api/stories/generate-batch', generationLimiter, proxyToTJGen);
app.use('/api/stories/generate-glossary', generationLimiter, proxyToTJGen);
app.use('/api/stories/generate-cover', generationLimiter, proxyToTJGen);
app.use('/api/stories/maintenance', generationLimiter, proxyToTJGen);
app.use('/api/stories/classify-ip', generationLimiter, proxyToTJGen);
app.use('/api/translate', translationLimiter, proxyToTJGen);

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
  app.get('*', async (req, res, next) => {
    const url = req.originalUrl;

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

      if (preloadedData.story) {
        const story = preloadedData.story;
        const title = `${story.title} - Graded ${story.language} Reader (${story.cefrLevel})`;
        const description = `Read "${story.title}" graded for ${story.language} at CEFR ${story.cefrLevel} difficulty. Includes interactive dictionary lookups and custom eBook downloads.`;

        const coverUrl = getStoryCoverUrl(story);

        template = template.replace(
          /<title>.*?<\/title>/,
          `<title>${title}</title>`,
        );

        template = template
          .replace(/<meta name="description" content=".*?"\s*\/?>/gi, '')
          .replace(/<meta property="og:title" content=".*?"\s*\/?>/gi, '')
          .replace(/<meta property="og:description" content=".*?"\s*\/?>/gi, '')
          .replace(/<meta property="og:image" content=".*?"\s*\/?>/gi, '')
          .replace(/<meta name="twitter:title" content=".*?"\s*\/?>/gi, '')
          .replace(
            /<meta name="twitter:description" content=".*?"\s*\/?>/gi,
            '',
          )
          .replace(/<meta name="twitter:image" content=".*?"\s*\/?>/gi, '')
          .replace(/<meta name="twitter:card" content=".*?"\s*\/?>/gi, '');

        const origin = `${req.protocol}://${req.get('host')}`;
        const jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'Book',
          '@id': `${origin}/book/${slugify(story.title)}-${story.id}`,
          name: story.title,
          bookFormat: 'https://schema.org/EBook',
          inLanguage: story.language,
          description: story.description || description,
          educationalLevel: `CEFR ${story.cefrLevel}`,
          genre: story.genre,
          numberOfPages: (story.chapters?.length ?? 0) * 8,
          publisher: {
            '@type': 'Organization',
            name: 'CEFR Stories',
            logo: {
              '@type': 'ImageObject',
              url: `${origin}/tj-logo.svg`,
            },
          },
        };

        const dynamicMeta = `
          <meta name="description" content="${description}" />
          <meta property="og:title" content="${title}" />
          <meta property="og:description" content="${description}" />
          <meta property="og:url" content="${origin}${req.originalUrl}" />
          <meta property="og:image" content="${coverUrl}" />
          <meta name="twitter:title" content="${title}" />
          <meta name="twitter:description" content="${description}" />
          <meta name="twitter:image" content="${coverUrl}" />
          <meta name="twitter:card" content="summary_large_image" />
          <script id="story-schema-jsonld" type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
        `;
        template = template.replace('</head>', `${dynamicMeta}</head>`);
      }

      const { html, head = '' } = render(url, preloadedData);

      const dataScript = `<script>window.__PRELOADED_DATA__ = ${JSON.stringify(preloadedData).replace(/</g, '\\u003c')};</script>`;
      const appHtml = template
        .replace('<!--ssr-outlet-->', html)
        .replace('</head>', `${head}${dataScript}</head>`);

      // HTML documents must never be cached by browser/CDN so PWAs and chunk updates stay immediately in sync
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      return res.status(200).set({ 'Content-Type': 'text/html' }).send(appHtml);
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        vite?.ssrFixStacktrace(err);
      }
      console.error('[Server SSR] Render error:', err);
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
    console.log(`Delegating AI generations to tj-gen at ${TJ_GEN_URL}`);
  });
}

bootstrap();
