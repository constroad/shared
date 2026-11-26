"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDiagonalId = exports.diagonalLengths = exports.boundedPhotoVolume = exports.boundedPhotoArea = exports.estimateMeasurementMetrics = exports.buildMeasurementEdges = exports.normalizeMeasurementShape = exports.buildEdgeId = exports.calculateThicknessDifferenceM = exports.createDefaultMeasurementShape = exports.relacionArea = void 0;
const areaMedida_1 = require("./areaMedida");
const areaEscuadra_1 = require("./areaEscuadra");
const arCapture_1 = require("./arCapture");
/** How the displayed number relates to reality. */
const relacionArea = (fuente) => fuente === 'maximo' ? '≤' : fuente === 'estimada' || fuente === 'ar' ? '≈' : '=';
exports.relacionArea = relacionArea;
const DEFAULT_VISIBLE_METRICS = {
    surface: true,
    perimeter: true,
    volume: false,
    height: false,
};
const CENTIMETERS_PER_METER = 100;
const createDefaultMeasurementShape = () => ({
    points: [],
    isClosed: false,
    distances: {},
    diagonals: {},
    labelOffsets: {},
    height: null,
    visibleMetrics: { ...DEFAULT_VISIBLE_METRICS },
});
exports.createDefaultMeasurementShape = createDefaultMeasurementShape;
const normalizeNumber = (value) => {
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
const normalizeNonNegativeNumber = (value) => {
    if (value === null || value === undefined || value === '')
        return null;
    const parsed = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};
const normalizeSignedNumber = (value) => {
    if (value === null || value === undefined || value === '')
        return null;
    const parsed = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};
const calculateThicknessDifferenceM = (requestedThicknessCm, actualThicknessCm) => {
    if (requestedThicknessCm === null || actualThicknessCm === null)
        return null;
    return (actualThicknessCm - requestedThicknessCm) / CENTIMETERS_PER_METER;
};
exports.calculateThicknessDifferenceM = calculateThicknessDifferenceM;
const buildEdgeId = (startPointId, endPointId) => `${startPointId}:${endPointId}`;
exports.buildEdgeId = buildEdgeId;
const normalizePoints = (rawPoints) => (Array.isArray(rawPoints) ? rawPoints : [])
    .filter((point) => Boolean(point?.id))
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
const normalizeLengths = (rawLengths) => Object.entries(rawLengths ?? {}).reduce((acc, [id, rawValue]) => {
    const value = normalizeNumber(rawValue);
    if (value !== null)
        acc[id] = value;
    return acc;
}, {});
const normalizeLabelOffsets = (rawLabelOffsets) => Object.entries(rawLabelOffsets ?? {}).reduce((acc, [edgeId, rawValue]) => {
    if (!rawValue || typeof rawValue !== 'object')
        return acc;
    const offset = rawValue;
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
const applyThicknessReadings = (target, input) => {
    const requested = normalizeNonNegativeNumber(input?.requestedThicknessCm);
    const measured = normalizeNonNegativeNumber(input?.actualThicknessCm);
    const heightDifference = normalizeSignedNumber(input?.heightDifferenceM);
    if (requested !== null)
        target.requestedThicknessCm = requested;
    if (measured !== null)
        target.actualThicknessCm = measured;
    if (heightDifference !== null)
        target.heightDifferenceM = heightDifference;
};
const normalizeVisibleMetrics = (raw) => ({
    surface: raw?.surface ?? DEFAULT_VISIBLE_METRICS.surface,
    perimeter: raw?.perimeter ?? DEFAULT_VISIBLE_METRICS.perimeter,
    volume: raw?.volume ?? DEFAULT_VISIBLE_METRICS.volume,
    height: raw?.height ?? DEFAULT_VISIBLE_METRICS.height,
});
const normalizeMeasurementShape = (input) => {
    const shape = (0, exports.createDefaultMeasurementShape)();
    shape.points = normalizePoints(input?.points);
    shape.isClosed = Boolean(input?.isClosed) && shape.points.length >= 3;
    shape.distances = normalizeLengths(input?.distances);
    shape.diagonals = normalizeLengths(input?.diagonals);
    shape.labelOffsets = normalizeLabelOffsets(input?.labelOffsets);
    const imageAspect = normalizeNumber(input?.imageAspect);
    if (imageAspect !== null)
        shape.imageAspect = imageAspect;
    if (input?.aEscuadra === true)
        shape.aEscuadra = true;
    shape.height = normalizeNumber(input?.height);
    applyThicknessReadings(shape, input);
    const ar = (0, arCapture_1.normalizeArCapture)(input?.ar);
    if (ar)
        shape.ar = ar;
    shape.visibleMetrics = normalizeVisibleMetrics(input?.visibleMetrics);
    return shape;
};
exports.normalizeMeasurementShape = normalizeMeasurementShape;
/**
 * All geometry is done in "photo height units": x is multiplied by the aspect
 * so a horizontal and a vertical step measure the same. Without this the image
 * is treated as square and distances come out anisotropic.
 */
const getPixelLength = (start, end, aspect) => Math.hypot((end.x - start.x) * aspect, end.y - start.y);
const shapeAspect = (shape) => shape.imageAspect && shape.imageAspect > 0 ? shape.imageAspect : 1;
const buildMeasurementEdges = (shape) => {
    const edges = [];
    const aspect = shapeAspect(shape);
    for (let index = 0; index < shape.points.length - 1; index += 1) {
        const start = shape.points[index];
        const end = shape.points[index + 1];
        const id = (0, exports.buildEdgeId)(start.id, end.id);
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
        const id = (0, exports.buildEdgeId)(start.id, end.id);
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
exports.buildMeasurementEdges = buildMeasurementEdges;
const calculateSignedArea = (points) => {
    if (points.length < 3)
        return 0;
    let area = 0;
    for (let index = 0; index < points.length; index += 1) {
        const current = points[index];
        const next = points[(index + 1) % points.length];
        area += current.x * next.y - next.x * current.y;
    }
    return area / 2;
};
const calculateSignedAreaFromCoordinates = (points) => {
    if (points.length < 3)
        return 0;
    let area = 0;
    for (let index = 0; index < points.length; index += 1) {
        const current = points[index];
        const next = points[(index + 1) % points.length];
        area += current.x * next.y - next.x * current.y;
    }
    return area / 2;
};
const reconstructAdjustedPolygon = (edges, scale, aspect) => {
    if (edges.length === 0 || scale === null)
        return null;
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
    const segments = resolvedSegments;
    const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
    if (totalLength <= 0)
        return null;
    const closureError = segments.reduce((acc, segment) => ({
        x: acc.x + segment.dx,
        y: acc.y + segment.dy,
    }), { x: 0, y: 0 });
    const adjustedSegments = segments.map((segment) => ({
        dx: segment.dx - (closureError.x * segment.length) / totalLength,
        dy: segment.dy - (closureError.y * segment.length) / totalLength,
    }));
    const coordinates = [{ x: 0, y: 0 }];
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
const arMeasurementMetrics = (capture, fallbackHeight) => {
    const measured = (0, arCapture_1.arCaptureMetrics)(capture);
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
const emptyMetrics = (height) => ({
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
const averageScale = (edges) => {
    const resolvedScales = edges
        .filter((edge) => edge.length !== null && edge.pixelLength > 0)
        .map((edge) => edge.length / edge.pixelLength);
    return resolvedScales.length > 0
        ? resolvedScales.reduce((sum, current) => sum + current, 0) / resolvedScales.length
        : null;
};
const resolvedPerimeter = (edges, scale) => scale === null
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
const cameraEstimate = (shape, edges, scale, aspect) => {
    if (scale === null)
        return null;
    const adjustedPolygon = shape.isClosed ? reconstructAdjustedPolygon(edges, scale, aspect) : null;
    if (adjustedPolygon)
        return Math.abs(calculateSignedAreaFromCoordinates(adjustedPolygon));
    if (shape.points.length < 3)
        return null;
    // The aspect enters once: stretching x by the aspect multiplies the area by it.
    return Math.abs(calculateSignedArea(shape.points)) * aspect * scale * scale;
};
const boundByCeiling = (estimate, ceiling) => {
    if (estimate === null)
        return null;
    return ceiling === null ? estimate : Math.min(estimate, ceiling);
};
/** Order: measured with diagonals, measured a escuadra, the ceiling, and only last the camera. */
const pickArea = (candidates) => {
    if (candidates.measured.estado === 'medida')
        return { area: candidates.measured.area, areaFuente: 'medida' };
    if (candidates.escuadra !== null)
        return { area: candidates.escuadra, areaFuente: 'escuadra' };
    if (candidates.ceiling !== null)
        return { area: candidates.ceiling, areaFuente: 'maximo' };
    return { area: candidates.estimate, areaFuente: candidates.estimate === null ? null : 'estimada' };
};
const estimateMeasurementMetrics = (input) => {
    const shape = (0, exports.normalizeMeasurementShape)(input);
    const volumeHeight = shape.heightDifferenceM ?? shape.height;
    if (shape.ar)
        return arMeasurementMetrics(shape.ar, volumeHeight);
    const edges = (0, exports.buildMeasurementEdges)(shape);
    if (edges.length === 0)
        return emptyMetrics(volumeHeight);
    const aspect = shapeAspect(shape);
    const scale = averageScale(edges);
    // **The MEASURED area always wins.** It comes from the tape lengths by Heron:
    // it is exact and never goes through the camera. The estimates use a single
    // pixel scale for the whole photo, which perspective distorts; hence the
    // number came out "recontra impreciso" (José, 01/09/2026).
    const sides = edges.map((edge) => edge.length);
    const measured = shape.isClosed
        ? (0, areaMedida_1.areaByTriangulation)(sides, (0, exports.diagonalLengths)(shape))
        : { estado: 'faltan-datos', area: null };
    // Geometric ceiling of the measured sides: no polygon with those lengths
    // encloses more. It is what stops an impossible number from showing again.
    const areaMaxima = shape.isClosed ? (0, areaMedida_1.maxAreaFromSides)(sides) : null;
    // A escuadra: 90° corners stated by the user. The sides are enough and the
    // traverse closure checks the premise (Globofast incident, 30/09/2026).
    const escuadra = shape.aEscuadra && shape.isClosed
        ? (0, areaEscuadra_1.areaEscuadra)({ points: shape.points, lados: sides, aspect })
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
exports.estimateMeasurementMetrics = estimateMeasurementMetrics;
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
const boundedPhotoArea = (photo) => {
    const stored = typeof photo.areaM2 === 'number' && Number.isFinite(photo.areaM2) ? photo.areaM2 : null;
    if (stored === null || !photo.measurement)
        return stored;
    const { areaMaxima } = (0, exports.estimateMeasurementMetrics)(photo.measurement);
    return areaMaxima !== null && stored > areaMaxima ? areaMaxima : stored;
};
exports.boundedPhotoArea = boundedPhotoArea;
/** Same as `boundedPhotoArea`, with the same cut applied to the volume. */
const boundedPhotoVolume = (photo) => {
    const stored = typeof photo.volumeM3 === 'number' && Number.isFinite(photo.volumeM3) ? photo.volumeM3 : null;
    if (stored === null || !photo.measurement)
        return stored;
    const acotada = (0, exports.boundedPhotoArea)(photo);
    if (acotada === null || acotada === photo.areaM2)
        return stored;
    // Volume is area × thickness: if the area was cut, the volume is cut in the
    // same proportion (it keeps the thickness, which was measured).
    const factor = acotada / photo.areaM2;
    return Number.isFinite(factor) && factor > 0 ? stored * factor : stored;
};
exports.boundedPhotoVolume = boundedPhotoVolume;
/** Fan diagonals, in the order `areaByTriangulation` expects. */
const diagonalLengths = (shape) => {
    const necesarias = (0, areaMedida_1.diagonalesNecesarias)(shape.points.length);
    if (!necesarias)
        return [];
    return Array.from({ length: necesarias }, (_, index) => normalizeNumber(shape.diagonals?.[(0, exports.buildDiagonalId)(index)]));
};
exports.diagonalLengths = diagonalLengths;
/** `diag-0` is the diagonal from the 1st vertex to the 3rd, `diag-1` to the 4th, etc. */
const buildDiagonalId = (index) => `diag-${index}`;
exports.buildDiagonalId = buildDiagonalId;
