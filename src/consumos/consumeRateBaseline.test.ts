import {
  computeRateBaseline,
  computeRateVariancePct,
  exceedsVarianceThreshold,
  sampleRatePerM3,
} from './consumeRateBaseline';

describe('sampleRatePerM3', () => {
  it('suma los tres combustibles y divide entre m³', () => {
    const rate = sampleRatePerM3({
      quantityPen: 200,
      quantityGasohol: 60,
      quantityPetroleo: 40,
      totalCubes: 100,
    });

    expect(rate).toBe(3);
  });

  it('devuelve null sin m³ o sin galones', () => {
    expect(sampleRatePerM3({ quantityPen: 100, totalCubes: 0 })).toBeNull();
    expect(sampleRatePerM3({ totalCubes: 50 })).toBeNull();
  });
});

describe('computeRateBaseline', () => {
  it('promedia las muestras válidas y excluye el consumo en edición', () => {
    const baseline = computeRateBaseline(
      [
        { _id: 'consume-editing', quantityPen: 999, totalCubes: 1 },
        { _id: 'a', quantityPen: 300, totalCubes: 100 },
        { _id: 'b', quantityPen: 340, totalCubes: 100 },
        { _id: 'c', quantityPen: 0, totalCubes: 100 },
      ],
      'consume-editing'
    );

    expect(baseline).toEqual({ averageRatePerM3: 3.2, sampleSize: 2 });
  });

  it('respeta el máximo de muestras (las más recientes primero)', () => {
    const samples = Array.from({ length: 12 }, (_, index) => ({
      _id: `consume-${index}`,
      quantityPen: (index + 1) * 100,
      totalCubes: 100,
    }));

    const baseline = computeRateBaseline(samples, undefined, 2);

    expect(baseline.sampleSize).toBe(2);
    expect(baseline.averageRatePerM3).toBe(1.5);
  });

  it('devuelve null sin muestras válidas', () => {
    expect(computeRateBaseline([])).toEqual({ averageRatePerM3: null, sampleSize: 0 });
  });
});

describe('computeRateVariancePct + exceedsVarianceThreshold', () => {
  it('calcula la variación porcentual con signo', () => {
    expect(computeRateVariancePct(3.41, 3.2)).toBe(6.6);
    expect(computeRateVariancePct(2.5, 3.2)).toBe(-21.9);
  });

  it('devuelve null sin rate o sin baseline', () => {
    expect(computeRateVariancePct(null, 3.2)).toBeNull();
    expect(computeRateVariancePct(3.2, null)).toBeNull();
    expect(computeRateVariancePct(3.2, 0)).toBeNull();
  });

  it('marca el umbral solo por encima de ±15%', () => {
    expect(exceedsVarianceThreshold(14.9)).toBe(false);
    expect(exceedsVarianceThreshold(-15.1)).toBe(true);
    expect(exceedsVarianceThreshold(null)).toBe(false);
  });
});
