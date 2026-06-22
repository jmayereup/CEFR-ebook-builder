import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = './public';
const assetsDir = './assets';

async function generate() {
  try {
    console.log('Generating PWA PNG icons from tj-logo-big-brighter.png...');

    const logoSize = 1088;
    const targetScale = 0.68;
    const overlaySize = Math.round(logoSize * targetScale); // 740

    // 1. Create assets/tj-logo-big-brighter-maskable.png
    console.log('Creating assets/tj-logo-big-brighter-maskable.png...');

    // Create solid background
    const bgImg = sharp({
      create: {
        width: logoSize,
        height: logoSize,
        channels: 4,
        background: { r: 5, g: 82, b: 38, alpha: 1 }, // #055226
      },
    });

    // Resize original overlay
    const overlay = await sharp(
      path.join(assetsDir, 'tj-logo-big-brighter.png'),
    )
      .resize(overlaySize, overlaySize)
      .toBuffer();

    // Composite and write to file
    await bgImg
      .composite([{ input: overlay, gravity: 'center' }])
      .png()
      .toFile(path.join(assetsDir, 'tj-logo-big-brighter-maskable.png'));
    console.log('Created assets/tj-logo-big-brighter-maskable.png');

    // 2. Generate standard PWA icons from assets/tj-logo-big-brighter.png
    await sharp(path.join(assetsDir, 'tj-logo-big-brighter.png'))
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'tj-logo-192.png'));
    console.log('Created public/tj-logo-192.png (standard)');

    await sharp(path.join(assetsDir, 'tj-logo-big-brighter.png'))
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'tj-logo-512.png'));
    console.log('Created public/tj-logo-512.png (standard)');

    // 3. Generate maskable PWA icons from assets/tj-logo-big-brighter-maskable.png
    await sharp(path.join(assetsDir, 'tj-logo-big-brighter-maskable.png'))
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'tj-logo-maskable-192.png'));
    console.log('Created public/tj-logo-maskable-192.png');

    await sharp(path.join(assetsDir, 'tj-logo-big-brighter-maskable.png'))
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'tj-logo-maskable-512.png'));
    console.log('Created public/tj-logo-maskable-512.png');

    // 4. Update background color in SVGs to match #055226
    const svgPath = path.join(publicDir, 'tj-logo.svg');
    const maskableSvgPath = path.join(publicDir, 'tj-logo-maskable.svg');

    if (fs.existsSync(svgPath)) {
      let content = fs.readFileSync(svgPath, 'utf8');
      content = content.replace(/fill:\s*#005522;/g, 'fill: #055226;');
      fs.writeFileSync(svgPath, content, 'utf8');
      console.log('Updated public/tj-logo.svg background to #055226');
    }

    if (fs.existsSync(maskableSvgPath)) {
      let content = fs.readFileSync(maskableSvgPath, 'utf8');
      content = content.replace(/fill:\s*#005522;/g, 'fill: #055226;');
      fs.writeFileSync(maskableSvgPath, content, 'utf8');
      console.log('Updated public/tj-logo-maskable.svg background to #055226');
    }

    console.log('Successfully generated all PWA icons!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generate();
