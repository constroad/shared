import { maxAreaFromSides, areaByTriangulation, diagonalesNecesarias, type AreaMedida } from './areaMedida';
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
  /** Lengths of the fan diagonals from the 1st vertex: `diag-0` goes to the
   *  3rd vertex, `diag-1` to the 4th… Without them a quadrilateral's area is
   *  ambiguous (see `areaMedida.ts`). */
  diagonals?: Record<string, number | null | undefined>;
  labelOffsets: Record<string, MeasurementLabelOffset | undefined>;
  /**
   * Photo width/height. Points are stored normalized 0..1 on EACH axis
   * separately, so without this value the geometry is computed on a square
   * image: on a phone photo (9:16) a horizontal meter measures 1.78× less than
   * a vertical one, which skewed the estimated scales and lengths. Old
   * measurements lack it → 1, the previous behavior.
   */
  imageAspect?: number;
  /**
   * A ESCUADRA mode: the user states that the corners are 90°. With that the
   * sides determine the polygon without diagonals (`areaEscuadra.ts`). Stored
   * only when `true`, so old measurements keep their signature.
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
 * Where the number came from, which decides whether it can be billed:
 * - `medida`: from the tape lengths and diagonals, by Heron. **Exact.**
 * - `escuadra`: from the lengths, under the 90° corner premise the user turned
 *   on. Exact if the premise holds; the closure checks it.
 * - `maximo`: the sides are measured but the diagonal is missing, so the area
 *   is not determined. The geometric CEILING (`≤`) is shown; it also comes from
 *   the tape and never errs on the high side.
 * - `estimada`: there is not enough for either, so it falls back to the pixel
 *   scale, which perspective distorts (shown with `≈`).
 * - `ar+wincha`: the APK's AR plan with its scale fixed by the tape. **Exact.**
 * - `ar`: the AR plan without the tape; SLAM drifts 1–5 %, so it is an estimate (`≈`).
 */
export type AreaFuente = 'medida' | 'escuadra' | 'maximo' | 'estimada' | 'ar+wincha' | 'ar';

export interface MeasurementMetrics {
  area: number | null;
  areaFuente: AreaFuente | null;
  /** Geometric ceiling of the measured sides. No displayed area exceeds it. */
  areaMaxima: number | null;
  /** The entered lengths do not close: some measurement is mistyped. */
  diagonalesIncoherentes: boolean;
  /** Result of the a escuadra mode; `null` if it is off or the shape is not closed. */
  escuadra: AreaEscuadra | null;
  perimeter: number | null;
  /** `false` if some side was not measured and the camera set its length. */
  perimetroMedido: boolean;
  volume: number | null;
  scale: number | null;
  height: number | null;
}

/** How the displayed number relates to reality. */
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

const normalizePoints = (rawPoints: MeasurementPoint[] | undefined): MeasurementPoint[] =>
  (Array.isArray(rawPoints) ? rawPoints : [])
    .filter((point): point is MeasurementPoint => Boolean(point?.id))
    .map((point) => ({
      id: String(point.id),
      x: Number.isFinite(Number(point.x)) ? Number(point.x) : 0,
      y: Number.isFinite(Number(point.y)) ? Number(point.y) : 0,
    }));

/**
 * Keeps only the valid positive lengths. Diagonals go through it like the sides:
 * without them a quadrilateral's area is ambiguous, so a garbage value has to
 * disappear, not slip in as a measurement.
 */
const normalizeLengths = (rawLengths: Record<string, unknown> | undefined): Record<string, number> =>
  Object.entries(rawLengths ?? {}).reduce<Record<string, number>>((acc, [id, rawValue]) => {
    const value = normalizeNumber(rawValue);
    if (value !== null) acc[id] = value;
    return acc;
  }, {});

