// S1 — Cifrado local con PIN (WebCrypto). Módulo PURO: no importa React ni Dexie.
//
// Deriva una clave AES-GCM-256 del PIN con PBKDF2-SHA256 (sal aleatoria, muchas
// iteraciones) y cifra/descifra texto. Se usa para cifrar el "vault" (todo el
// portafolio serializado a JSON) en reposo. Nada de esto sale del equipo: es
// 100 % local, igual que el resto de la app.
//
// ⚠️ Un PIN olvidado = datos irrecuperables. La clave se deriva SOLO del PIN; no
// hay puerta trasera ni recuperación. La red de seguridad es el respaldo JSON que
// el usuario exporta (obligatorio) al activar el cifrado.
//
// Disponible en navegador (contexto seguro), Electron (esquema app:// es seguro)
// y Node 20+ (entorno de pruebas).

const KDF_ITERATIONS = 210_000; // recomendación OWASP 2023 para PBKDF2-SHA256
const SALT_BYTES = 16;
const IV_BYTES = 12; // tamaño estándar de IV para AES-GCM

/** Formato serializable del dato cifrado (lo que se guarda en localStorage). */
export interface EncryptedBlob {
  v: 1; // versión del formato (para migraciones futuras)
  salt: string; // base64 — sal del PBKDF2
  iv: string; // base64 — IV único por cifrado
  ct: string; // base64 — ciphertext + tag de autenticación (GCM)
  iters: number; // iteraciones PBKDF2 usadas
}

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error('WebCrypto no disponible (se requiere un contexto seguro).');
  }
  return c.subtle;
}

export function randomBytes(n: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Deriva la clave AES-GCM del PIN + sal. PBKDF2 es deliberadamente lento. */
export async function deriveKey(
  pin: string,
  salt: Uint8Array,
  iterations: number = KDF_ITERATIONS,
): Promise<CryptoKey> {
  const baseKey = await subtle().importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return subtle().deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // clave no extraíble
    ['encrypt', 'decrypt'],
  );
}

/** Cifra con una clave ya derivada (rápido: sin PBKDF2). Genera un IV nuevo. */
export async function encryptWithKey(
  plaintext: string,
  key: CryptoKey,
  salt: Uint8Array,
  iterations: number,
): Promise<EncryptedBlob> {
  const iv = randomBytes(IV_BYTES);
  const ct = await subtle().encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext),
  );
  return {
    v: 1,
    salt: toB64(salt),
    iv: toB64(iv),
    ct: toB64(new Uint8Array(ct)),
    iters: iterations,
  };
}

/** Primer cifrado a partir del PIN: deriva clave (sal nueva) y cifra. */
export async function encryptString(
  plaintext: string,
  pin: string,
): Promise<{ blob: EncryptedBlob; key: CryptoKey; salt: Uint8Array; iters: number }> {
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(pin, salt, KDF_ITERATIONS);
  const blob = await encryptWithKey(plaintext, key, salt, KDF_ITERATIONS);
  return { blob, key, salt, iters: KDF_ITERATIONS };
}

/**
 * Descifra un blob con el PIN. Lanza si el PIN es incorrecto o el blob está
 * corrupto (AES-GCM detecta la manipulación por el tag). Devuelve también la
 * clave y la sal para poder re-cifrar después sin volver a pedir el PIN.
 */
export async function decryptString(
  blob: EncryptedBlob,
  pin: string,
): Promise<{ text: string; key: CryptoKey; salt: Uint8Array; iters: number }> {
  const salt = fromB64(blob.salt);
  const iters = blob.iters || KDF_ITERATIONS;
  const key = await deriveKey(pin, salt, iters);
  const pt = await subtle().decrypt(
    { name: 'AES-GCM', iv: fromB64(blob.iv) as BufferSource },
    key,
    fromB64(blob.ct) as BufferSource,
  );
  return { text: new TextDecoder().decode(pt), key, salt, iters };
}

/** ¿Tiene `x` la forma de un EncryptedBlob nuestro? */
export function isEncryptedBlob(x: unknown): x is EncryptedBlob {
  if (!x || typeof x !== 'object') return false;
  const b = x as Record<string, unknown>;
  return (
    b.v === 1 &&
    typeof b.salt === 'string' &&
    typeof b.iv === 'string' &&
    typeof b.ct === 'string' &&
    typeof b.iters === 'number'
  );
}
