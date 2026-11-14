import { normalizeArCapture } from './arCapture';
import { estimateMeasurementMetrics, normalizeMeasurementShape, relacionArea } from './photoMeasurement';
import { persistedPhotoMetrics } from './persistedPhotoMetrics';

/** 2.30 × 2.09 m as AR read it, 2 % short. */
const PLAN = [
  { x: 0, y: 0 },
  { x: 2.254, y: 0 },
  { x: 2.254, y: 2.0482 },
  { x: 0, y: 2.0482 },
];

const capture = (extra: Record<string, unknown> = {}) => ({
  plan: PLAN,
  tape: [{ side: 0, lengthM: 2.3 }],
  thicknessCm: [5, 5.3, 5.4, 5.1],
  tracking: 'normal',
  device: { model: 'Galaxy A54', os: 'Android 15', ar: 'arcore', version: '1.57' },
  ...extra,
});

describe('normalizeArCapture', () => {
  it('keeps a plan with its tape, its thickness readings and the device', () => {
    // Act
    const normalized = normalizeArCapture(capture());

    // Assert
    expect(normalized).toEqual(capture());
  });

  it('drops what is not a capture: no plan, fewer than three corners, corners that are not numbers', () => {
    expect(normalizeArCapture(undefined)).toBeNull();
    expect(normalizeArCapture({ plan: PLAN.slice(0, 2) })).toBeNull();
    expect(normalizeArCapture({ plan: [...PLAN.slice(0, 3), { x: 'a', y: 1 }] })).toBeNull();
  });

  it('cleans the tape and the readings, and leaves out an unknown tracking or a half device', () => {
    // Act
    const normalized = normalizeArCapture(
      capture({ tape: [{ side: 0, lengthM: 2.3 }, { side: 'x', lengthM: 1 }, { side: 1, lengthM: -2 }], thicknessCm: [5, 'a', -1], tracking: 'raro', device: { model: 'A54' } })
    );

    // Assert
    expect(normalized).toEqual({ plan: PLAN, tape: [{ side: 0, lengthM: 2.3 }], thicknessCm: [5] });
  });
});

describe('a photo measured with AR', () => {
  it('normalizing the measurement keeps the AR capture: saving from the web no longer wipes it', () => {
    // Act
    const shape = normalizeMeasurementShape({ ar: capture() } as never);

    // Assert
    expect(shape.ar).toEqual(capture());
  });

  it('takes its area from the AR plan fitted by the tape, and its volume from the mean thickness', () => {
    // Act
    const metrics = estimateMeasurementMetrics({ ar: capture() } as never);

    // Assert
    expect(metrics.areaFuente).toBe('ar+wincha');
    expect(metrics.area).toBeCloseTo(2.3 * 2.09, 3);
    expect(metrics.height).toBeCloseTo(0.052, 4);
    expect(metrics.volume).toBeCloseTo(2.3 * 2.09 * 0.052, 4);
    expect(relacionArea(metrics.areaFuente)).toBe('=');
  });

  it('AR with no tape is only an estimate: shown with ≈ and never kept as the photo area', () => {
    // Act
    const metrics = estimateMeasurementMetrics({ ar: capture({ tape: [] }) } as never);

    // Assert
    expect(metrics.areaFuente).toBe('ar');
    expect(relacionArea(metrics.areaFuente)).toBe('≈');
    expect(persistedPhotoMetrics(metrics)).toEqual({ areaM2: null, volumeM3: null });
  });

  it('AR fitted by the tape is kept, like what was measured by hand', () => {
    // Act
    const saved = persistedPhotoMetrics(estimateMeasurementMetrics({ ar: capture() } as never));

    // Assert
    expect(saved.areaM2).toBeCloseTo(4.807, 3);
    expect(saved.volumeM3).toBeCloseTo(0.25, 3);
  });

  it('without thickness readings, the volume falls back to the height of the measurement', () => {
    // Act
    const metrics = estimateMeasurementMetrics({ ar: capture({ thicknessCm: [] }), height: 0.05 } as never);

    // Assert
    expect(metrics.volume).toBeCloseTo(4.807 * 0.05, 3);
  });

  it('a plan that crosses itself has no area', () => {
    // Arrange
    const bowTie = [PLAN[0], PLAN[2], PLAN[1], PLAN[3]];

    // Act
    const metrics = estimateMeasurementMetrics({ ar: capture({ plan: bowTie }) } as never);

    // Assert
    expect(metrics.area).toBeNull();
    expect(metrics.areaFuente).toBeNull();
  });
});