const normalizeLabelOffsets = (rawLabelOffsets: Record<string, unknown> | undefined): Record<string, MeasurementLabelOffset> =>
  Object.entries(rawLabelOffsets ?? {}).reduce<Record<string, MeasurementLabelOffset>>((acc, [edgeId, rawValue]) => {
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

/** Copies the thickness readings that parse; a missing one stays absent. */
const applyThicknessReadings = (target: MeasurementShape, input?: Partial<MeasurementShape> | null): void => {
  const requested = normalizeNonNegativeNumber(input?.requestedThicknessCm);
  const measured = normalizeNonNegativeNumber(input?.actualThicknessCm);
  const heightDifference = normalizeSignedNumber(input?.heightDifferenceM);
  if (requested !== null) target.requestedThicknessCm = requested;
  if (measured !== null) target.actualThicknessCm = measured;
  if (heightDifference !== null) target.heightDifferenceM = heightDifference;
};

const normalizeVisibleMetrics = (
  raw: Partial<Record<MeasurementMetricKey, boolean>> | undefined
): Record<MeasurementMetricKey, boolean> => ({
  surface: raw?.surface ?? DEFAULT_VISIBLE_METRICS.surface,
  perimeter: raw?.perimeter ?? DEFAULT_VISIBLE_METRICS.perimeter,
  volume: raw?.volume ?? DEFAULT_VISIBLE_METRICS.volume,
  height: raw?.height ?? DEFAULT_VISIBLE_METRICS.height,
});

export const normalizeMeasurementShape = (input?: Partial<MeasurementShape> | null): MeasurementShape => {
  const shape = createDefaultMeasurementShape();
  shape.points = normalizePoints(input?.points);
  shape.isClosed = Boolean(input?.isClosed) && shape.points.length >= 3;
  shape.distances = normalizeLengths(input?.distances);
  shape.diagonals = normalizeLengths(input?.diagonals);
  shape.labelOffsets = normalizeLabelOffsets(input?.labelOffsets);

  const imageAspect = normalizeNumber(input?.imageAspect);
  if (imageAspect !== null) shape.imageAspect = imageAspect;
  if (input?.aEscuadra === true) shape.aEscuadra = true;

  shape.height = normalizeNumber(input?.height);
  applyThicknessReadings(shape, input);
  const ar = normalizeArCapture(input?.ar);
  if (ar) shape.ar = ar;
  shape.visibleMetrics = normalizeVisibleMetrics(input?.visibleMetrics);
  return shape;
};

/**
 * All geometry is done in "photo height units": x is multiplied by the aspect
 * so a horizontal and a vertical step measure the same. Without this the image
 * is treated as square and distances come out anisotropic.
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

const emptyMetrics = (height: number | null): MeasurementMetrics => ({
  area: null,
  areaFuente: null,
  areaMaxima: null,
  diagonalesIncoherentes: false,
  escuadra: null,
  perimeter: null,
  perimetroMedido: false,
  volume: null,
  scale: null,
  height,
});

/** Average meters per pixel over the edges whose length was measured. */
const averageScale = (edges: MeasurementEdge[]): number | null => {
  const resolvedScales = edges
    .filter((edge) => edge.length !== null && edge.pixelLength > 0)
    .map((edge) => (edge.length as number) / edge.pixelLength);
  return resolvedScales.length > 0
    ? resolvedScales.reduce((sum, current) => sum + current, 0) / resolvedScales.length
    : null;
};

const resolvedPerimeter = (edges: MeasurementEdge[], scale: number | null): number | null =>
  scale === null
    ? null
    : edges.reduce((sum, edge) => {
        const resolvedLength = edge.length ?? edge.pixelLength * scale;
        return sum + resolvedLength;
      }, 0);

/**
 * The camera estimate. It at least respects the entered lengths (adjusted
 * polygon, closed shapes only); the projected area applies ONE average scale to
 * the whole photo and in perspective goes off by a factor of 3 (05/09/2026:
 * 746 m² over a ceiling of 245). It is the last resort, never the preferred
 * one: it used to take the MAXIMUM of the two, which is picking the worst.
 *
 * The projected area needs only ≥3 points: the area formula already closes the
 * outline (last→first point), so the operator sees the surface WITHOUT pressing
 * "Cerrar forma" (that was the reason for "S = -").
 */
const cameraEstimate = (shape: MeasurementShape, edges: MeasurementEdge[], scale: number | null, aspect: number): number | null => {
  if (scale === null) return null;
  const adjustedPolygon = shape.isClosed ? reconstructAdjustedPolygon(edges, scale, aspect) : null;
  if (adjustedPolygon) return Math.abs(calculateSignedAreaFromCoordinates(adjustedPolygon));
  if (shape.points.length < 3) return null;
  // The aspect enters once: stretching x by the aspect multiplies the area by it.
  return Math.abs(calculateSignedArea(shape.points)) * aspect * scale * scale;
};

const boundByCeiling = (estimate: number | null, ceiling: number | null): number | null => {
  if (estimate === null) return null;
  return ceiling === null ? estimate : Math.min(estimate, ceiling);
};

interface AreaCandidates {
  measured: AreaMedida;
  escuadra: number | null;
  ceiling: number | null;
  estimate: number | null;
}

/** Order: measured with diagonals, measured a escuadra, the ceiling, and only last the camera. */
const pickArea = (candidates: AreaCandidates): { area: number | null; areaFuente: AreaFuente | null } => {
  if (candidates.measured.estado === 'medida') return { area: candidates.measured.area, areaFuente: 'medida' };
  if (candidates.escuadra !== null) return { area: candidates.escuadra, areaFuente: 'escuadra' };
  if (candidates.ceiling !== null) return { area: candidates.ceiling, areaFuente: 'maximo' };
  return { area: candidates.estimate, areaFuente: candidates.estimate === null ? null : 'estimada' };
};

export const estimateMeasurementMetrics = (input?: Partial<MeasurementShape> | null): MeasurementMetrics => {
  const shape = normalizeMeasurementShape(input);
  const volumeHeight = shape.heightDifferenceM ?? shape.height;
  if (shape.ar) return arMeasurementMetrics(shape.ar, volumeHeight);
  const edges = buildMeasurementEdges(shape);
  if (edges.length === 0) return emptyMetrics(volumeHeight);

  const aspect = shapeAspect(shape);
  const scale = averageScale(edges);
  // **The MEASURED area always wins.** It comes from the tape lengths by Heron:
  // it is exact and never goes through the camera. The estimates use a single
  // pixel scale for the whole photo, which perspective distorts; hence the
  // number came out "recontra impreciso" (José, 01/09/2026).
  const sides = edges.map((edge) => edge.length);
  const measured: AreaMedida = shape.isClosed
    ? areaByTriangulation(sides, diagonalLengths(shape))
    : { estado: 'faltan-datos', area: null };
  // Geometric ceiling of the measured sides: no polygon with those lengths
  // encloses more. It is what stops an impossible number from showing again.
  const areaMaxima = shape.isClosed ? maxAreaFromSides(sides) : null;
  // A escuadra: 90° corners stated by the user. The sides are enough and the
  // traverse closure checks the premise (Globofast incident, 30/09/2026).
  const escuadra = shape.aEscuadra && shape.isClosed
    ? areaEscuadra({ points: shape.points, lados: sides, aspect })
    : null;
  const { area, areaFuente } = pickArea({
    measured,
    escuadra: escuadra?.estado === 'medida' ? escuadra.area : null,
    ceiling: areaMaxima,
    estimate: boundByCeiling(cameraEstimate(shape, edges, scale, aspect), areaMaxima),
  });

  return {
    area,
    areaFuente,
    areaMaxima,
    // Lengths that do not close are flagged. Hiding it would pass off an area
    // drawn from impossible measurements as good.
    diagonalesIncoherentes: measured.estado === 'incoherente',
    escuadra,
    perimeter: resolvedPerimeter(edges, scale),
    perimetroMedido: edges.every((edge) => edge.length !== null),
    volume: area !== null && volumeHeight !== null ? area * volumeHeight : null,
    scale,
    height: volumeHeight,
  };
};

/**
 * A photo's STORED area/volume, bounded by what its own sides allow.
 *
 * Each photo stores `areaM2`/`volumeM3` computed when it was uploaded, and the
 * report's quantities table SUMS them. Reports captured before 05/09/2026 hold
 * impossible numbers there (745 m² over a ceiling of 245) and an old PDF would
 * contradict itself: the photo shows `S ≤ 245.22` and the footer says 745.00.
 *
 * It is bounded, not recomputed: the field is EDITABLE on the canvas, so a value
 * corrected by hand (always below the ceiling) is left alone. This can only
 * LOWER a number, and only when it is geometrically impossible.
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

/** Same as `boundedPhotoArea`, with the same cut applied to the volume. */
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
  // Volume is area × thickness: if the area was cut, the volume is cut in the
  // same proportion (it keeps the thickness, which was measured).
  const factor = acotada / (photo.areaM2 as number);
  return Number.isFinite(factor) && factor > 0 ? stored * factor : stored;
};

/** Fan diagonals, in the order `areaByTriangulation` expects. */
export const diagonalLengths = (shape: MeasurementShape): Array<number | null> => {
  const necesarias = diagonalesNecesarias(shape.points.length);
  if (!necesarias) return [];
  return Array.from({ length: necesarias }, (_, index) =>
    normalizeNumber(shape.diagonals?.[buildDiagonalId(index)])
  );
};

/** `diag-0` is the diagonal from the 1st vertex to the 3rd, `diag-1` to the 4th, etc. */
export const buildDiagonalId = (index: number): string => `diag-${index}`;
