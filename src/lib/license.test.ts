import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPairSync, sign, constants } from 'node:crypto';
import { tierFromCode, verifyWithKey, verifyLicense } from './license';

// Par de claves de PRUEBA (no el real del dueño) para ejercitar el camino
// criptográfico completo sin necesitar keys/private.pem.
let testPub: string;
let testPriv: string;

function signCode(code: string, privPem: string): string {
  return sign('sha256', Buffer.from(code, 'utf8'), {
    key: privPem,
    padding: constants.RSA_PKCS1_PADDING,
  }).toString('base64');
}

beforeAll(() => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  testPub = publicKey;
  testPriv = privateKey;
});

describe('tierFromCode', () => {
  it('extrae el tier de un código bien formado', () => {
    expect(tierFromCode('PTRF-PRO-2026-AABBCCDD')).toBe('pro');
    expect(tierFromCode('PTRF-PREMIUM-2026-AABBCCDD')).toBe('premium');
    expect(tierFromCode('PTRF-LIFE-2026-AABBCCDD')).toBe('lifetime');
  });

  it('tolera espacios alrededor', () => {
    expect(tierFromCode('  PTRF-PRO-2026-AABBCCDD  ')).toBe('pro');
  });

  it('rechaza formatos inválidos', () => {
    expect(tierFromCode('PTRF-GOLD-2026-AABBCCDD')).toBeNull(); // tier desconocido
    expect(tierFromCode('PTRF-PRO-2026-XYZ')).toBeNull(); //       hex inválido/corto
    expect(tierFromCode('PTRF-PRO-26-AABBCCDD')).toBeNull(); //    año corto
    expect(tierFromCode('nope')).toBeNull();
    expect(tierFromCode('')).toBeNull();
  });
});

describe('verifyWithKey', () => {
  it('acepta una firma válida hecha con la clave correspondiente', async () => {
    const code = 'PTRF-PRO-2026-AABBCCDD';
    const sig = signCode(code, testPriv);
    expect(await verifyWithKey(code, sig, testPub)).toBe(true);
  });

  it('rechaza una firma alterada', async () => {
    const code = 'PTRF-LIFE-2026-AABBCCDD';
    const sig = signCode(code, testPriv);
    const tampered = (sig.slice(0, -3) + (sig.endsWith('AAA') ? 'BBB' : 'AAA'));
    expect(await verifyWithKey(code, tampered, testPub)).toBe(false);
  });

  it('rechaza la firma de OTRO código (no coincide el mensaje)', async () => {
    const sig = signCode('PTRF-PRO-2026-AABBCCDD', testPriv);
    expect(await verifyWithKey('PTRF-LIFE-2026-AABBCCDD', sig, testPub)).toBe(false);
  });

  it('rechaza basura como firma sin lanzar', async () => {
    expect(await verifyWithKey('PTRF-PRO-2026-AABBCCDD', 'no-es-base64-válido!!', testPub)).toBe(false);
  });
});

describe('verifyLicense (clave pública embebida)', () => {
  it('rechaza un tier mal formado aunque exista una firma', async () => {
    const sig = signCode('PTRF-GOLD-2026-AABBCCDD', testPriv);
    expect(await verifyLicense('PTRF-GOLD-2026-AABBCCDD', sig)).toEqual({ valid: false, tier: null });
  });

  it('rechaza una firma que no fue hecha con la clave privada real', async () => {
    // Firmada con la clave de prueba, NO con la real → la pública embebida la rechaza.
    const code = 'PTRF-PRO-2026-AABBCCDD';
    const sig = signCode(code, testPriv);
    expect(await verifyLicense(code, sig)).toEqual({ valid: false, tier: null });
  });
});
