// A.2 — Validación criptográfica OFFLINE de licencias.
//
// Módulo PURO: no importa React ni Dexie. Usa Web Crypto (crypto.subtle), que
// está disponible en el navegador, en el renderer de Electron y en Node 24 (las
// pruebas corren en entorno 'node'). NO hace ninguna llamada de red: la firma se
// valida localmente contra la clave PÚBLICA embebida.
//
// La clave PRIVADA vive solo en el equipo del dueño (keys/private.pem, fuera del
// repo). El TIER va codificado en el propio código: PTRF-{TIER}-{YYYY}-{8 hex},
// donde TIER ∈ {PRO, PREMIUM, LIFE}. La firma cubre los bytes UTF-8 exactos del
// código, así que cambiar una sola letra del código invalida la firma.

import type { Tier } from '../config/tiers';

// Clave pública RSA-2048 (SPKI/PEM). Generada UNA vez con
// scripts/generate-keypair.cjs. Cámbiala solo si regeneras el par de claves
// (eso invalidaría todas las licencias ya emitidas).
export const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwnC1QlaCYGOA9urVHW/m
F2i7471SByrOBUEQa/tC1QVZcT2nE4X13qyyHFdeXOrZNKGx+wKJHfa4jTYu3ND8
29pNcBQxsSaJPvjAUMNLP3XeuzXzatzjJViJoW6aY1XkjPR/b/UWAAE4j+xwwEVn
WT/qsKEawtePH8rCdFsxl+PkwXdoyuvcjrAkH1fbWr82fDl/8WC4szMU1yjmAiyf
JFLGQ54+tAxs38mOD+dY+2lEAXM323aGuyFctvhS9Gi8r11tTK4m8NurYGaAQubu
OErLoKdutqcqfknsFMFEfVTvMdSPwSlX3wenyWfi1yQJ717yTxBFq+ZtKWQ4gjH8
qQIDAQAB
-----END PUBLIC KEY-----`;

const CODE_RE = /^PTRF-(PRO|PREMIUM|LIFE)-(\d{4})-([0-9A-F]{8})$/;

const SEG_TO_TIER: Record<string, Tier> = {
  PRO: 'pro',
  PREMIUM: 'premium',
  LIFE: 'lifetime',
};

/** Extrae el tier del código (sin verificar la firma). null si el formato no es válido. */
export function tierFromCode(code: string): Tier | null {
  const m = CODE_RE.exec(code.trim());
  if (!m) return null;
  return SEG_TO_TIER[m[1]] ?? null;
}

function stripPem(pem: string): string {
  return pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s+/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importPublicKey(pem: string): Promise<CryptoKey> {
  const spki = base64ToBytes(stripPem(pem));
  return crypto.subtle.importKey(
    'spki',
    spki as BufferSource,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

/**
 * Verifica una firma contra una clave pública DADA. Útil para pruebas con una
 * clave de prueba (sin necesitar la privada real). Nunca lanza: ante cualquier
 * error (PEM/base64 inválido, etc.) devuelve false.
 */
export async function verifyWithKey(
  code: string,
  signatureB64: string,
  publicKeyPem: string,
): Promise<boolean> {
  try {
    const key = await importPublicKey(publicKeyPem);
    const sig = base64ToBytes(signatureB64);
    const data = new TextEncoder().encode(code);
    return await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      sig as BufferSource,
      data as BufferSource,
    );
  } catch {
    return false;
  }
}

/**
 * Valida un código + firma contra la clave pública embebida y extrae el tier.
 *  - firma válida y formato correcto → { valid: true, tier }
 *  - firma alterada, código mal formado o tier inválido → { valid: false, tier: null }
 */
export async function verifyLicense(
  code: string,
  signatureB64: string,
): Promise<{ valid: boolean; tier: Tier | null }> {
  const trimmed = code.trim();
  const tier = tierFromCode(trimmed);
  if (!tier) return { valid: false, tier: null };
  const ok = await verifyWithKey(trimmed, signatureB64, PUBLIC_KEY_PEM);
  return ok ? { valid: true, tier } : { valid: false, tier: null };
}
