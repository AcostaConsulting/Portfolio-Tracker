// F4 — Configuración de i18next + react-i18next.
// Español es la fuente de verdad y el fallback. El idioma activo se cachea en
// localStorage (solo el idioma, no datos de portafolio) para evitar el parpadeo
// de idioma al recargar.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import ja from './ja.json';
import zh from './zh.json';
import { setFormatLocale } from '../lib/format';
import type { Language } from '../types';

export const LANGUAGES: Language[] = ['es', 'en', 'fr', 'zh', 'ja'];

const LOCALES: Record<Language, string> = {
  es: 'es-MX',
  en: 'en-US',
  fr: 'fr-FR',
  zh: 'zh-CN',
  ja: 'ja-JP',
};

const LANG_CACHE_KEY = 'pt-lang';

function cachedLanguage(): Language {
  try {
    const v = localStorage.getItem(LANG_CACHE_KEY);
    if (v && (LANGUAGES as string[]).includes(v)) return v as Language;
  } catch {
    /* localStorage no disponible */
  }
  return 'es';
}

const initial = cachedLanguage();

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    fr: { translation: fr },
    zh: { translation: zh },
    ja: { translation: ja },
  },
  lng: initial,
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

setFormatLocale(LOCALES[initial]);
if (typeof document !== 'undefined') document.documentElement.lang = initial;

/** Cambia el idioma de la UI, el locale de formato y el caché, todo a la vez. */
export function applyLanguage(lang: Language): void {
  void i18n.changeLanguage(lang);
  setFormatLocale(LOCALES[lang]);
  try {
    localStorage.setItem(LANG_CACHE_KEY, lang);
  } catch {
    /* localStorage no disponible */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

export default i18n;
