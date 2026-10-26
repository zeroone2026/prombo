const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const BG_COLOR = '#0B132B';
const MARK_COLOR = '#FF5722';

// 1. Transparent Regular Icon SVG (0% background opacity / pure transparent pixels)
// Mark centered with scale 3.68 on 512x512 canvas (centered at 256, 256)
const transparentSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <g transform="translate(72, 64) scale(3.68)">
    <path
      fill="${MARK_COLOR}"
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M 51 10 C 69.5 10 84 24.5 84 44 C 84 63.5 70 78 52 78 C 44.5 78 39.5 74 37 67 C 36.5 73.5 34.5 81 31 85.5 C 27.5 89.8 21.5 90.2 18 86 C 16 83.5 16 76 16 66 L 16 44 C 16 25 31.5 10 51 10 Z M 51 22 C 38 22 28.5 31.5 28.5 44 C 28.5 56.5 38 66 51 66 C 63.5 66 72 56.5 72 44 C 72 31.5 63.5 22 51 22 Z"
    />
    <path
      fill="${MARK_COLOR}"
      d="M 63 44.5 L 44 63.5 L 36 55.5 L 47 44.5 L 36 33.5 L 44 25.5 Z"
    />
  </g>
</svg>
`.trim();

// 2. Maskable Icon SVG (with full-bleed dark navy #0B132B background for Android Adaptive Icons)
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="100%" height="100%" fill="${BG_COLOR}"/>
  <g transform="translate(102, 98) scale(3.08)">
    <path
      fill="${MARK_COLOR}"
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M 51 10 C 69.5 10 84 24.5 84 44 C 84 63.5 70 78 52 78 C 44.5 78 39.5 74 37 67 C 36.5 73.5 34.5 81 31 85.5 C 27.5 89.8 21.5 90.2 18 86 C 16 83.5 16 76 16 66 L 16 44 C 16 25 31.5 10 51 10 Z M 51 22 C 38 22 28.5 31.5 28.5 44 C 28.5 56.5 38 66 51 66 C 63.5 66 72 56.5 72 44 C 72 31.5 63.5 22 51 22 Z"
    />
    <path
      fill="${MARK_COLOR}"
      d="M 63 44.5 L 44 63.5 L 36 55.5 L 47 44.5 L 36 33.5 L 44 25.5 Z"
    />
  </g>
</svg>
`.trim();

async function generate() {
  const publicDir = path.resolve(__dirname, '../public');

  // Generate transparent 512x512 PNG
  await sharp(Buffer.from(transparentSvg)).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  // Generate transparent 192x192 PNG
  await sharp(Buffer.from(transparentSvg)).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  // Generate transparent 180x180 Apple Touch Icon PNG
  await sharp(Buffer.from(transparentSvg)).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  // Generate 512x512 Maskable PNG (full-bleed #0B132B)
  await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(path.join(publicDir, 'maskable-icon-512.png'));
  // Generate transparent 1024x1024 logo.png
  await sharp(Buffer.from(transparentSvg)).resize(1024, 1024).png().toFile(path.join(publicDir, 'logo.png'));
  // Generate transparent 48x48 favicon.ico
  await sharp(Buffer.from(transparentSvg)).resize(48, 48).png().toFile(path.join(publicDir, 'favicon.ico'));
  // Generate transparent 32x32 favicon-32x32.png
  await sharp(Buffer.from(transparentSvg)).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));

  // Save transparent icon.svg and favicon.svg
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), transparentSvg);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), transparentSvg);

  console.log('All transparent PWA and favicon assets generated successfully!');
}

generate().catch(console.error);
