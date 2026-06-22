import sharp from 'sharp';

async function analyze() {
  try {
    const { data, info } = await sharp('./assets/tj-logo-big-brighter.png')
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;

    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    // We define "background" as having alpha < 50 or being close to the background color #055226.
    // Let's find the bounding box of pixels that are NOT transparent and NOT the background color #055226.
    // Let's target the foreground content (the text "TJ" or logo emblem).
    // Let's assume the text/emblem is significantly different from rgb(5, 82, 38).
    const bgR = 5,
      bgG = 82,
      bgB = 38;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        const isTransparent = a < 10;
        const dist = Math.sqrt(
          (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2,
        );
        const isBackground = dist < 30; // close to background color

        if (!isTransparent && !isBackground) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    console.log(`Foreground bounding box:`);
    console.log(`X: ${minX} to ${maxX} (width: ${maxX - minX})`);
    console.log(`Y: ${minY} to ${maxY} (height: ${maxY - minY})`);

    // Center is (width/2, height/2) = (544, 544)
    const centerX = width / 2;
    const centerY = height / 2;

    // Check maximum distance of any foreground pixel from the center
    let maxDist = 0;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        const isTransparent = a < 10;
        const distColor = Math.sqrt(
          (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2,
        );
        if (!isTransparent && distColor >= 30) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > maxDist) {
            maxDist = dist;
          }
        }
      }
    }

    const safeRadius = width * 0.4; // 40% of width/height = 435.2 pixels
    console.log(
      `Max foreground pixel distance from center: ${maxDist.toFixed(2)} pixels`,
    );
    console.log(`Safe-zone radius limit (40%): ${safeRadius} pixels`);
    if (maxDist <= safeRadius) {
      console.log(`RESULT: Foreground is ALREADY fully within the safe zone!`);
    } else {
      console.log(
        `RESULT: Foreground extends outside the safe zone by ${(maxDist - safeRadius).toFixed(2)} pixels.`,
      );
      const requiredScale = safeRadius / maxDist;
      console.log(
        `Required scaling factor to fit safe-zone: ${requiredScale.toFixed(4)}`,
      );
    }
  } catch (err) {
    console.error('Error analyzing image:', err);
  }
}

analyze();
