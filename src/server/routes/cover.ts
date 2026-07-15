import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import PocketBase from 'pocketbase';
import sharp from 'sharp';

const router = Router();

const COVERS_DIR = path.resolve(process.cwd(), 'public', 'covers');

// Ensure public/covers directory exists
if (!fs.existsSync(COVERS_DIR)) {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
}

router.post('/generate', async (req, res) => {
  try {
    const { storyId, force = false } = req.body;
    if (!storyId) {
      return res.status(400).json({ error: 'Missing storyId.' });
    }

    const coverPath = path.join(COVERS_DIR, `${storyId}.webp`);

    // Skip generation if cover already exists and force is false
    if (fs.existsSync(coverPath) && !force) {
      return res.status(200).json({
        success: true,
        message: 'Cover already exists.',
        url: `/covers/${storyId}.webp`,
      });
    }

    // Authenticate with PocketBase to fetch story details
    const pbUrl = process.env.VITE_POCKETBASE_URL;
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const modelId =
      process.env.COVER_IMAGE_MODEL || 'google/gemini-3.1-flash-lite-image';

    if (!pbUrl || !adminEmail || !adminPassword || !openrouterApiKey) {
      return res.status(500).json({
        error: 'Server is missing configuration for cover generation.',
      });
    }

    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Fetch completed story
    const story = await pb.collection('stories').getOne(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found.' });
    }

    const prompt = `A professional, clean, minimalist flat vector book cover design.
Title text: The image for the book cover must clearly feature the title "${story.title}" written in a clean, legible, and elegant font at the top or center, spelled correctly.
Visual style: A cozy, warm, and inviting soft vector illustration (lofi study vibe, pastel colors, clean lines, gentle shading). Flat 2D graphic from edge to edge.
Subject: A simple, serene scene symbolizing the theme of the book (${story.description || story.genre}). Depict this through a single character or a simple symbolic object (e.g. a person reading, walking in nature, or sitting by a window), rather than a literal diagram or depiction of abstract concepts. The image must be a flat 2D graphic with no physical borders.`;

    const requestBody: any = {
      model: modelId,
      prompt: prompt,
      response_format: 'url',
    };

    if (
      modelId.includes('gemini') ||
      modelId.includes('flux') ||
      modelId.includes('recraft')
    ) {
      requestBody.aspect_ratio = '3:4';
    } else {
      requestBody.size = '1024x1024';
    }

    const response = await fetch('https://openrouter.ai/api/v1/images', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res
        .status(502)
        .json({ error: `OpenRouter API error: ${errText}` });
    }

    const data = (await response.json()) as any;
    const imageObj = data.data?.[0];

    if (!imageObj) {
      return res
        .status(502)
        .json({ error: 'Invalid response from OpenRouter (no image data).' });
    }

    let buffer: Buffer;
    if (imageObj.b64_json) {
      buffer = Buffer.from(imageObj.b64_json, 'base64');
    } else if (imageObj.url) {
      const imageRes = await fetch(imageObj.url);
      if (!imageRes.ok) {
        return res
          .status(502)
          .json({ error: 'Failed to download cover image from URL.' });
      }
      const arrayBuffer = await imageRes.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      return res
        .status(502)
        .json({ error: 'Image data missing from OpenRouter response.' });
    }

    // Process image: crop & resize to 480x672 (aspect-ratio matched), convert to WebP
    await sharp(buffer)
      .resize(480, 672, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 80 })
      .toFile(coverPath);

    return res.status(200).json({
      success: true,
      message: 'Cover generated successfully.',
      url: `/covers/${storyId}.webp`,
    });
  } catch (err: any) {
    console.error('[Cover Generation Error]:', err);
    return res
      .status(500)
      .json({ error: err.message || 'Internal server error.' });
  }
});

export default router;
