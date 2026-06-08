// Formateadores para la UI (es-MX). Centralizan moneda, números, porcentajes,
// cantidades y fechas para una presentación consistente.

// Locale activo para formateo. Mutable a propósito: el sistema i18n (F4) lo
// ajusta con setFormatLocale al cambiar de idioma, evitando pasar el locale por
// cada una de las llamadas a formato.
let currentLocale = 'es-MX';

/** F4 — Cambia el locale de formateo (es-MX, en-US, fr-FR, zh-CN, ja-JP). */
export function setFormatLocale(locale: string): void {
  currentLocale = locale;
}

/** Monto en una moneda dada. Cae a número + código si la moneda es inválida. */
export function formatMoney(amount: number, currency: string): string {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(currentLocale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${formatNumber(value)} ${currency}`;
  }
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  const n = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(currentLocale, { maximumFractionDigits }).format(n);
}

/** Porcentaje ya en escala 0..100 (ej. 20.48 -> "20.5%"). */
export function formatPercent(pct: number, fractionDigits = 1): string {
  const n = Number.isFinite(pct) ? pct : 0;
  const num = new Intl.NumberFormat(currentLocale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
  return `${num}%`;
}

/** Cantidades de activos: hasta 8 decimales (cripto), sin ceros sobrantes. */
export function formatQty(qty: number): string {
  const n = Number.isFinite(qty) ? qty : 0;
  return new Intl.NumberFormat(currentLocale, { maximumFractionDigits: 8 }).format(n);
}

/** Fecha ISO 'YYYY-MM-DD' -> legible local (ej. "28 may 2026"). */
export function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat(currentLocale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Signo explícito para P&L (ej. +1,234.00 / -567.00). */
export function formatSignedMoney(amount: number, currency: string): string {
  const sign = amount > 0 ? '+' : '';
  return `${sign}${formatMoney(amount, currency)}`;
}
