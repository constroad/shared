import { estimateMeasurementMetrics, relacionArea } from './photoMeasurement';
/**
 * El modo A ESCUADRA dentro del motor de métricas (30/09/2026).
 *
 * Orden de preferencia del área: diagonales (Herón, exacta sin premisa) →
 * a escuadra (exacta bajo la premisa de 90°, la activa el usuario) → techo →
 * cámara. Lo que sale «a escuadra» se guarda y se suma igual que lo medido.
 */

const p = (id: string, x: number, y: number) => ({ id, x, y });
// La franja de Globofast vista desde arriba: quiebre colineal en c.
const franja = {
  points: [p('a', 0.2, 0.2), p('b', 0.2, 0.4), p('c', 0.5, 0.4), p('d', 0.8, 0.4), p('e', 0.8, 0.2)],
  isClosed: true,
  distances: { 'a:b': 0.65, 'b:c': 3.3, 'c:d': 4.1, 'd:e': 0.65, 'e:a': 7.4 },
  height: 0.037,
  imageAspect: 1,
};

describe('estimateMeasurementMetrics · a escuadra', () => {
  it('sin el modo, cinco lados sin diagonal solo dan el techo (S ≤ 9.09)', () => {
    const m = estimateMeasurementMetrics(franja);

    expect(m.areaFuente).toBe('maximo');
    expect(m.escuadra).toBeNull();
  });

  it('con el modo, la franja da 4.81 exacto, fuente «escuadra», y el volumen sale de ahí', () => {
    const m = estimateMeasurementMetrics({ ...franja, aEscuadra: true });

    expect(m.areaFuente).toBe('escuadra');
    expect(m.area).toBeCloseTo(4.81, 4);
    expect(m.volume).toBeCloseTo(4.81 * 0.037, 4);
    expect(m.escuadra?.estado).toBe('medida');
    expect(relacionArea(m.areaFuente)).toBe('=');
  });

  it('las diagonales GANAN al modo a escuadra: Herón no necesita la premisa de 90°', () => {
    const m = estimateMeasurementMetrics({ ...franja, aEscuadra: true, diagonals: { 'diag-0': 3.3634, 'diag-1': 7.4285 } });

    expect(m.areaFuente).toBe('medida');
  });

  it('con el modo pero un largo mal tipeado cae al techo y expone por qué', () => {
    const m = estimateMeasurementMetrics({ ...franja, aEscuadra: true, distances: { ...franja.distances, 'e:a': 4.7 } });

    expect(m.areaFuente).toBe('maximo');
    expect(m.escuadra?.estado).toBe('no-cierra');
    expect(m.escuadra?.cierre?.distancia).toBeCloseTo(2.7, 4);
  });

  it('el modo no se calcula con la forma abierta', () => {
    const m = estimateMeasurementMetrics({ ...franja, aEscuadra: true, isClosed: false });

    expect(m.escuadra).toBeNull();
  });

  it('el área a escuadra nunca supera el techo (es un polígono con esos lados)', () => {
    const m = estimateMeasurementMetrics({ ...franja, aEscuadra: true });

    expect(m.area as number).toBeLessThanOrEqual(m.areaMaxima as number);
  });
});
