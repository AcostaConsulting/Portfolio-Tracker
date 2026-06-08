import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchFxRates,
  fetchHistoricalFxRate,
  fetchLivePrices,
  parseCoinGeckoPrice,
  parseFrankfurterRate,
  parseYahooPrice,
} from './price-fetcher';
import type { Asset } from '../types';

function asset(partial: Partial<Asset>): Asset {
  return {
    id: 'x',
    ticker: 'BTC',
    name: 'n',
    class: 'Cripto',
    currency: 'USD',
    current_price: 0,
    ...partial,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('parseCoinGeckoPrice (S3: validación de respuesta)', () => {
  it('acepta un número positivo', () => {
    expect(parseCoinGeckoPrice({ bitcoin: { usd: 68000 } }, 'bitcoin', 'usd')).toBe(68000);
  });

  it('rechaza no-números, negativos, no finitos y faltantes', () => {
    expect(parseCoinGeckoPrice({ bitcoin: { usd: 'x' } }, 'bitcoin', 'usd')).toBeNull();
    expect(parseCoinGeckoPrice({ bitcoin: { usd: -1 } }, 'bitcoin', 'usd')).toBeNull();
    expect(parseCoinGeckoPrice({ bitcoin: { usd: 0 } }, 'bitcoin', 'usd')).toBeNull();
    expect(parseCoinGeckoPrice({ bitcoin: { usd: Infinity } }, 'bitcoin', 'usd')).toBeNull();
    expect(parseCoinGeckoPrice({ bitcoin: {} }, 'bitcoin', 'usd')).toBeNull();
    expect(parseCoinGeckoPrice(null, 'bitcoin', 'usd')).toBeNull();
    expect(parseCoinGeckoPrice('nope', 'bitcoin', 'usd')).toBeNull();
  });
});

describe('parseYahooPrice (S3)', () => {
  it('extrae regularMarketPrice de la estructura anidada', () => {
    expect(parseYahooPrice({ chart: { result: [{ meta: { regularMarketPrice: 430 } }] } })).toBe(430);
  });

  it('rechaza estructuras inválidas o precios no positivos', () => {
    expect(parseYahooPrice({ chart: { result: [] } })).toBeNull();
    expect(parseYahooPrice({ chart: {} })).toBeNull();
    expect(parseYahooPrice({})).toBeNull();
    expect(parseYahooPrice({ chart: { result: [{ meta: { regularMarketPrice: 0 } }] } })).toBeNull();
  });
});

describe('parseFrankfurterRate (S3)', () => {
  it('extrae la tasa del objetivo', () => {
    expect(parseFrankfurterRate({ rates: { MXN: 18.5 } }, 'MXN')).toBe(18.5);
  });

  it('rechaza estructuras inválidas', () => {
    expect(parseFrankfurterRate({ rates: {} }, 'MXN')).toBeNull();
    expect(parseFrankfurterRate({}, 'MXN')).toBeNull();
    expect(parseFrankfurterRate(null, 'MXN')).toBeNull();
  });
});

describe('fetchLivePrices', () => {
  it('agrupa por fuente, ignora los manual y solo guarda precios válidos', async () => {
    const assets = [
      asset({ id: 'btc', ticker: 'BTC', currency: 'USD', price_source: 'coingecko' }),
      asset({ id: 'msft', ticker: 'MSFT', currency: 'USD', class: 'Acción', price_source: 'yahoo' }),
      asset({ id: 'foo', ticker: 'FOO', price_source: 'manual' }),
    ];

    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        calls.push(url);
        if (url.includes('coingecko')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ bitcoin: { usd: 68000 } }) });
        }
        if (url.includes('finance.yahoo.com')) {
          // Estructura REAL de Yahoo v8/chart (verificada contra la API en vivo).
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                chart: {
                  result: [
                    {
                      meta: {
                        currency: 'USD',
                        symbol: 'MSFT',
                        instrumentType: 'EQUITY',
                        regularMarketTime: 1780516801,
                        regularMarketPrice: 430,
                        chartPreviousClose: 428.1,
                      },
                    },
                  ],
                  error: null,
                },
              }),
          });
        }
        return Promise.reject(new Error('URL inesperada'));
      }),
    );

    const out = await fetchLivePrices(assets);
    expect(out.get('btc')).toBe(68000);
    expect(out.get('msft')).toBe(430);
    expect(out.has('foo')).toBe(false);
    // Endpoint correcto de Yahoo (v8/chart en query1).
    const yahooUrl = calls.find((u) => u.includes('finance.yahoo.com'));
    expect(yahooUrl).toContain('https://query1.finance.yahoo.com/v8/finance/chart/MSFT');
  });

  it('si una fuente falla, las demás siguen (Promise.allSettled)', async () => {
    const assets = [
      asset({ id: 'btc', ticker: 'BTC', currency: 'USD', price_source: 'coingecko' }),
      asset({ id: 'msft', ticker: 'MSFT', currency: 'USD', class: 'Acción', price_source: 'yahoo' }),
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('coingecko')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ bitcoin: { usd: 70000 } }) });
        }
        return Promise.reject(new Error('CORS')); // Yahoo cae
      }),
    );
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const out = await fetchLivePrices(assets);
    expect(out.get('btc')).toBe(70000);
    expect(out.has('msft')).toBe(false);
  });
});

describe('fetchFxRates', () => {
  it('consulta solo monedas distintas a la base y valida la respuesta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('from=USD')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ rates: { MXN: 18.7 } }) });
        }
        return Promise.reject(new Error('URL inesperada'));
      }),
    );

    const out = await fetchFxRates(['USD', 'MXN'], 'MXN');
    expect(out.get('USD')).toBe(18.7);
    expect(out.has('MXN')).toBe(false); // la base no se consulta
  });

  it('usa el dominio vigente de Frankfurter (api.frankfurter.dev/v1)', async () => {
    // El dominio api.frankfurter.app fue retirado (301 → api.frankfurter.dev/v1).
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        calls.push(url);
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ rates: { MXN: 18.7 } }) });
      }),
    );

    await fetchFxRates(['USD'], 'MXN');
    expect(calls[0]).toContain('https://api.frankfurter.dev/v1/latest');
    expect(calls[0]).not.toContain('frankfurter.app');
  });
});

describe('fetchHistoricalFxRate', () => {
  it('usa el dominio vigente de Frankfurter y extrae la tasa', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        calls.push(url);
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ rates: { MXN: 17.79 } }) });
      }),
    );

    const rate = await fetchHistoricalFxRate('2026-01-15', 'USD', 'MXN');
    expect(rate).toBe(17.79);
    expect(calls[0]).toContain('https://api.frankfurter.dev/v1/2026-01-15');
    expect(calls[0]).not.toContain('frankfurter.app');
  });

  it('devuelve 1 si las monedas son iguales (sin red)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchHistoricalFxRate('2026-01-15', 'USD', 'USD')).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
