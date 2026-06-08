// scripts/generate-keypair.cjs
// =============================================================================
// Genera UNA SOLA VEZ el par de claves RSA usado para firmar y verificar las
// licencias del Tracker de Portafolio.
//
//   node scripts/generate-keypair.cjs
//
// - Crea keys/private.pem (SECRETA) y keys/public.pem (pública).
// - La carpeta keys/ está en .gitignore.
// - ⚠️ La clave PRIVADA (private.pem) NUNCA va al repositorio ni a la nube.
//   El dueño la guarda FUERA del proyecto (USB cifrado / gestor de contraseñas).
//   Si se filtra, cualquiera podría generar licencias falsas.
// - La clave PÚBLICA se copia a src/lib/license.ts (constante PUBLIC_KEY_PEM)
//   para validar firmas offline dentro de la app. Este script la imprime listo.
// =============================================================================

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const KEYS_DIR = path.join(__dirname, '..', 'keys');
const PRIV = path.join(KEYS_DIR, 'private.pem');
const PUB = path.join(KEYS_DIR, 'public.pem');

if (fs.existsSync(PRIV) || fs.existsSync(PUB)) {
  console.error('✋ Ya existen claves en keys/. No las sobrescribo.');
  console.error('   Si REALMENTE quieres regenerarlas (invalida licencias ya');
  console.error('   emitidas), borra la carpeta keys/ a mano y vuelve a correr.');
  process.exit(1);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

fs.mkdirSync(KEYS_DIR, { recursive: true });
fs.writeFileSync(PRIV, privateKey, { mode: 0o600 });
fs.writeFileSync(PUB, publicKey);

console.log('✅ Par de claves RSA-2048 generado en keys/');
console.log('   - keys/private.pem  (SECRETA — NO subir al repo ni a la nube)');
console.log('   - keys/public.pem   (pública)');
console.log('');
console.log('👉 Copia ESTA clave pública a src/lib/license.ts (PUBLIC_KEY_PEM):');
console.log('');
console.log(publicKey);
