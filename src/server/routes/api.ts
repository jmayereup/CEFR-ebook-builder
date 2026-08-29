import express, { Router } from 'express';
import {
  getStoriesMetadata,
  syncUserProfileServer,
} from '../lib/database';
import {
  generationLimiter,
  metadataLimiter,
  proxyToTJGen,
  translationLimiter,
} from '../lib/proxy';

export const apiRouter = Router();

// Stories metadata
apiRouter.get('/api/stories/metadata', metadataLimiter, async (req, res) => {
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
apiRouter.use('/api/stories/generate-outline', generationLimiter, proxyToTJGen);
apiRouter.use('/api/stories/generate-chapter', generationLimiter, proxyToTJGen);
apiRouter.use('/api/stories/generate-batch', generationLimiter, proxyToTJGen);
apiRouter.use('/api/stories/generate-glossary', generationLimiter, proxyToTJGen);
apiRouter.use('/api/stories/generate-cover', generationLimiter, proxyToTJGen);
apiRouter.use('/api/stories/maintenance', generationLimiter, proxyToTJGen);
apiRouter.use('/api/stories/classify-ip', generationLimiter, proxyToTJGen);
apiRouter.use('/api/translate', translationLimiter, proxyToTJGen);

// User profile synchronization
apiRouter.post('/api/users/sync', async (req, res) => {
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
