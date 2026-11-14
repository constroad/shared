/**
 * Qué m²/m³ se GUARDAN en la foto del informe (incidente Globofast, 30/09/2026).
 *
 * El cliente recibió «17.05 m² · 0.631 m³» sobre un hueco de 4.81 m²: una
 * franja de 0.65 de ancho con un quiebre en un lado largo (3.30 + 4.10). Sin
 * diagonales el motor no tiene área medida y muestra el TECHO cíclico (S ≤),
 * que para un rectángulo coincide con lo real y para un pentágono se abre a
 * 2–4× el área. Hasta hoy ese techo se guardaba como `areaM2`, se multiplicaba
 * por el espesor y se SUMABA en el cuadro de metrados del IAA.
 *
 * Regla: lo que se guarda, suma o multiplica es SOLO lo medido. Un techo (≤) y
 * una estimación por cámara (≈) orientan en pantalla; no son datos del informe.
 */
import { applyPersistedMetric, persistedPhotoMetrics } from './persistedPhotoMetrics';
import { estimateMeasurementMetrics } from './photoMeasurement';

const p = (id: string, x: number, y: number) => ({ id, x, y });
// La franja con quiebre del incidente, en una foto vertical 9:16.
const franjaConQuiebre = {
  points: [p('a', 0.56, 0.2), p('b', 0.27, 0.72), p('c', 0.45, 0.74), p('d', 0.63, 0.75), p('e', 0.71, 0.24)],
  isClosed: true,
  distances: { 'a:b': 0.65, 'b:c': 3.3, 'c:d': 4.1, 'd:e': 0.65, 'e:a': 7.4 },
  height: 0.037,
  imageAspect: 0.5625,
};

describe('persistedPhotoMetrics', () => {
  it('el TECHO no se guarda: sin diagonales el informe no recibe m² ni m³, y LIMPIA lo viejo', () => {
    const metrics = estimateMeasurementMetrics(franjaConQuiebre);
    // En pantalla sigue orientando: S ≤ 9.09 (lo que permiten esos cinco lados).
    expect(metrics.areaFuente).toBe('maximo');
    expect(metrics.area).toBeCloseTo(9.09, 2);

    // `null`, no `undefined`: el consumidor mergea con `??` sobre la foto
    // guardada, y con `undefined` el 17.05 de Globofast sobrevivía a re-medir.
    expect(persistedPhotoMetrics(metrics)).toEqual({ areaM2: null, volumeM3: null });
  });

  it('SIN forma dibujada no opina: el m² tecleado inline en el IAA se conserva', () => {
    const metrics = estimateMeasurementMetrics({ points: [], isClosed: false, imageAspect: 1 });

    expect(metrics.areaFuente).toBeNull();
    expect(persistedPhotoMetrics(metrics)).toEqual({ areaM2: undefined, volumeM3: undefined });
  });

  it('con las diagonales el área es medida, y ESA sí se guarda con su volumen', () => {
    // Dos diagonales desde el vértice a: a→c = √(3.30²+0.65²) y a→d = √(7.40²+0.65²).
    // El quiebre es COLINEAL (3.30 + 4.10 sobre la misma recta), así que el
    // triángulo del medio es casi chato y muy sensible: con las diagonales
    // redondeadas al cm (3.36 / 7.43) Herón da 4.71, no 4.81. Es una limitación
    // real de medir una franja con quiebre: mejor dos rectángulos.
    const metrics = estimateMeasurementMetrics({
      ...franjaConQuiebre,
      diagonals: { 'diag-0': 3.3634, 'diag-1': 7.4285 },
    });

    expect(metrics.areaFuente).toBe('medida');
    const guardado = persistedPhotoMetrics(metrics);
    expect(guardado.areaM2).toBeCloseTo(4.81, 1);
    expect(guardado.volumeM3).toBeCloseTo(4.81 * 0.037, 2);
  });

  it('un rectángulo sin diagonal TAMPOCO se guarda, aunque el techo coincida con lo real', () => {
    // Cuatro lados no determinan el cuadrilátero: el mismo 0.65/7.4/0.65/7.4
    // puede ser un rombo achatado con menos área. Que el techo acierte con el
    // rectángulo es geometría, no una medida — y era el atajo del cubicador.
    const metrics = estimateMeasurementMetrics({
      points: [p('a', 0.56, 0.2), p('b', 0.27, 0.72), p('c', 0.63, 0.75), p('d', 0.71, 0.24)],
      isClosed: true,
      distances: { 'a:b': 0.65, 'b:c': 7.4, 'c:d': 0.65, 'd:a': 7.4 },
      height: 0.037,
      imageAspect: 0.5625,
    });

    expect(metrics.area).toBeCloseTo(4.81, 2); // el techo, correcto por casualidad
    expect(persistedPhotoMetrics(metrics)).toEqual({ areaM2: null, volumeM3: null });
  });

  it('la estimación por cámara (≈) tampoco se guarda', () => {
    const metrics = estimateMeasurementMetrics({
      ...franjaConQuiebre,
      distances: { 'a:b': 0.65, 'b:c': 3.3, 'c:d': 4.1, 'd:e': 0.65 }, // falta un lado → sin techo
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
