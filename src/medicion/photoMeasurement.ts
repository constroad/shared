import { areaMaximaPorLados, areaPorTriangulacion, diagonalesNecesarias } from './areaMedida';
import { areaEscuadra, type AreaEscuadra } from './areaEscuadra';
import { arCaptureMetrics, normalizeArCapture, type ArCapture } from './arCapture';
export type MeasurementMetricKey = 'surface' | 'perimeter' | 'volume' | 'height';

export interface MeasurementPoint {
  id: string;
  x: number;
  y: number;
}

export interface MeasurementLabelOffset {
  x: number;
  y: number;
}

export interface MeasurementShape {
  points: MeasurementPoint[];
  isClosed: boolean;
  distances: Record<string, number | null | undefined>;
  /** Largos de las diagonales del abanico desde el 1er vértice: `diag-0` va al
   *  3er vértice, `diag-1` al 4to… Sin ellas el área de un cuadrilátero es
   *  ambigua (ver `areaMedida.ts`). */
  diagonals?: Record<string, number | null | undefined>;
  labelOffsets: Record<string, MeasurementLabelOffset | undefined>;
  /**
   * Ancho/alto de la foto. Los puntos se guardan normalizados 0..1 en CADA eje
   * por separado, así que sin este dato la geometría se calcula sobre una imagen
   * cuadrada: en una foto de celular (9:16) un metro horizontal mide 1.78× menos
   * que uno vertical, y de ahí salían escalas y largos estimados torcidos. Las
   * mediciones viejas no lo tienen → 1, el comportamiento anterior.
   */
  imageAspect?: number;
  /**
   * Modo A ESCUADRA: el usuario afirma que las esquinas son de 90°. Con eso los
   * lados determinan el polígono sin diagonales (`areaEscuadra.ts`). Solo se
   * guarda cuando es `true`, para no cambiar la firma de las mediciones viejas.
   */
  aEscuadra?: boolean;
  height: number | null;
  requestedThicknessCm?: number | null;
  actualThicknessCm?: number | null;
  heightDifferenceM?: number | null;
  /** What the APK measured with AR (`arCapture.ts`). With it, the area comes from the plan, not from the photo. */
  ar?: ArCapture;
  visibleMetrics: Record<MeasurementMetricKey, boolean>;
}

export interface MeasurementEdge {
  id: string;
  startPointId: string;
  endPointId: string;
  start: MeasurementPoint;
  end: MeasurementPoint;
  pixelLength: number;
  length: number | null;
}

/**
 * De dónde salió el número, que es lo que decide si se puede facturar:
 * - `medida`: de los largos y diagonales con wincha, por Herón. **Exacta.**
 * - `escuadra`: de los largos, bajo la premisa de esquinas a 90° que activó el
 *   usuario. Exacta si la premisa es cierta; el cierre la verifica.
 * - `maximo`: los lados están medidos pero falta la diagonal, así que el área
 *   no queda determinada. Se muestra el TECHO geométrico (`≤`), que también sale
 *   de la wincha y nunca miente por arriba.
 * - `estimada`: no alcanza para ninguna de las dos y se cae a la escala en
 *   píxeles, que la perspectiva distorsiona (se muestra con `≈`).
 * - `ar+wincha`: la planta del AR del APK con su escala fijada por la wincha. **Exacta.**
 * - `ar`: la planta del AR sin wincha; el SLAM deriva 1–5 %, así que es estimada (`≈`).
 */
export type AreaFuente = 'medida' | 'escuadra' | 'maximo' | 'estimada' | 'ar+wincha' | 'ar';

export interface MeasurementMetrics {
  area: number | null;
  areaFuente: AreaFuente | null;
  /** Techo geométrico de los lados medidos. Ninguna área mostrada lo supera. */
  areaMaxima: number | null;
  /** Los largos cargados no cierran: alguna medida está mal tipeada. */
  diagonalesIncoherentes: boolean;
  /** Resultado del modo a escuadra; `null` si no está activo o la forma no cierra. */
  escuadra: AreaEscuadra | null;
  perimeter: number | null;
  /** `false` si algún lado no se midió y su largo lo puso la cámara. */
  perimetroMedido: boolean;
  volume: number | null;
  scale: number | null;
  height: number | null;
}

