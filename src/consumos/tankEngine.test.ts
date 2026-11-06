import { geometricGallonsAtLevel, tankEventFromGallons } from './tankEngine';
import type { TankCalculationInput } from './tankCalculation';

const buildInput = (): TankCalculationInput => ({
  tankShape: 'rectangular',
  geometry: { lengthCm: 1, widthCm: 1, maxHeightCm: 100 },
  cubicCmPerUsGallon: 3851,
  serpentines: [],
  calibrationTable: [
    { levelCentimeter: 0, effectiveGallons: 0 },
    { levelCentimeter: 10, effectiveGallons: 100 },
    { levelCentimeter: 20, effectiveGallons: 240 },
  ],
});

describe('configurable tank engine', () => {
  it('interpolates gallons from a calibrated cm table', () => {
    const outcome = geometricGallonsAtLevel(buildInput(), 15);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.effectiveGallons).toBe(170);
  });

  it('rejects levels above calibrated table maximum', () => {
    const outcome = geometricGallonsAtLevel(buildInput(), 21);

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.code).toBe('LEVEL_ABOVE_MAX');
  });
});

describe('tankEventFromGallons', () => {
  it('the same level is a measure, though the saved reading was rounded down', () => {
    expect(tankEventFromGallons(1234.5632, 1234.56)).toBe('measurement');
  });

  it('the same level is a measure when the saved reading was rounded up', () => {
    expect(tankEventFromGallons(1234.5678, 1234.57)).toBe('measurement');
  });

  it('gallons that rise past the saved precision are a refill', () => {
    expect(tankEventFromGallons(1234.57, 1234.56)).toBe('refill');
  });

  it('gallons that fall are a measure', () => {
    expect(tankEventFromGallons(1000, 1234.56)).toBe('measurement');
  });
});
