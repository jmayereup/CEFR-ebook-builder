import sharp from 'sharp';

async function getPixelColor() {
  try {
    const { data } = await sharp('./assets/tj-logo-big-brighter.png')
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Sample a pixel at (200, 200) inside the background area
    // Image is 1088x1088, so row 200, col 200 is: index = (200 * 1088 + 200) * 4
    const idx = (200 * 1088 + 200) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    console.log(
      `Pixel color at (200, 200): rgb(${r}, ${g}, ${b}), alpha: ${a}`,
    );
    const hex = `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
    console.log(`Hex: ${hex}`);
  } catch (err) {
    console.error('Error reading pixel:', err);
  }
}

getPixelColor();
