import { describe, it, expect } from 'vitest';
import { CONSULTING_BASE_MXN, getConsultingPrice } from './consulting';

describe('getConsultingPrice', () => {
  it('Free: sin descuento', () => {
    const p = getConsultingPrice('free');
    expect(p.baseMxn).toBe(CONSULTING_BASE_MXN);
    expect(p.finalMxn).toBe(720);
    expect(p.discountPct).toBe(0);
    expect(p.hasDiscount).toBe(false);
  });

  it('Pro: 10% de descuento', () => {
    const p = getConsultingPrice('pro');
    expect(p.finalMxn).toBe(648); // 720 × 0.90
    expect(p.discountPct).toBe(10);
    expect(p.hasDiscount).toBe(true);
  });

  it('Premium y Lifetime: 15% de descuento', () => {
    for (const tier of ['premium', 'lifetime'] as const) {
      const p = getConsultingPrice(tier);
      expect(p.finalMxn).toBe(612); // 720 × 0.85
      expect(p.discountPct).toBe(15);
      expect(p.hasDiscount).toBe(true);
    }
  });

  it('espejo USD usa el tipo de cambio de display (18)', () => {
    expect(getConsultingPrice('free').finalUsd).toBe(40); // 720 / 18
    expect(getConsultingPrice('pro').finalUsd).toBe(36); //  648 / 18
    expect(getConsultingPrice('premium').finalUsd).toBe(34); // 612 / 18
  });
});
