import type express from 'express';
import { rateLimit } from 'express-rate-limit';

// Target generation service URL (tj-gen)
export const TJ_GEN_URL = (
  process.env.TJ_GEN_URL || 'https://gen.teacherjake.com'
).replace(/\/$/, '');

// ---------------------------------------------------------------------------
// Rate Limiters
// ---------------------------------------------------------------------------

// General API Rate Limiter (metadata, etc.)
export const metadataLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit each IP to 100 requests per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many metadata requests. Please try again later.' },
});

// AI Generation Rate Limiter (expensive operations)
export const generationLimiter = rateLimit({
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
export const translationLimiter = rateLimit({
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
export async function proxyToTJGen(req: express.Request, res: express.Response) {
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