/** Cómo se relaciona el número mostrado con la realidad. */
export const relacionArea = (fuente: AreaFuente | null): '=' | '≤' | '≈' =>
  fuente === 'maximo' ? '≤' : fuente === 'estimada' || fuente === 'ar' ? '≈' : '=';

interface CoordinatePoint {
  x: number;
  y: number;
}

const DEFAULT_VISIBLE_METRICS: Record<MeasurementMetricKey, boolean> = {
  surface: true,
  perimeter: true,
  volume: false,
  height: false,
};

const CENTIMETERS_PER_METER = 100;

export const createDefaultMeasurementShape = (): MeasurementShape => ({
  points: [],
  isClosed: false,
  distances: {},
  diagonals: {},
  labelOffsets: {},
  height: null,
  visibleMetrics: { ...DEFAULT_VISIBLE_METRICS },
});

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
};

const normalizeNonNegativeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const normalizeSignedNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const calculateThicknessDifferenceM = (
  requestedThicknessCm: number | null,
  actualThicknessCm: number | null
): number | null => {
  if (requestedThicknessCm === null || actualThicknessCm === null) return null;
  return (actualThicknessCm - requestedThicknessCm) / CENTIMETERS_PER_METER;
};

export const buildEdgeId = (startPointId: string, endPointId: string) =>
  `${startPointId}:${endPointId}`;

export const normalizeMeasurementShape = (input?: Partial<MeasurementShape> | null): MeasurementShape => {
  const next = createDefaultMeasurementShape();

  const rawPoints = Array.isArray(input?.points) ? input?.points : [];
  next.points = rawPoints
    .filter((point): point is MeasurementPoint => Boolean(point?.id))
    .map((point) => ({
      id: String(point.id),
      x: Number.isFinite(Number(point.x)) ? Number(point.x) : 0,
      y: Number.isFinite(Number(point.y)) ? Number(point.y) : 0,
    }));

  next.isClosed = Boolean(input?.isClosed) && next.points.length >= 3;

  const rawDistances = input?.distances ?? {};
  next.distances = Object.entries(rawDistances).reduce<Record<string, number>>((acc, [edgeId, rawValue]) => {
    const value = normalizeNumber(rawValue);
    if (value !== null) {
      acc[edgeId] = value;
    }
    return acc;
  }, {});

  // Las diagonales se normalizan igual que los lados: sin ellas el área de un
  // cuadrilátero es ambigua, así que un valor basura tiene que desaparecer, no
  // colarse como medida.
  const rawDiagonals = input?.diagonals ?? {};
  next.diagonals = Object.entries(rawDiagonals).reduce<Record<string, number>>((acc, [id, rawValue]) => {
    const value = normalizeNumber(rawValue);
    if (value !== null) acc[id] = value;
    return acc;
  }, {});

  const rawLabelOffsets = input?.labelOffsets ?? {};
  next.labelOffsets = Object.entries(rawLabelOffsets).reduce<Record<string, MeasurementLabelOffset>>((acc, [edgeId, rawValue]) => {
    if (!rawValue || typeof rawValue !== 'object') return acc;
    const offset = rawValue as Partial<MeasurementLabelOffset>;
    const x = Number(offset.x);
    const y = Number(offset.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      acc[edgeId] = {
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
      };
    }
    return acc;
  }, {});

  const imageAspect = normalizeNumber(input?.imageAspect);
  if (imageAspect !== null) next.imageAspect = imageAspect;
  if (input?.aEscuadra === true) next.aEscuadra = true;

  next.height = normalizeNumber(input?.height);
  const requestedThicknessCm = normalizeNonNegativeNumber(input?.requestedThicknessCm);
  const actualThicknessCm = normalizeNonNegativeNumber(input?.actualThicknessCm);
  const heightDifferenceM = normalizeSignedNumber(input?.heightDifferenceM);
  if (requestedThicknessCm !== null) next.requestedThicknessCm = requestedThicknessCm;
  if (actualThicknessCm !== null) next.actualThicknessCm = actualThicknessCm;
  if (heightDifferenceM !== null) next.heightDifferenceM = heightDifferenceM;
  const ar = normalizeArCapture(input?.ar);
  if (ar) next.ar = ar;
  next.visibleMetrics = {
    surface: input?.visibleMetrics?.surface ?? DEFAULT_VISIBLE_METRICS.surface,
    perimeter: input?.visibleMetrics?.perimeter ?? DEFAULT_VISIBLE_METRICS.perimeter,
    volume: input?.visibleMetrics?.volume ?? DEFAULT_VISIBLE_METRICS.volume,
    height: input?.visibleMetrics?.height ?? DEFAULT_VISIBLE_METRICS.height,
  };

  return next;
};

