// Genera build/icon.ico a partir de public/favicon.svg (el logo de marca).
// Rasteriza el SVG a PNG en varios tamaños con sharp y los empaqueta en un
// único .ico con png-to-ico. Ese .ico es el icono de la app de escritorio.

const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
// png-to-ico v3 se exporta como módulo ESM; en CommonJS la función queda en .default.
const pngToIcoMod = require('png-to-ico');
const pngToIco = pngToIcoMod.default || pngToIcoMod;

const SVG = path.join(__dirname, '..', 'public', 'favicon.svg');
const OUT_DIR = path.join(__dirname, '..', 'build');
const OUT = path.join(OUT_DIR, 'icon.ico');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

(async () => {
  const svg = await fs.readFile(SVG);
  await fs.mkdir(OUT_DIR, { recursive: true });

  // density alta = rasterizado nítido al ampliar el SVG (viewBox 64).
  const pngs = await Promise.all(
    SIZES.map((size) =>
      sharp(svg, { density: 384 }).resize(size, size).png().toBuffer(),
    ),
  );

  const ico = await pngToIco(pngs);
  await fs.writeFile(OUT, ico);
  console.log('Icono generado en', OUT);
})().catch((err) => {
  console.error('Error generando el icono:', err);
  process.exit(1);
});
