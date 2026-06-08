import { describe, it, expect } from 'vitest';
import {
  decryptString,
  encryptString,
  encryptWithKey,
  isEncryptedBlob,
} from './crypto';

describe('crypto (S1)', () => {
  it('cifra y descifra el mismo texto (round-trip), incluido Unicode', async () => {
    const text = 'Portafolio 💰: BTC 0.5, notas con acentos áéí y 中文.';
    const { blob } = await encryptString(text, '1234');
    expect(isEncryptedBlob(blob)).toBe(true);
    const { text: out } = await decryptString(blob, '1234');
    expect(out).toBe(text);
  });

  it('falla al descifrar con un PIN incorrecto', async () => {
    const { blob } = await encryptString('datos secretos', 'correcto');
    await expect(decryptString(blob, 'incorrecto')).rejects.toBeDefined();
  });

  it('produce sal e IV distintos en cada cifrado (no determinista)', async () => {
    const a = await encryptString('mismo texto', 'pin');
    const b = await encryptString('mismo texto', 'pin');
    expect(a.blob.iv).not.toBe(b.blob.iv);
    expect(a.blob.salt).not.toBe(b.blob.salt);
    expect(a.blob.ct).not.toBe(b.blob.ct);
  });

  it('re-cifra con la clave en memoria (IV nuevo) y sigue descifrando con el PIN', async () => {
    const first = await encryptString('v1', 'pin');
    const reblob = await encryptWithKey('v2', first.key, first.salt, first.iters);
    expect(reblob.iv).not.toBe(first.blob.iv); // IV nuevo en cada cifrado
    const { text } = await decryptString(reblob, 'pin');
    expect(text).toBe('v2');
  });

  it('isEncryptedBlob rechaza objetos que no tienen la forma', () => {
    expect(isEncryptedBlob(null)).toBe(false);
    expect(isEncryptedBlob({ v: 1, salt: 'x' })).toBe(false);
    expect(isEncryptedBlob({ v: 2, salt: 'a', iv: 'b', ct: 'c', iters: 1 })).toBe(false);
  });
});