/**
 * Toda la geometría se hace en "unidades de alto de foto": x se multiplica por
 * el aspecto para que un paso horizontal y uno vertical midan lo mismo. Sin esto
 * la imagen se trata como cuadrada y las distancias salen anisotrópicas.
 */
const getPixelLength = (start: MeasurementPoint, end: MeasurementPoint, aspect: number) =>
  Math.hypot((end.x - start.x) * aspect, end.y - start.y);

const shapeAspect = (shape: MeasurementShape) =>
  shape.imageAspect && shape.imageAspect > 0 ? shape.imageAspect : 1;

export const buildMeasurementEdges = (shape: MeasurementShape): MeasurementEdge[] => {
  const edges: MeasurementEdge[] = [];
  const aspect = shapeAspect(shape);

  for (let index = 0; index < shape.points.length - 1; index += 1) {
    const start = shape.points[index];
    const end = shape.points[index + 1];
    const id = buildEdgeId(start.id, end.id);
    edges.push({
      id,
      startPointId: start.id,
      endPointId: end.id,
      start,
      end,
      pixelLength: getPixelLength(start, end, aspect),
      length: normalizeNumber(shape.distances[id]),
    });
  }

  if (shape.isClosed && shape.points.length >= 3) {
    const start = shape.points[shape.points.length - 1];
    const end = shape.points[0];
    const id = buildEdgeId(start.id, end.id);
    edges.push({
      id,
      startPointId: start.id,
      endPointId: end.id,
      start,
      end,
      pixelLength: getPixelLength(start, end, aspect),
      length: normalizeNumber(shape.distances[id]),
    });
  }

  return edges;
};

const calculateSignedArea = (points: MeasurementPoint[]) => {
  if (points.length < 3) return 0;

  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
};

const calculateSignedAreaFromCoordinates = (points: CoordinatePoint[]) => {
  if (points.length < 3) return 0;

  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
};

const reconstructAdjustedPolygon = (
  edges: MeasurementEdge[],
  scale: number | null,
  aspect: number
): CoordinatePoint[] | null => {
  if (edges.length === 0 || scale === null) return null;

  const resolvedSegments = edges.map((edge) => {
    const resolvedLength = edge.length ?? edge.pixelLength * scale;
    if (!Number.isFinite(resolvedLength) || resolvedLength <= 0 || edge.pixelLength <= 0) {
      return null;
    }

    return {
      length: resolvedLength,
      dx: (((edge.end.x - edge.start.x) * aspect) / edge.pixelLength) * resolvedLength,
      dy: ((edge.end.y - edge.start.y) / edge.pixelLength) * resolvedLength,
    };
  });

  if (resolvedSegments.some((segment) => segment === null)) {
    return null;
  }

  const segments = resolvedSegments as Array<{ length: number; dx: number; dy: number }>;
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (totalLength <= 0) return null;

  const closureError = segments.reduce(
    (acc, segment) => ({
      x: acc.x + segment.dx,
      y: acc.y + segment.dy,
    }),
    { x: 0, y: 0 }
  );

  const adjustedSegments = segments.map((segment) => ({
    dx: segment.dx - (closureError.x * segment.length) / totalLength,
    dy: segment.dy - (closureError.y * segment.length) / totalLength,
  }));

  const coordinates: CoordinatePoint[] = [{ x: 0, y: 0 }];

  adjustedSegments.forEach((segment) => {
    const previous = coordinates[coordinates.length - 1];
    coordinates.push({
      x: previous.x + segment.dx,
      y: previous.y + segment.dy,
    });
  });

  return coordinates.slice(0, -1);
};

