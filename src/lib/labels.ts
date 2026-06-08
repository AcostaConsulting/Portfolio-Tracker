// Listas de opciones para los enums del dominio (orden de los <select>).
// Las ETIQUETAS visibles ahora viven en el sistema i18n (F4): se traducen con
// t(`assetClass.${x}`), t(`fiTypeLabel.${x}`), t(`txType.${x}`), t(`freq.${x}`),
// t(`priceSource.${x}`), t(`priceFreq.${x}`). Aquí solo quedan los arreglos de
// valores (no texto de UI).

import type {
  AssetClass,
  CouponFrequency,
  CryptoSector,
  FixedIncomeType,
  PriceSource,
  PriceUpdateFrequency,
  StockSector,
  TransactionType,
} from '../types';

export const ASSET_CLASSES: AssetClass[] = ['Cripto', 'Acción', 'Renta Fija'];

// S10 — Sectores fijos para el <select> de Activos. La clase del activo decide
// cuál lista se muestra (acciones vs cripto). La renta fija no tiene sector.
export const STOCK_SECTORS: StockSector[] = [
  'Tecnología',
  'Salud',
  'Financiero',
  'Consumo básico',
  'Consumo discrecional',
  'Energía',
  'Materiales',
  'Industrial',
  'Inmobiliario',
  'Servicios públicos',
  'Telecomunicaciones',
];

export const CRYPTO_SECTORS: CryptoSector[] = [
  'Capa 1 (L1)',
  'Capa 2 (L2)',
  'Stablecoin',
  'DeFi',
  'Exchange token',
  'Memecoin',
  'NFT / Gaming',
  'Privacidad',
  'IA / Datos',
  'Staking / Recompensas',
];

export const FI_TYPES: FixedIncomeType[] = [
  'discount',
  'money_market',
  'fixed_rate_coupon',
  'inflation_linked',
  'promissory_note', // C.1
  'sofipo', //          C.1
  'savings', //         C.1
];

// C.4 — Sub-tipos de RF que requieren plan Pro+ (cálculo de retención ISR).
// Nu/Ahorros ('savings') queda en Free a propósito (producto de entrada).
export const FI_TYPES_REQUIRING_PRO: FixedIncomeType[] = ['promissory_note', 'sofipo'];

// C.2 — Instituciones sugeridas para el dropdown. El valor guardado es string
// libre (no enum), así cambiar esta lista no rompe datos existentes.
export const RF_INSTITUTIONS = [
  'BBVA',
  'Banorte',
  'HSBC',
  'Santander',
  'Banamex',
  'Crédito Real',
  'Prestamadre',
  'Nu',
  'Finsus',
  'Klar',
  'Otro',
];

export const TX_TYPES: TransactionType[] = [
  'Compra',
  'Venta',
  'Dividendo',
  'Interés',
  'Staking',
  'Ajuste',
  'Airdrop', //     v0.6.0 — solo cripto
  'Recompensa', // v0.6.0 — solo cripto
];

export const FREQUENCIES: CouponFrequency[] = ['anual', 'semestral', 'trimestral', 'mensual'];

export const PRICE_SOURCES: PriceSource[] = ['manual', 'coingecko', 'yahoo'];

export const PRICE_FREQUENCIES: PriceUpdateFrequency[] = ['manual', '5min', '15min', '1hour'];
