import sharp from 'sharp';

async function analyzeText() {
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

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Light pixels representing text or emblem (e.g. RGB > 180)
        if (a > 100 && r > 180 && g > 180 && b > 180) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    console.log(`Text/Emblem bounding box:`);
    console.log(`X: ${minX} to ${maxX} (width: ${maxX - minX})`);
    console.log(`Y: ${minY} to ${maxY} (height: ${maxY - minY})`);

    const centerX = width / 2;
    const centerY = height / 2;

    let maxDist = 0;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (a > 100 && r > 180 && g > 180 && b > 180) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > maxDist) {
            maxDist = dist;
          }
        }
      }
    }

    const safeRadius = width * 0.4;
    console.log(
      `Max text/emblem pixel distance from center: ${maxDist.toFixed(2)} pixels`,
    );
    console.log(`Safe-zone radius limit (40%): ${safeRadius} pixels`);
    if (maxDist <= safeRadius) {
      console.log(`RESULT: Text/emblem is ALREADY fully within the safe zone!`);
    } else {
      console.log(
        `RESULT: Text/emblem extends outside the safe zone by ${(maxDist - safeRadius).toFixed(2)} pixels.`,
      );
      const requiredScale = safeRadius / maxDist;
      console.log(`Required scaling factor: ${requiredScale.toFixed(4)}`);
    }
  } catch (err) {
    console.error('Error analyzing image:', err);
  }
}

analyzeText();
