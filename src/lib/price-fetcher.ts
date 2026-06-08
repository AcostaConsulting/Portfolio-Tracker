// F3 — Obtención de precios en vivo (módulo PURO: no importa React ni Dexie).
//
// PRIVACIDAD: este módulo solo envía tickers (p.ej. "BTC", "MSFT") y códigos de
// moneda (p.ej. "USD", "MXN"). Ningún dato de portafolio (cantidades, costos,
// valores, fechas) sale de la app.
//
// S3 — Seguridad en llamadas a internet:
//   - Toda respuesta se valida ANTES de usarse (funciones parse*). Un precio solo
//     se acepta si es un número finito y positivo.
//   - Timeout de 10 s por petición con AbortController.
//   - Nunca se evalúa contenido de la respuesta como código (sin eval/Function/
//     innerHTML). Solo se leen números; ninguna cadena de la API llega a la UI.
//   - No se desactiva la validación de certificados en ningún punto.

import type { Asset } from '../types';

const TIMEOUT_MS = 10_000;

/** Mapa ticker (mayúsculas) -> id de CoinGecko para las criptos más comunes.
 *  CoinGecko usa ids ("bitcoin"), no tickers ("BTC"); los no listados se omiten. */
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  USDC: 'usd-coin',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LTC: 'litecoin',
  LINK: 'chainlink',
  TRX: 'tron',
  SHIB: 'shiba-inu',
};

/** Type guard: número utilizable como precio/tasa (finito y > 0). */
function isPositiveFinite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/** fetch con timeout (AbortController) que devuelve JSON ya parseado. */
async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

// --- CoinGecko -------------------------------------------------------------

/** Valida la forma { [id]: { [vs]: number } } y devuelve el precio o null. */
export function parseCoinGeckoPrice(data: unknown, id: string, vs: string): number | null {
  if (typeof data !== 'object' || data === null) return null;
  const byId = (data as Record<string, unknown>)[id];
  if (typeof byId !== 'object' || byId === null) return null;
  const price = (byId as Record<string, unknown>)[vs];
  return isPositiveFinite(price) ? price : null;
}

async function fetchCoinGecko(assets: Asset[], out: Map<string, number>): Promise<void> {
  // Agrupa por moneda de cotización (vs_currency) para minimizar peticiones.
  const byVs = new Map<string, Asset[]>();
  for (const a of assets) {
    if (!COINGECKO_IDS[a.ticker.toUpperCase()]) {
      console.warn(`[price-fetcher] CoinGecko: ticker sin id conocido, se omite: ${a.ticker}`);
      continue;
    }
    const vs = a.currency.toLowerCase();
    const list = byVs.get(vs) ?? [];
    list.push(a);
    byVs.set(vs, list);
  }

  await Promise.allSettled(
    [...byVs.entries()].map(async ([vs, group]) => {
      const ids = group.map((a) => COINGECKO_IDS[a.ticker.toUpperCase()]).join(',');
      const url =
        `https://api.coingecko.com/api/v3/simple/price` +
        `?ids=${encodeURIComponent(ids)}&vs_currencies=${encodeURIComponent(vs)}`;
      const data = await fetchJson(url);
      for (const a of group) {
        const price = parseCoinGeckoPrice(data, COINGECKO_IDS[a.ticker.toUpperCase()], vs);
        if (price !== null) out.set(a.id, price);
        else console.warn(`[price-fetcher] CoinGecko: precio inválido para ${a.ticker}`);
      }
    }),
  );
}

// --- Yahoo Finance (NO oficial) --------------------------------------------
// NOTA: endpoint no oficial; puede cambiar o dar problemas de CORS en Electron.
// Si falla, se registra en consola y se deja el precio sin cambio (no rompe).

/** Valida chart.result[0].meta.regularMarketPrice y devuelve el precio o null. */
export function parseYahooPrice(data: unknown): number | null {
  if (typeof data !== 'object' || data === null) return null;
  const chart = (data as Record<string, unknown>).chart;
  if (typeof chart !== 'object' || chart === null) return null;
  const result = (chart as Record<string, unknown>).result;
  if (!Array.isArray(result) || result.length === 0) return null;
  const first = result[0];
  if (typeof first !== 'object' || first === null) return null;
  const meta = (first as Record<string, unknown>).meta;
  if (typeof meta !== 'object' || meta === null) return null;
  const price = (meta as Record<string, unknown>).regularMarketPrice;
  return isPositiveFinite(price) ? price : null;
}

