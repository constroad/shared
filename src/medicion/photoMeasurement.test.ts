import {
  buildMeasurementEdges,
  createDefaultMeasurementShape,
  estimateMeasurementMetrics,
  normalizeMeasurementShape,
  boundedPhotoArea,
  boundedPhotoVolume,
  relacionArea,
} from './photoMeasurement';

describe('photoMeasurement', () => {
  it('crea lados consecutivos y cierra el poligono cuando corresponde', () => {
    const shape = normalizeMeasurementShape({
      points: [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 1, y: 0 },
        { id: 'c', x: 1, y: 1 },
      ],
      isClosed: true,
      distances: {
        'a:b': 5,
        'b:c': 4,
      },
    });

    expect(buildMeasurementEdges(shape)).toEqual([
      expect.objectContaining({ id: 'a:b', startPointId: 'a', endPointId: 'b', length: 5 }),
      expect.objectContaining({ id: 'b:c', startPointId: 'b', endPointId: 'c', length: 4 }),
      expect.objectContaining({ id: 'c:a', startPointId: 'c', endPointId: 'a', length: null }),
    ]);
  });

  it('estima perimetro, superficie y volumen usando escala promedio', () => {
    const shape = normalizeMeasurementShape({
      points: [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 4, y: 0 },
        { id: 'c', x: 4, y: 3 },
      ],
      isClosed: true,
      distances: {
        'a:b': 8,
        'b:c': 6,
      },
      height: 2,
    });

    // Triangle with ONLY 2 of its 3 sides entered: without the third there is
    // neither an exact area nor a ceiling, so the camera estimate remains,
    // marked as such, and with the perimeter also estimated (the missing side
    // came from the scale, not the tape).
    expect(estimateMeasurementMetrics(shape)).toEqual({
      area: 24,
      areaFuente: 'estimada',
      areaMaxima: null,
      diagonalesIncoherentes: false,
      escuadra: null,
      perimeter: 24,
      perimetroMedido: false,
      volume: 48,
      scale: 2,
      height: 2,
    });
  });

  it('calcula superficie y volumen con la forma ABIERTA (≥3 puntos, sin "Cerrar forma")', () => {
    const shape = normalizeMeasurementShape({
      points: [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 4, y: 0 },
        { id: 'c', x: 4, y: 3 },
      ],
      isClosed: false, // not closed: it used to give area/volume = null ("S = -")
      distances: { 'a:b': 8, 'b:c': 6 },
      height: 2,
    });
    const metrics = estimateMeasurementMetrics(shape);
    expect(metrics.area).toBe(24); // the area already closes the outline (shoelace)
    expect(metrics.volume).toBe(48); // = area * height
  });

  it('mantiene toggles visibles y limpia valores invalidos', () => {
    const shape = normalizeMeasurementShape({
      points: [],
      isClosed: false,
      distances: {
        'a:b': -10,
      },
      height: -1,
      visibleMetrics: {
        surface: false,
        perimeter: true,
        volume: false,
        height: true,
      },
    });

    expect(shape).toEqual({
      ...createDefaultMeasurementShape(),
      distances: {},
      visibleMetrics: {
        surface: false,
        perimeter: true,
        volume: false,
        height: true,
      },
    });
  });

  it('calcula volumen firmado desde espesores del adicional', () => {
    const baseShape = normalizeMeasurementShape({
      points: [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 4, y: 0 },
        { id: 'c', x: 4, y: 3 },
      ],
      isClosed: true,
      distances: {
        'a:b': 8,
        'b:c': 6,
      },
      requestedThicknessCm: 8,
      actualThicknessCm: 5,
      heightDifferenceM: -0.03,
    });

    expect(estimateMeasurementMetrics(baseShape)).toEqual({
      area: 24,
      areaFuente: 'estimada',
      areaMaxima: null,
      diagonalesIncoherentes: false,
      escuadra: null,
      perimeter: 24,
      perimetroMedido: false,
      volume: -0.72,
      scale: 2,
      height: -0.03,
    });
  });

  it('elimina el espesor diferencial al limpiar los valores', () => {
    const shape = normalizeMeasurementShape({
      requestedThicknessCm: null,
      actualThicknessCm: null,
      heightDifferenceM: null,
    });

    expect(shape.requestedThicknessCm).toBeUndefined();
    expect(shape.actualThicknessCm).toBeUndefined();
    expect(shape.heightDifferenceM).toBeUndefined();
  });
});