/** A photo measured with AR: the plan fitted by the tape decides; the photo's points are only the drawing. */
const arMeasurementMetrics = (capture: ArCapture, fallbackHeight: number | null): MeasurementMetrics => {
  const measured = arCaptureMetrics(capture);
  const height = measured.thicknessM ?? fallbackHeight;
  return {
    area: measured.area,
    areaFuente: measured.source,
    areaMaxima: measured.area,
    diagonalesIncoherentes: false,
    escuadra: null,
    perimeter: measured.perimeter,
    perimetroMedido: measured.source === 'ar+wincha',
    volume: measured.area !== null && height !== null ? measured.area * height : null,
    scale: null,
    height,
  };
};

export const estimateMeasurementMetrics = (input?: Partial<MeasurementShape> | null): MeasurementMetrics => {
  const shape = normalizeMeasurementShape(input);
  const volumeHeight = shape.heightDifferenceM ?? shape.height;
  if (shape.ar) return arMeasurementMetrics(shape.ar, volumeHeight);
  const aspect = shapeAspect(shape);
  const edges = buildMeasurementEdges(shape);

  if (edges.length === 0) {
    return {
      area: null,
      areaFuente: null,
      areaMaxima: null,
      diagonalesIncoherentes: false,
      escuadra: null,
      perimeter: null,
      perimetroMedido: false,
      volume: null,
      scale: null,
      height: volumeHeight,
    };
  }

  const resolvedScales = edges
    .filter((edge) => edge.length !== null && edge.pixelLength > 0)
    .map((edge) => (edge.length as number) / edge.pixelLength);
  const scale = resolvedScales.length > 0
    ? resolvedScales.reduce((sum, current) => sum + current, 0) / resolvedScales.length
    : null;

  const perimetroMedido = edges.every((edge) => edge.length !== null);
  const perimeter = scale === null
    ? null
    : edges.reduce((sum, edge) => {
        const resolvedLength = edge.length ?? edge.pixelLength * scale;
        return sum + resolvedLength;
      }, 0);

  // El área (y el volumen) se calculan con ≥3 puntos: la fórmula del área ya
  // cierra el contorno (último→primer punto), así que el operador ve la superficie
  // SIN tener que pulsar "Cerrar forma" (era el motivo de "S = -"). El refinamiento
  // por largos ingresados (`adjustedArea`) sí requiere el contorno cerrado.
  const canComputeArea = shape.points.length >= 3;
  // El aspecto entra una vez: estirar x por el aspecto multiplica el área por él.
  const projectedPixelArea = canComputeArea
    ? Math.abs(calculateSignedArea(shape.points)) * aspect
    : 0;
  const projectedArea = scale === null || !canComputeArea
    ? null
    : projectedPixelArea * scale * scale;
  const adjustedPolygon = shape.isClosed ? reconstructAdjustedPolygon(edges, scale, aspect) : null;
  const adjustedArea = !shape.isClosed || !adjustedPolygon
    ? null
    : Math.abs(calculateSignedAreaFromCoordinates(adjustedPolygon));
  // **El área MEDIDA gana siempre.** Sale de los largos con wincha por Herón:
  // es exacta y no pasa por la cámara. Las de abajo estiman con una escala en
  // píxeles única para toda la foto, que la perspectiva distorsiona — de ahí que
  // el número saliera "recontra impreciso" (José, 01/09/2026).
  const lados = edges.map((edge) => edge.length);
  const medida = shape.isClosed
    ? areaPorTriangulacion(lados, diagonalLengths(shape))
    : { estado: 'faltan-datos' as const, area: null };

  // Techo geométrico de los lados medidos: ningún polígono con esos largos
  // encierra más. Es el que impide que vuelva a salir un número imposible.
  const areaMaxima = shape.isClosed ? areaMaximaPorLados(lados) : null;

  // La estimación por cámara respeta al menos los largos cargados
  // (`adjustedArea`); `projectedArea` aplica UNA escala promedio a toda la foto
  // y en perspectiva se va por un factor de 3 (05/09/2026: 746 m² sobre un techo
  // de 245). Es el último recurso, nunca el preferido: antes se tomaba el MÁXIMO
  // de las dos, que es justo elegir la peor.
  const estimada = adjustedArea ?? projectedArea;
  const estimadaAcotada = estimada === null
    ? null
    : areaMaxima === null
      ? estimada
      : Math.min(estimada, areaMaxima);

  // A escuadra: esquinas a 90° afirmadas por el usuario. Los lados bastan y el
  // cierre de la poligonal verifica la premisa (incidente Globofast, 30/09/2026).
  const escuadra = shape.aEscuadra && shape.isClosed
    ? areaEscuadra({ points: shape.points, lados, aspect })
    : null;
  const areaEscuadraOk = escuadra?.estado === 'medida' ? escuadra.area : null;

  // Orden: lo medido con diagonales, lo medido a escuadra, el techo, y sólo al
  // final la cámara.
  const area = medida.estado === 'medida'
    ? medida.area
    : areaEscuadraOk !== null
      ? areaEscuadraOk
      : areaMaxima !== null
        ? areaMaxima
        : estimadaAcotada;
  const areaFuente: AreaFuente | null =
    medida.estado === 'medida'
      ? 'medida'
      : areaEscuadraOk !== null
        ? 'escuadra'
        : areaMaxima !== null
          ? 'maximo'
          : area === null
            ? null
            : 'estimada';

  const volume = area !== null && volumeHeight !== null ? area * volumeHeight : null;

  return {
    area,
    areaFuente,
    areaMaxima,
    // Largos que no cierran: se avisa. Callarlo dejaría pasar por buena un área
    // sacada de medidas imposibles.
    diagonalesIncoherentes: medida.estado === 'incoherente',
    escuadra,
    perimeter,
    perimetroMedido,
    volume,
    scale,
    height: volumeHeight,
  };
};