async function fetchYahoo(assets: Asset[], out: Map<string, number>): Promise<void> {
  await Promise.allSettled(
    assets.map(async (a) => {
      // Se usa el ticker tal cual. Algunos mercados requieren sufijo (p.ej.
      // "WALMEX.MX"); ese mapeo puede requerir ajuste futuro.
      const url =
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(a.ticker)}` +
        `?interval=1d&range=1d`;
      const data = await fetchJson(url);
      const price = parseYahooPrice(data);
      if (price !== null) out.set(a.id, price);
      else console.warn(`[price-fetcher] Yahoo: precio inválido para ${a.ticker}`);
    }),
  );
}

/**
 * Consulta precios en vivo para los activos cuya `price_source` sea 'coingecko'
 * o 'yahoo'. Devuelve un mapa assetId -> precio EN LA MONEDA DEL ACTIVO.
 *
 * Usa Promise.allSettled: si una fuente falla, las demás continúan. Los activos
 * 'manual' (o sin fuente) no se consultan.
 */
export async function fetchLivePrices(assets: Asset[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const coingecko = assets.filter((a) => a.price_source === 'coingecko');
  const yahoo = assets.filter((a) => a.price_source === 'yahoo');

  await Promise.allSettled([
    coingecko.length ? fetchCoinGecko(coingecko, out) : Promise.resolve(),
    yahoo.length ? fetchYahoo(yahoo, out) : Promise.resolve(),
  ]);

  return out;
}

// --- Frankfurter (tipos de cambio) -----------------------------------------

/** Valida { rates: { [target]: number } } y devuelve la tasa o null. */
export function parseFrankfurterRate(data: unknown, target: string): number | null {
  if (typeof data !== 'object' || data === null) return null;
  const rates = (data as Record<string, unknown>).rates;
  if (typeof rates !== 'object' || rates === null) return null;
  const rate = (rates as Record<string, unknown>)[target];
  return isPositiveFinite(rate) ? rate : null;
}

/**
 * Tipos de cambio (1 unidad de cada `currency` -> `base`) vía Frankfurter.
 * Devuelve un mapa currency(mayúsculas) -> rate_to_base. Solo se envían códigos
 * de moneda; ningún dato de portafolio.
 */
export async function fetchFxRates(currencies: string[], base: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const to = base.toUpperCase();
  const targets = [...new Set(currencies.map((c) => c.toUpperCase()))].filter((c) => c !== to);

  await Promise.allSettled(
    targets.map(async (from) => {
      const url =
        `https://api.frankfurter.dev/v1/latest` +
        `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const data = await fetchJson(url);
      const rate = parseFrankfurterRate(data, to);
      if (rate !== null) out.set(from, rate);
      else console.warn(`[price-fetcher] Frankfurter: tasa inválida para ${from}->${to}`);
    }),
  );

  return out;
}

/**
 * G.2 — Tipo de cambio HISTÓRICO a demanda (Frankfurter). Una sola petición que
 * el usuario dispara al capturar una operación en fecha pasada. Devuelve la tasa
 * (1 `from` -> `to`) en `date`, o null si no hay datos (sin internet, fecha
 * demasiado antigua/futura, o respuesta inválida). NUNCA lanza.
 *
 * PRIVACIDAD: solo se envían la fecha y los dos códigos de moneda. Ningún dato de
 * portafolio. Es una llamada PUNTUAL (no sincronización continua) e independiente
 * del interruptor de precios en vivo (F3).
 */
export async function fetchHistoricalFxRate(
  date: string,
  from: string,
  to: string,
): Promise<number | null> {
  const f = from.toUpperCase();
  const tt = to.toUpperCase();
  if (f === tt) return 1;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  try {
    const url =
      `https://api.frankfurter.dev/v1/${encodeURIComponent(date)}` +
      `?from=${encodeURIComponent(f)}&to=${encodeURIComponent(tt)}`;
    const data = await fetchJson(url);
    return parseFrankfurterRate(data, tt);
  } catch {
    return null;
  }
}
