import fs from 'node:fs';
import path from 'node:path';
import type express from 'express';
import { getStoryCoverUrl } from '../../utils/coverUtils';
import { getStoryIdFromSegment, slugify } from '../../utils/slugify';
import { fetchStoryServer, getStoriesMetadataSync } from './database';

function escapeHtmlAttr(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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

      const bookMatch = url.match(/^\/book\/([^/?#]+)/);
      let chapterNum: number | undefined;
      const chapterMatch = url.match(/\/chapter\/(\d+)/);
      if (chapterMatch) {
        chapterNum = Number.parseInt(chapterMatch[1], 10);
      }

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
        const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
        const host = req.get('host') || 'books.teacherjake.com';
        const origin = `${proto}://${host}`;

        const activeChapter =
          chapterNum && story.chapters
            ? story.chapters.find((c: any) => c.chapterNumber === chapterNum)
            : undefined;
        const chapterLabel = activeChapter
          ? ` | Ch ${activeChapter.chapterNumber}: ${activeChapter.title}`
          : '';
        const cefrLabel = story.cefrLevel ? ` (CEFR ${story.cefrLevel})` : '';

        const title = `${story.title}${chapterLabel} - Graded ${story.language} Reader${cefrLabel}`;
        const description = story.description
          ? `${story.description} Graded for ${story.language} at CEFR ${story.cefrLevel} difficulty.`
          : `Read "${story.title}" graded for ${story.language} at CEFR ${story.cefrLevel} difficulty. Includes interactive dictionary lookups and custom eBook downloads.`;

        let coverUrl = getStoryCoverUrl(story, { absolute: true });
        if (coverUrl.startsWith('/')) {
          coverUrl = `${origin}${coverUrl}`;
        } else if (coverUrl.startsWith('//')) {
          coverUrl = `https:${coverUrl}`;
        }

        const canonicalPath = activeChapter
          ? `/book/${slugify(story.title)}-${story.id}/chapter/${activeChapter.chapterNumber}`
          : `/book/${slugify(story.title)}-${story.id}`;
        const canonicalUrl = `${origin}${canonicalPath}`;

        template = template.replace(
          /<title>.*?<\/title>/,
          `<title>${escapeHtmlAttr(title)}</title>`,
        );

        template = template
          .replace(/<meta name="description"[^>]*\/?>/gi, '')
          .replace(/<meta property="og:[^"]*"[^>]*\/?>/gi, '')
          .replace(/<meta name="twitter:[^"]*"[^>]*\/?>/gi, '')
          .replace(/<link rel="canonical"[^>]*\/?>/gi, '');

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
              url: `${origin}/tj-logo-512.png`,
            },
          },
        };

        const dynamicMeta = `
          <meta name="description" content="${escapeHtmlAttr(description)}" />
          <meta property="og:site_name" content="CEFR Stories" />
          <meta property="og:type" content="book" />
          <meta property="og:title" content="${escapeHtmlAttr(title)}" />
          <meta property="og:description" content="${escapeHtmlAttr(description)}" />
          <meta property="og:url" content="${escapeHtmlAttr(canonicalUrl)}" />
          <meta property="og:image" content="${escapeHtmlAttr(coverUrl)}" />
          <meta property="og:image:secure_url" content="${escapeHtmlAttr(coverUrl)}" />
          <meta property="og:image:type" content="image/jpeg" />
          <meta property="og:image:width" content="480" />
          <meta property="og:image:height" content="672" />
          <meta property="og:image:alt" content="${escapeHtmlAttr(story.title)}" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="${escapeHtmlAttr(title)}" />
          <meta name="twitter:description" content="${escapeHtmlAttr(description)}" />
          <meta name="twitter:image" content="${escapeHtmlAttr(coverUrl)}" />
          <link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}" />
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