/**
 * When measuring starts, do the tools cover the photo?
 *
 * **The request (José, 01/09/2026):**
 * «tengo que seleccionar el icono de medida y después colapsar las herramientas para recién ahí poder trazar; ¿no sería mejor poder trazar directamente?».
 *
 * The panel is `absolute` over the photo and always started open, taking up to
 * 62vh: on a phone it covers exactly the area to tap. Every photo cost a manual
 * fold before starting.
 *
 * But it is not always in the way: when REOPENING a finished measurement, the
 * operator comes to see the numbers (sides, height, thickness), not to draw
 * again. So it depends on whether something is already drawn.
 */

describe('el área nunca supera lo que los lados permiten', () => {
  // Normalized coordinates of the drawing on the photo (perspective: the near
  // side has 42× more pixels per meter than the far one).
  const estacionamiento = normalizeMeasurementShape({
    points: [
      { id: 'a', x: 0.4937, y: 0.4063 },
      { id: 'b', x: 0.6695, y: 0.3992 },
      { id: 'c', x: 0.9205, y: 0.6863 },
      { id: 'd', x: 0.0864, y: 0.709 },
    ],
    isClosed: true,
    distances: { 'a:b': 9.05, 'b:c': 52.7, 'c:d': 2.7, 'd:a': 46.4 },
    height: 0.099,
  });

  it('sin diagonal muestra el TECHO medido, no los 745 m² de la cámara', () => {
    const metrics = estimateMeasurementMetrics(estacionamiento);

    expect(metrics.areaFuente).toBe('maximo');
    expect(metrics.area).toBeCloseTo(245.22, 2);
    expect(metrics.volume).toBeCloseTo(24.28, 2); // 24 m³, what José said went in
    expect(relacionArea(metrics.areaFuente)).toBe('≤');
  });

  it('el perímetro sí es exacto: los cuatro lados salen de la wincha', () => {
    const metrics = estimateMeasurementMetrics(estacionamiento);
    expect(metrics.perimeter).toBeCloseTo(110.85, 2);
    expect(metrics.perimetroMedido).toBe(true);
  });

  it('con la diagonal el área pasa a ser exacta y baja del techo', () => {
    const metrics = estimateMeasurementMetrics({
      ...estacionamiento,
      diagonals: { 'diag-0': 46 }, // from point 1 to 3
    });

    expect(metrics.areaFuente).toBe('medida');
    expect(relacionArea(metrics.areaFuente)).toBe('=');
    expect(metrics.area).toBeCloseTo(211.14, 2);
    expect(metrics.area).toBeLessThan(metrics.areaMaxima as number);
  });

  it('por qué la diagonal no se puede adivinar: 44 m y 46 m dan áreas MUY distintas', () => {
    const withDiagonal = (largo: number) =>
      estimateMeasurementMetrics({ ...estacionamiento, diagonals: { 'diag-0': largo } }).area;

    // Same four sides and same photo: the quadrilateral is hinged.
    expect(withDiagonal(44)).toBeCloseTo(87.93, 2);
    expect(withDiagonal(46)).toBeCloseTo(211.14, 2);
  });

  it('una diagonal imposible se avisa y NO se convierte en área', () => {
    const metrics = estimateMeasurementMetrics({
      ...estacionamiento,
      diagonals: { 'diag-0': 400 },
    });

    expect(metrics.diagonalesIncoherentes).toBe(true);
    expect(metrics.areaFuente).toBe('maximo'); // falls back to the ceiling, which still holds
    expect(metrics.area).toBeCloseTo(245.22, 2);
  });

  it('cuando la estimación por cámara es lo único que hay, va acotada al techo', () => {
    // One side not entered: no exact area. The estimate is cut to the ceiling
    // the entered sides allow, and never exceeds it.
    const metrics = estimateMeasurementMetrics(estacionamiento);
    expect(metrics.area as number).toBeLessThanOrEqual(metrics.areaMaxima as number);
  });
});

