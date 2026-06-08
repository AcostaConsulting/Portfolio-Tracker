import { describe, it, expect } from 'vitest';
import {
  DEFAULT_UPDATE_PREFS,
  UPDATE_CHECK_INTERVAL_MS,
  normalizeUpdatePrefs,
  parseVersionFromTag,
  compareVersions,
  isNewerVersion,
  shouldAutoCheck,
} from './updater';

describe('preferencias de actualización', () => {
  it('defaults: ambos false', () => {
    expect(DEFAULT_UPDATE_PREFS).toEqual({ auto_check_updates: false, auto_download_updates: false });
  });

  it('normaliza desde Settings (recupera lo guardado, rellena faltantes con false)', () => {
    expect(normalizeUpdatePrefs(undefined)).toEqual(DEFAULT_UPDATE_PREFS);
    expect(normalizeUpdatePrefs(null)).toEqual(DEFAULT_UPDATE_PREFS);
    expect(normalizeUpdatePrefs({ auto_check_updates: true })).toEqual({
      auto_check_updates: true,
      auto_download_updates: false,
    });
    expect(normalizeUpdatePrefs({ auto_check_updates: true, auto_download_updates: true })).toEqual({
      auto_check_updates: true,
      auto_download_updates: true,
    });
  });
});

describe('parseVersionFromTag', () => {
  it('quita la v inicial y espacios', () => {
    expect(parseVersionFromTag('v0.8.0')).toBe('0.8.0');
    expect(parseVersionFromTag('V1.2.3')).toBe('1.2.3');
    expect(parseVersionFromTag('  0.8.0 ')).toBe('0.8.0');
    expect(parseVersionFromTag('0.7.0')).toBe('0.7.0');
  });
});

describe('compareVersions / isNewerVersion', () => {
  it('compara x.y.z correctamente', () => {
    expect(compareVersions('0.8.0', '0.7.0')).toBe(1);
    expect(compareVersions('0.7.0', '0.8.0')).toBe(-1);
    expect(compareVersions('0.7.0', '0.7.0')).toBe(0);
    expect(compareVersions('v0.8.0', '0.7.9')).toBe(1);
    expect(compareVersions('1.0.0', '0.9.9')).toBe(1);
    expect(compareVersions('0.8.1', '0.8.0')).toBe(1);
  });

  it('isNewerVersion solo true si remote > current', () => {
    expect(isNewerVersion('0.8.0', '0.7.0')).toBe(true);
    expect(isNewerVersion('v0.8.0', '0.8.0')).toBe(false);
    expect(isNewerVersion('0.6.0', '0.7.0')).toBe(false);
  });
});

describe('shouldAutoCheck (intervalo 7 días, opt-in)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.parse('2026-06-04T12:00:00Z');
  const prefsCheck = { auto_check_updates: true, auto_download_updates: false };
  const prefsDownloadOnly = { auto_check_updates: false, auto_download_updates: true };
  const prefsOff = { auto_check_updates: false, auto_download_updates: false };

  it('no busca si ambas preferencias están en false', () => {
    expect(shouldAutoCheck(prefsOff, null, now)).toBe(false);
    expect(shouldAutoCheck(prefsOff, new Date(now - 30 * DAY).toISOString(), now)).toBe(false);
  });

  it('busca si nunca se ha consultado y está activado', () => {
    expect(shouldAutoCheck(prefsCheck, null, now)).toBe(true);
    expect(shouldAutoCheck(prefsCheck, undefined, now)).toBe(true);
  });

  it('respeta el intervalo de 7 días', () => {
    expect(shouldAutoCheck(prefsCheck, new Date(now - 2 * DAY).toISOString(), now)).toBe(false);
    expect(shouldAutoCheck(prefsCheck, new Date(now - 8 * DAY).toISOString(), now)).toBe(true);
    expect(shouldAutoCheck(prefsCheck, new Date(now - 7 * DAY).toISOString(), now)).toBe(true);
  });

  it('auto_download también dispara la búsqueda (necesita consultar para descargar)', () => {
    expect(shouldAutoCheck(prefsDownloadOnly, null, now)).toBe(true);
  });

  it('fecha inválida → busca (trátala como nunca)', () => {
    expect(shouldAutoCheck(prefsCheck, 'no-es-fecha', now)).toBe(true);
  });

  it('UPDATE_CHECK_INTERVAL_MS son 7 días', () => {
    expect(UPDATE_CHECK_INTERVAL_MS).toBe(7 * DAY);
  });
});
