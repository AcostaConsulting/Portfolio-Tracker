// S4 — Genera release/SHA256SUMS.txt con el hash SHA-256 de cada instalador .exe.
//
// No es una firma de código (eso requiere certificado), pero permite a quien
// recibe el instalador verificar su integridad si el hash se comparte por otro
// canal (correo, mensaje), detectando corrupción o manipulación en tránsito.
//
// Se ejecuta al final de `npm run app:build`, después de electron-builder.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RELEASE = path.join(__dirname, '..', 'release');

function sha256(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

function main() {
  if (!fs.existsSync(RELEASE)) {
    console.error('[checksums] No existe la carpeta release/. Construye primero con electron-builder.');
    process.exit(1);
  }
  const files = fs
    .readdirSync(RELEASE)
    .filter((f) => f.toLowerCase().endsWith('.exe'))
    .sort();
  if (files.length === 0) {
    console.error('[checksums] No se encontró ningún .exe en release/.');
    process.exit(1);
  }
  // Formato compatible con `sha256sum -c`: "<hash>  <archivo>".
  const lines = files.map((f) => `${sha256(path.join(RELEASE, f))}  ${f}`);
  const outFile = path.join(RELEASE, 'SHA256SUMS.txt');
  fs.writeFileSync(outFile, lines.join('\n') + '\n', 'utf8');
  console.log(`[checksums] Escrito ${outFile}`);
  for (const line of lines) console.log('  ' + line);
}

main();
