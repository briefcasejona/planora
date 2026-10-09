// Generates the PNG icons (PWA, iPhone home screen, Android, desktop) from public/icon.svg.

import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const svg = readFileSync('public/icon.svg');
const out = [
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
  ['public/apple-touch-icon.png', 180],
  ['assets/icon.png', 1024],
  ['build/icon.png', 512],
];
for (const [file, size] of out) {
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(file);
  console.log('wrote', file);
}
// Android adaptive icon: foreground with padding on the brand background.
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#4f46e5' } })
  .png()
  .toFile('assets/icon-background.png');
const inner = await sharp(svg, { density: 512 }).resize(640, 640).png().toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile('assets/icon-foreground.png');
console.log('wrote assets/icon-foreground.png, assets/icon-background.png');

// Android launcher icons (legacy + adaptive foreground) for every density.
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, f] of Object.entries(densities)) {
  const dir = `android/app/src/main/res/mipmap-${d}`;
  const legacy = Math.round(48 * f);
  const fg = Math.round(108 * f);
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
    await sharp(svg, { density: 512 }).resize(legacy, legacy).png().toFile(`${dir}/${name}`);
  }
  const art = await sharp(svg, { density: 512 })
    .resize(Math.round(fg * 0.62), Math.round(fg * 0.62))
    .png()
    .toBuffer();
  await sharp({ create: { width: fg, height: fg, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: art, gravity: 'center' }])
    .png()
    .toFile(`${dir}/ic_launcher_foreground.png`);
}
console.log('wrote Android launcher icons');