describe('el aspecto de la foto entra en la geometría', () => {
  // Same drawing (a square in normalized coordinates) on a 9:16 portrait
  // photo. In the real image that "square" is a rectangle: 0.5 of the width
  // is 0.5×(9/16) of the height. Without the aspect it was treated as a square
  // and the horizontal side came out 1.78× shorter than it is.
  const trazo = {
    points: [
      { id: 'a', x: 0.25, y: 0.25 },
      { id: 'b', x: 0.75, y: 0.25 },
      { id: 'c', x: 0.75, y: 0.75 },
      { id: 'd', x: 0.25, y: 0.75 },
    ],
    isClosed: true,
    // Only the vertical side measured: the scale fills in the rest.
    distances: { 'b:c': 16 },
  };

  it('con el aspecto, los lados estimados guardan la proporción real de la foto', () => {
    const edges = buildMeasurementEdges(
      normalizeMeasurementShape({ ...trazo, imageAspect: 9 / 16 })
    );
    const escala = 16 / edges[1].pixelLength;

    // The horizontal side spans 0.5 of the width and the vertical 0.5 of the
    // height: in meters the horizontal must measure 9/16 of the vertical.
    expect(edges[0].pixelLength * escala).toBeCloseTo(9, 6);
  });

  it('sin aspecto (mediciones viejas) se comporta como antes: imagen cuadrada', () => {
    const edges = buildMeasurementEdges(normalizeMeasurementShape(trazo));
    const escala = 16 / edges[1].pixelLength;
    expect(edges[0].pixelLength * escala).toBeCloseTo(16, 6);
  });

  it('el área estimada también se corrige, no sólo los largos', () => {
    const withAspect = estimateMeasurementMetrics({ ...trazo, imageAspect: 9 / 16 });
    const withoutAspect = estimateMeasurementMetrics(trazo);
    expect(withAspect.area as number).toBeCloseTo(9 * 16, 4);
    expect(withoutAspect.area as number).toBeCloseTo(16 * 16, 4);
  });
});

/**
 * Reports already captured: the stored area is BOUNDED when read.
 *
 * Reports before 05/09/2026 stored impossible areas. The field is editable on
 * the canvas, so it is not recomputed (it would overwrite a hand correction):
 * only what no polygon with those sides can enclose is cut.
 */

describe('boundedPhotoArea / boundedPhotoVolume', () => {
  const measurement = {
    points: [
      { id: 'a', x: 0.4937, y: 0.4063 },
      { id: 'b', x: 0.6695, y: 0.3992 },
      { id: 'c', x: 0.9205, y: 0.6863 },
      { id: 'd', x: 0.0864, y: 0.709 },
    ],
    isClosed: true,
    distances: { 'a:b': 9.05, 'b:c': 52.7, 'c:d': 2.7, 'd:a': 46.4 },
    height: 0.099,
  };

  it('recorta el 745 guardado al techo de esos lados, y el volumen en la misma proporción', () => {
    const photo = { areaM2: 745, volumeM3: 73.755, measurement };
    expect(boundedPhotoArea(photo)).toBeCloseTo(245.22, 2);
    expect(boundedPhotoVolume(photo)).toBeCloseTo(24.28, 2);
  });

  it('un valor corregido a mano queda intacto: sólo puede bajar, nunca subir', () => {
    const photo = { areaM2: 180, volumeM3: 17.82, measurement };
    expect(boundedPhotoArea(photo)).toBe(180);
    expect(boundedPhotoVolume(photo)).toBe(17.82);
  });

  it('sin medición guardada no hay techo: se respeta lo que haya', () => {
    expect(boundedPhotoArea({ areaM2: 745 })).toBe(745);
    expect(boundedPhotoVolume({ areaM2: 745, volumeM3: 73.75 })).toBe(73.75);
  });

  it('sin valor guardado devuelve null, no 0 (un 0 sumaría al cuadro como medida)', () => {
    expect(boundedPhotoArea({ measurement })).toBeNull();
    expect(boundedPhotoVolume({ measurement })).toBeNull();
  });
});
