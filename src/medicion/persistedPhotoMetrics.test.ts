/**
 * Which m²/m³ are STORED on the report photo (Globofast incident, 30/09/2026).
 *
 * The client got «17.05 m² · 0.631 m³» for a 4.81 m² hole: a 0.65-wide strip
 * with a break on one long side (3.30 + 4.10). Without diagonals the engine has
 * no measured area and shows the cyclic CEILING (S ≤), which matches reality
 * for a rectangle and opens up to 2–4× the area for a pentagon. Until then that
 * ceiling was stored as `areaM2`, multiplied by the thickness and ADDED to the
 * IAA quantities table.
 *
 * Rule: what is stored, summed or multiplied is ONLY what was measured. A
 * ceiling (≤) and a camera estimate (≈) guide on screen; they are not report data.
 */
import { applyPersistedMetric, persistedPhotoMetrics } from './persistedPhotoMetrics';
import { estimateMeasurementMetrics } from './photoMeasurement';

const p = (id: string, x: number, y: number) => ({ id, x, y });
// The incident's strip with a break, on a 9:16 portrait photo.
const stripWithBreak = {
  points: [p('a', 0.56, 0.2), p('b', 0.27, 0.72), p('c', 0.45, 0.74), p('d', 0.63, 0.75), p('e', 0.71, 0.24)],
  isClosed: true,
  distances: { 'a:b': 0.65, 'b:c': 3.3, 'c:d': 4.1, 'd:e': 0.65, 'e:a': 7.4 },
  height: 0.037,
  imageAspect: 0.5625,
};

describe('persistedPhotoMetrics', () => {
  it('el TECHO no se guarda: sin diagonales el informe no recibe m² ni m³, y LIMPIA lo viejo', () => {
    const metrics = estimateMeasurementMetrics(stripWithBreak);
    // On screen it still guides: S ≤ 9.09 (what those five sides allow).
    expect(metrics.areaFuente).toBe('maximo');
    expect(metrics.area).toBeCloseTo(9.09, 2);

    // `null`, not `undefined`: the consumer merges with `??` over the stored
    // photo, and with `undefined` the Globofast 17.05 survived a re-measure.
    expect(persistedPhotoMetrics(metrics)).toEqual({ areaM2: null, volumeM3: null });
  });

  it('SIN forma dibujada no opina: el m² tecleado inline en el IAA se conserva', () => {
    const metrics = estimateMeasurementMetrics({ points: [], isClosed: false, imageAspect: 1 });

    expect(metrics.areaFuente).toBeNull();
    expect(persistedPhotoMetrics(metrics)).toEqual({ areaM2: undefined, volumeM3: undefined });
  });

  it('con las diagonales el área es medida, y ESA sí se guarda con su volumen', () => {
    // Two diagonals from vertex a: a→c = √(3.30²+0.65²) and a→d = √(7.40²+0.65²).
    // The break is COLLINEAR (3.30 + 4.10 on the same line), so the middle
    // triangle is almost flat and very sensitive: with the diagonals rounded to
    // the cm (3.36 / 7.43) Heron gives 4.71, not 4.81. It is a real limit of
    // measuring a strip with a break: two rectangles are better.
    const metrics = estimateMeasurementMetrics({
      ...stripWithBreak,
      diagonals: { 'diag-0': 3.3634, 'diag-1': 7.4285 },
    });

    expect(metrics.areaFuente).toBe('medida');
    const guardado = persistedPhotoMetrics(metrics);
    expect(guardado.areaM2).toBeCloseTo(4.81, 1);
    expect(guardado.volumeM3).toBeCloseTo(4.81 * 0.037, 2);
  });

  it('un rectángulo sin diagonal TAMPOCO se guarda, aunque el techo coincida con lo real', () => {
    // Four sides do not determine the quadrilateral: the same 0.65/7.4/0.65/7.4
    // can be a flattened rhombus with less area. The ceiling matching the
    // rectangle is geometry, not a measurement, and it was the estimator's shortcut.
    const metrics = estimateMeasurementMetrics({
      points: [p('a', 0.56, 0.2), p('b', 0.27, 0.72), p('c', 0.63, 0.75), p('d', 0.71, 0.24)],
      isClosed: true,
      distances: { 'a:b': 0.65, 'b:c': 7.4, 'c:d': 0.65, 'd:a': 7.4 },
      height: 0.037,
      imageAspect: 0.5625,
    });

    expect(metrics.area).toBeCloseTo(4.81, 2); // the ceiling, right by chance
    expect(persistedPhotoMetrics(metrics)).toEqual({ areaM2: null, volumeM3: null });
  });

  it('la estimación por cámara (≈) tampoco se guarda', () => {
    const metrics = estimateMeasurementMetrics({
      ...stripWithBreak,
      distances: { 'a:b': 0.65, 'b:c': 3.3, 'c:d': 4.1, 'd:e': 0.65 }, // a side is missing → no ceiling
    });

    expect(metrics.areaFuente).toBe('estimada');
    expect(persistedPhotoMetrics(metrics)).toEqual({ areaM2: null, volumeM3: null });
  });

  it('un triángulo se mide con sus tres lados: no necesita diagonal', () => {
    const metrics = estimateMeasurementMetrics({
      points: [p('a', 0.3, 0.3), p('b', 0.7, 0.3), p('c', 0.5, 0.7)],
      isClosed: true,
      distances: { 'a:b': 3, 'b:c': 4, 'c:a': 5 },
      height: 0.1,
      imageAspect: 1,
    });

    expect(persistedPhotoMetrics(metrics)).toEqual({ areaM2: 6, volumeM3: 0.6 });
  });

  it('con área medida pero sin espesor, el volumen se LIMPIA (no cero, no el viejo)', () => {
    const metrics = estimateMeasurementMetrics({
      points: [p('a', 0.3, 0.3), p('b', 0.7, 0.3), p('c', 0.5, 0.7)],
      isClosed: true,
      distances: { 'a:b': 3, 'b:c': 4, 'c:a': 5 },
      imageAspect: 1,
    });

    expect(persistedPhotoMetrics(metrics)).toEqual({ areaM2: 6, volumeM3: null });
  });
});

describe('applyPersistedMetric (el merge que hacen los dos consumidores)', () => {
  it('número: fija', () => {
    expect(applyPersistedMetric(4.81, 17.05)).toBe(4.81);
  });

  it('null: limpia el techo guardado', () => {
    expect(applyPersistedMetric(null, 17.05)).toBeUndefined();
  });

  it('undefined: conserva el valor tecleado', () => {
    expect(applyPersistedMetric(undefined, 4.81)).toBe(4.81);
    expect(applyPersistedMetric(undefined, undefined)).toBeUndefined();
  });
});
