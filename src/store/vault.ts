// S1 — Cifrado opt-in con PIN. Estado de bloqueo + operaciones del "vault".
//
// MODELO (honesto sobre la garantía): el vault cifrado (todo el portafolio
// sensible serializado a JSON) vive en localStorage. Las tablas Dexie sensibles
// solo contienen datos EN CLARO mientras la sesión está DESBLOQUEADA; se vacían al
// bloquear y al arrancar (antes de desbloquear). Garantía: en reposo (app cerrada o
// bloqueada) los datos están cifrados; mientras la usas desbloqueada, están
// descifrados en el almacenamiento de este equipo.
//
// La clave derivada (PBKDF2, costosa) se calcula UNA vez al desbloquear/activar y
// se guarda EN MEMORIA (no en disco, no en el estado de React) para re-cifrar
// rápido (solo AES-GCM) en cada cambio. Un PIN olvidado = datos irrecuperables; la
// red de seguridad es el respaldo JSON que se exporta (obligatorio) al activar.

import { create } from 'zustand';
import { liveQuery, type Subscription } from 'dexie';
import {
  decryptString,
  encryptString,
  encryptWithKey,
  isEncryptedBlob,
  type EncryptedBlob,
} from '../lib/crypto';
import { clearSensitive, exportSensitive, importSensitive } from '../db/backup';

const VAULT_KEY = 'pt-vault';
const ENC_FLAG = 'pt-encryption';

export type VaultStatus = 'unencrypted' | 'locked' | 'unlocked';

interface VaultState {
  status: VaultStatus;
  setStatus: (s: VaultStatus) => void;
}

export const useVault = create<VaultState>((set) => ({
  status: 'unencrypted',
  setStatus: (status) => set({ status }),
}));

// Estado en memoria (fuera de React): clave derivada + parámetros para re-cifrar.
let memKey: CryptoKey | null = null;
let memSalt: Uint8Array | null = null;
let memIters = 0;
let syncSub: Subscription | null = null;

function readVaultBlob(): EncryptedBlob | null {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isEncryptedBlob(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeVaultBlob(blob: EncryptedBlob): void {
  localStorage.setItem(VAULT_KEY, JSON.stringify(blob));
}

function forgetKey(): void {
  memKey = null;
  memSalt = null;
  memIters = 0;
}

/** ¿El cifrado está activado en este equipo? (lectura síncrona, antes del render). */
export function encryptionEnabled(): boolean {
  try {
    return localStorage.getItem(ENC_FLAG) === '1' && readVaultBlob() !== null;
  } catch {
    return false;
  }
}

/** Estado inicial al arrancar: 'locked' si hay vault válido, si no 'unencrypted'. */
export function initialVaultStatus(): VaultStatus {
  return encryptionEnabled() ? 'locked' : 'unencrypted';
}

function stopSync(): void {
  if (syncSub) {
    syncSub.unsubscribe();
    syncSub = null;
  }
}

function startSync(): void {
  stopSync();
  // Cada cambio en las tablas sensibles re-cifra el vault. encryptWithKey es rápido
  // (AES-GCM con la clave ya derivada): no hay PBKDF2 por cambio.
  syncSub = liveQuery(() => exportSensitive()).subscribe({
    next: (data) => {
      if (useVault.getState().status !== 'unlocked' || !memKey || !memSalt) return;
      void (async () => {
        try {
          const blob = await encryptWithKey(JSON.stringify(data), memKey, memSalt, memIters);
          writeVaultBlob(blob);
        } catch (e) {
          console.error('[vault] no se pudo re-cifrar el vault', e);
        }
      })();
    },
    error: (e) => console.error('[vault] error en la suscripción', e),
  });
}

/** Activa el cifrado: cifra los datos actuales con el PIN. Queda desbloqueado. */
export async function enableEncryption(pin: string): Promise<void> {
  const data = await exportSensitive();
  const { blob, key, salt, iters } = await encryptString(JSON.stringify(data), pin);
  writeVaultBlob(blob);
  localStorage.setItem(ENC_FLAG, '1');
  memKey = key;
  memSalt = salt;
  memIters = iters;
  useVault.getState().setStatus('unlocked');
  startSync();
}

/** Intenta desbloquear con el PIN. Devuelve true si tuvo éxito. */
export async function unlock(pin: string): Promise<boolean> {
  const blob = readVaultBlob();
  if (!blob) {
    // Estado inconsistente (flag sin vault): trata como sin cifrado.
    localStorage.removeItem(ENC_FLAG);
    useVault.getState().setStatus('unencrypted');
    return true;
  }
  try {
    const { text, key, salt, iters } = await decryptString(blob, pin);
    const data = JSON.parse(text) as Parameters<typeof importSensitive>[0];
    await importSensitive(data);
    memKey = key;
    memSalt = salt;
    memIters = iters;
    useVault.getState().setStatus('unlocked');
    startSync();
    return true;
  } catch {
    return false; // PIN incorrecto o vault corrupto (AES-GCM lo detecta)
  }
}

/** Bloquea: re-cifra (por si hay cambios sin volcar), borra el plano, olvida la clave. */
export async function lockNow(): Promise<void> {
  try {
    if (memKey && memSalt) {
      const data = await exportSensitive();
      writeVaultBlob(await encryptWithKey(JSON.stringify(data), memKey, memSalt, memIters));
    }
  } catch (e) {
    console.error('[vault] error al re-cifrar antes de bloquear', e);
  } finally {
    stopSync();
    await clearSensitive();
    forgetKey();
    useVault.getState().setStatus('locked');
  }
}

/** Desactiva el cifrado (requiere PIN). Los datos quedan en claro en Dexie. */
export async function disableEncryption(pin: string): Promise<boolean> {
  const blob = readVaultBlob();
  if (!blob) {
    localStorage.removeItem(ENC_FLAG);
    useVault.getState().setStatus('unencrypted');
    return true;
  }
  try {
    await decryptString(blob, pin); // solo verifica el PIN
  } catch {
    return false;
  }
  // Estando desbloqueado, los datos ya están en claro en Dexie: solo retiramos el vault.
  stopSync();
  localStorage.removeItem(VAULT_KEY);
  localStorage.removeItem(ENC_FLAG);
  forgetKey();
  useVault.getState().setStatus('unencrypted');
  return true;
}

/** Cambia el PIN (requiere el actual). Re-deriva y re-cifra el vault. */
export async function changePin(oldPin: string, newPin: string): Promise<boolean> {
  const blob = readVaultBlob();
  if (!blob) return false;
  try {
    const { text } = await decryptString(blob, oldPin);
    const { blob: nblob, key, salt, iters } = await encryptString(text, newPin);
    writeVaultBlob(nblob);
    memKey = key;
    memSalt = salt;
    memIters = iters;
    return true;
  } catch {
    return false;
  }
}