/**
 * El área/volumen GUARDADOS de una foto, acotados por lo que sus propios lados
 * permiten.
 *
 * Cada foto guarda `areaM2`/`volumeM3` calculados en el momento de subirla, y el
 * cuadro de metrado del informe los SUMA. Los informes que se capturaron antes
 * del 05/09/2026 tienen ahí números imposibles (745 m² sobre un techo de 245) y
 * un PDF viejo se contradiría a sí mismo: la foto muestra `S ≤ 245.22` y el pie
 * dice 745.00.
 *
 * Se acota, no se recalcula: el campo es EDITABLE en el canvas, así que un valor
 * corregido a mano —que siempre queda por debajo del techo— no se toca. Esto sólo
 * puede BAJAR un número, y sólo cuando es geométricamente imposible.
 */
export const boundedPhotoArea = (photo: {
  areaM2?: number | null;
  measurement?: Partial<MeasurementShape> | null;
}): number | null => {
  const stored = typeof photo.areaM2 === 'number' && Number.isFinite(photo.areaM2) ? photo.areaM2 : null;
  if (stored === null || !photo.measurement) return stored;
  const { areaMaxima } = estimateMeasurementMetrics(photo.measurement);
  return areaMaxima !== null && stored > areaMaxima ? areaMaxima : stored;
};

/** Igual que `boundedPhotoArea`, con el mismo recorte aplicado al volumen. */
export const boundedPhotoVolume = (photo: {
  areaM2?: number | null;
  volumeM3?: number | null;
  measurement?: Partial<MeasurementShape> | null;
}): number | null => {
  const stored =
    typeof photo.volumeM3 === 'number' && Number.isFinite(photo.volumeM3) ? photo.volumeM3 : null;
  if (stored === null || !photo.measurement) return stored;
  const acotada = boundedPhotoArea(photo);
  if (acotada === null || acotada === photo.areaM2) return stored;
  // El volumen es área × espesor: si el área se recortó, el volumen se recorta
  // en la misma proporción (conserva el espesor, que sí se midió).
  const factor = acotada / (photo.areaM2 as number);
  return Number.isFinite(factor) && factor > 0 ? stored * factor : stored;
};

/** Diagonales del abanico, en el orden que espera `areaPorTriangulacion`. */
export const diagonalLengths = (shape: MeasurementShape): Array<number | null> => {
  const necesarias = diagonalesNecesarias(shape.points.length);
  if (!necesarias) return [];
  return Array.from({ length: necesarias }, (_, index) =>
    normalizeNumber(shape.diagonals?.[buildDiagonalId(index)])
  );
};

/** `diag-0` es la diagonal del 1er vértice al 3ro, `diag-1` al 4to, etc. */
export const buildDiagonalId = (index: number): string => `diag-${index}`;
