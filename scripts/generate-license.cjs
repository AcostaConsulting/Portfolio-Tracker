// scripts/generate-license.cjs
// =============================================================================
// Genera y FIRMA un código de licencia. Lo usa el DUEÑO (no la app):
//
//   node scripts/generate-license.cjs pro
//   node scripts/generate-license.cjs premium
//   node scripts/generate-license.cjs lifetime
//
// Imprime "CÓDIGO | FIRMA" listo para copiar y enviar por correo al comprador.
// El cliente pega ambos en la app (Configuración → Licencia → Activar).
//
// ⚠️ La clave privada (keys/private.pem) NUNCA va al repo ni a la nube. Vive
// solo en el equipo del dueño. Sin ella no se pueden firmar códigos nuevos.
// =============================================================================

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Segmento de nivel que viaja DENTRO del código (lo lee la app para saber el tier).
const TIER_SEG = { pro: 'PRO', premium: 'PREMIUM', lifetime: 'LIFE' };

const tier = String(process.argv[2] || '').toLowerCase();
if (!TIER_SEG[tier]) {
  console.error('Uso: node scripts/generate-license.cjs <pro|premium|lifetime>');
  process.exit(1);
}

const PRIV = path.join(__dirname, '..', 'keys', 'private.pem');
if (!fs.existsSync(PRIV)) {
  console.error('✋ Falta keys/private.pem.');
  console.error('   Genera el par una sola vez con: node scripts/generate-keypair.cjs');
  process.exit(1);
}
const privateKey = fs.readFileSync(PRIV, 'utf8');

const year = new Date().getFullYear();
const rand = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 hex
const code = `PTRF-${TIER_SEG[tier]}-${year}-${rand}`;

// RSASSA-PKCS1-v1_5 + SHA-256 sobre los bytes UTF-8 EXACTOS del código.
// Coincide con crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, ...) en la app.
const signature = crypto
  .sign('sha256', Buffer.from(code, 'utf8'), {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING,
  })
  .toString('base64');

console.log('');
console.log(`Tier:    ${tier}`);
console.log(`CÓDIGO:  ${code}`);
console.log(`FIRMA:   ${signature}`);
console.log('');
console.log('— Para el cliente (una sola línea) —');
console.log(`${code} | ${signature}`);
console.log('');
