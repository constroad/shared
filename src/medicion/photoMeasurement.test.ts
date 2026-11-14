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

    // Triángulo con SÓLO 2 de sus 3 lados cargados: sin el tercero no hay ni
    // área exacta ni techo, así que queda la estimación por cámara — marcada
    // como tal, y con el perímetro también estimado (el lado que falta lo puso
    // la escala, no la wincha).
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
      isClosed: false, // sin cerrar: antes daba area/volume = null ("S = -")
      distances: { 'a:b': 8, 'b:c': 6 },
      height: 2,
    });
    const metrics = estimateMeasurementMetrics(shape);
    expect(metrics.area).toBe(24); // el área ya cierra el contorno (shoelace)
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
 * Al entrar a medir, ¿las herramientas tapan la foto?
 *
 * **El pedido (José, 01/09/2026):** «tengo que seleccionar el icono de medida y
 * después colapsar las herramientas para recién ahí poder trazar; ¿no sería
 * mejor poder trazar directamente?».
 *
 * El panel es `absolute` sobre la foto y arrancaba SIEMPRE abierto, ocupando
 * hasta 62vh: en un celular tapa justo la zona donde hay que tocar. Cada foto
 * costaba un plegado manual antes de empezar.
 *
 * Pero no siempre estorba: al REABRIR una medición ya hecha, lo que el operador
 * viene a ver son los números (lados, altura, espesor), no a dibujar de nuevo.
 * Por eso depende de si ya hay algo trazado.
 */

describe('el área nunca supera lo que los lados permiten', () => {
  // Coordenadas normalizadas del trazo sobre la foto (perspectiva: el lado
  // cercano tiene 42× más píxeles por metro que el lejano).
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
    expect(metrics.volume).toBeCloseTo(24.28, 2); // 24 m³, lo que José dijo que entraba
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
      diagonals: { 'diag-0': 46 }, // del punto 1 al 3
    });

    expect(metrics.areaFuente).toBe('medida');
    expect(relacionArea(metrics.areaFuente)).toBe('=');
    expect(metrics.area).toBeCloseTo(211.14, 2);
    expect(metrics.area).toBeLessThan(metrics.areaMaxima as number);
  });

  it('por qué la diagonal no se puede adivinar: 44 m y 46 m dan áreas MUY distintas', () => {
    const conDiagonal = (largo: number) =>
      estimateMeasurementMetrics({ ...estacionamiento, diagonals: { 'diag-0': largo } }).area;

    // Los mismos cuatro lados y la misma foto: el cuadrilátero es articulado.
    expect(conDiagonal(44)).toBeCloseTo(87.93, 2);
    expect(conDiagonal(46)).toBeCloseTo(211.14, 2);
  });

  it('una diagonal imposible se avisa y NO se convierte en área', () => {
    const metrics = estimateMeasurementMetrics({
      ...estacionamiento,
      diagonals: { 'diag-0': 400 },
    });

    expect(metrics.diagonalesIncoherentes).toBe(true);
    expect(metrics.areaFuente).toBe('maximo'); // se cae al techo, que sigue siendo cierto
    expect(metrics.area).toBeCloseTo(245.22, 2);
  });

  it('cuando la estimación por cámara es lo único que hay, va acotada al techo', () => {
    // Un lado sin cargar: no hay área exacta. La estimación se recorta al techo
    // que permitan los lados que sí están, y jamás lo supera.
    const metrics = estimateMeasurementMetrics(estacionamiento);
    expect(metrics.area as number).toBeLessThanOrEqual(metrics.areaMaxima as number);
  });
});

describe('el aspecto de la foto entra en la geometría', () => {
  // Mismo trazo (un cuadrado en coordenadas normalizadas) sobre una foto
  // vertical 9:16. En la imagen real ese "cuadrado" es un rectángulo:
  // 0.5 de ancho son 0.5×(9/16) de alto. Sin el aspecto se lo trataba como
  // cuadrado y el lado horizontal salía 1.78× más corto de lo que es.
  const trazo = {
    points: [
      { id: 'a', x: 0.25, y: 0.25 },
      { id: 'b', x: 0.75, y: 0.25 },
      { id: 'c', x: 0.75, y: 0.75 },
      { id: 'd', x: 0.25, y: 0.75 },
    ],
    isClosed: true,
    // Sólo el lado vertical medido: el resto lo completa la escala.
    distances: { 'b:c': 16 },
  };

  it('con el aspecto, los lados estimados guardan la proporción real de la foto', () => {
    const edges = buildMeasurementEdges(
      normalizeMeasurementShape({ ...trazo, imageAspect: 9 / 16 })
    );
    const escala = 16 / edges[1].pixelLength;

    // El lado horizontal abarca 0.5 del ancho y el vertical 0.5 del alto:
    // en metros el horizontal tiene que medir 9/16 del vertical.
    expect(edges[0].pixelLength * escala).toBeCloseTo(9, 6);
  });

  it('sin aspecto (mediciones viejas) se comporta como antes: imagen cuadrada', () => {
    const edges = buildMeasurementEdges(normalizeMeasurementShape(trazo));
    const escala = 16 / edges[1].pixelLength;
    expect(edges[0].pixelLength * escala).toBeCloseTo(16, 6);
  });

  it('el área estimada también se corrige, no sólo los largos', () => {
    const conAspecto = estimateMeasurementMetrics({ ...trazo, imageAspect: 9 / 16 });
    const sinAspecto = estimateMeasurementMetrics(trazo);
    expect(conAspecto.area as number).toBeCloseTo(9 * 16, 4);
    expect(sinAspecto.area as number).toBeCloseTo(16 * 16, 4);
  });
});

/**
 * Informes ya capturados: el área guardada se ACOTA al leerla.
 *
 * Los informes anteriores al 05/09/2026 guardaron áreas imposibles. El campo es
 * editable en el canvas, así que no se recalcula (pisaría una corrección a mano):
 * sólo se recorta lo que ningún polígono con esos lados puede encerrar.
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
