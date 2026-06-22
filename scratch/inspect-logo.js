import sharp from 'sharp';

async function inspect() {
  try {
    const metadata = await sharp(
      './assets/tj-logo-big-brighter.png',
    ).metadata();
    console.log('Image Metadata:', JSON.stringify(metadata, null, 2));
  } catch (err) {
    console.error('Error inspecting image:', err);
  }
}

inspect();
