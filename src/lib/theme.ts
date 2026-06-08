// F5 — Tema claro / oscuro / sistema.
//
// Espejo de cómo funciona i18n (src/i18n/index.ts): la preferencia se cachea en
// localStorage (solo la preferencia de tema, NO datos del portafolio) y se aplica
// sincrónicamente al cargar este módulo, antes del primer render, para evitar el
// parpadeo de tema. Por eso se importa en main.tsx antes de montar React.
//
// Local-first y sin red, igual que el resto: matchMedia es 100 % local.

import { useEffect } from 'react';
import type { Theme } from '../types';

const THEME_CACHE_KEY = 'pt-theme';

/** Lee la preferencia cacheada; 'system' si no hay nada válido. */
export function cachedTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_CACHE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* localStorage no disponible */
  }
  return 'system';
}

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

/** ¿El tema efectivo es oscuro? Resuelve 'system' contra la preferencia del SO. */
export function resolveDark(theme: Theme): boolean {
  return theme === 'dark' || (theme === 'system' && prefersDark());
}

/**
 * Aplica el tema al <html>: añade/quita la clase `dark`, ajusta `color-scheme`
 * (para que los controles nativos del navegador combinen) y cachea la
 * preferencia. Idempotente.
 */
export function applyTheme(theme: Theme): void {
  const dark = resolveDark(theme);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
  }
  try {
    localStorage.setItem(THEME_CACHE_KEY, theme);
  } catch {
    /* localStorage no disponible */
  }
}

/**
 * Hook para App.tsx: aplica el tema de Settings y, si es 'system', se suscribe a
 * los cambios del sistema operativo (limpia el listener al desmontar/cambiar).
 */
export function useThemeSync(theme: Theme | undefined): void {
  useEffect(() => {
    const active = theme ?? cachedTheme();
    applyTheme(active);
    if (active !== 'system' || typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);
}

// Aplica el tema cacheado al cargar el módulo (antes del primer render de React).
applyTheme(cachedTheme());
