import { describe, it, expect } from 'vitest';
import { MAX_LABELS_FREE, MAX_LABELS_PREMIUM, canAddLabel } from './custom-labels';

describe('canAddLabel', () => {
  it('Free puede crear su primera etiqueta (gratis)', () => {
    expect(canAddLabel('free', 0)).toBe(true);
  });

  it('Free NO puede crear una segunda etiqueta', () => {
    expect(canAddLabel('free', 1)).toBe(false);
  });

  it('Pro comparte el mismo límite gratuito que Free (1)', () => {
    expect(canAddLabel('pro', 0)).toBe(true);
    expect(canAddLabel('pro', 1)).toBe(false);
  });

  it('Premium y Lifetime: etiquetas ilimitadas', () => {
    for (const tier of ['premium', 'lifetime'] as const) {
      expect(canAddLabel(tier, 0)).toBe(true);
      expect(canAddLabel(tier, 50)).toBe(true);
    }
  });
});

describe('constantes de límite', () => {
  it('Free/Pro: 1 etiqueta gratis', () => {
    expect(MAX_LABELS_FREE).toBe(1);
  });

  it('Premium/Lifetime: sin límite', () => {
    expect(MAX_LABELS_PREMIUM).toBe(Infinity);
  });
});
