import fs from 'node:fs';
import path from 'node:path';
import type express from 'express';
import { getStoryCoverUrl } from '../../utils/coverUtils';
import { getStoryIdFromSegment, slugify } from '../../utils/slugify';
import {
  fetchStoryServer,
  getStoriesMetadataSync,
} from './database';

export function createSSRHandler(getVite: () => any): express.RequestHandler {
  return async (req, res, next) => {
    const url = req.originalUrl;

    if (url.startsWith('/api/') || url.includes('.')) {
      return next();
    }

    try {
      let template: string;
      let render: any;

      const distPath = path.join(process.cwd(), 'dist');
      const vite = getVite();

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
      const vite = getVite();
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
  };
}
