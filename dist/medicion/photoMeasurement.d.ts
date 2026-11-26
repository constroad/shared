import { type AreaEscuadra } from './areaEscuadra';
import { type ArCapture } from './arCapture';
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
export declare const relacionArea: (fuente: AreaFuente | null) => "=" | "\u2264" | "\u2248";
export declare const createDefaultMeasurementShape: () => MeasurementShape;
export declare const calculateThicknessDifferenceM: (requestedThicknessCm: number | null, actualThicknessCm: number | null) => number | null;
export declare const buildEdgeId: (startPointId: string, endPointId: string) => string;
export declare const normalizeMeasurementShape: (input?: Partial<MeasurementShape> | null) => MeasurementShape;
export declare const buildMeasurementEdges: (shape: MeasurementShape) => MeasurementEdge[];
export declare const estimateMeasurementMetrics: (input?: Partial<MeasurementShape> | null) => MeasurementMetrics;
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
export declare const boundedPhotoArea: (photo: {
    areaM2?: number | null;
    measurement?: Partial<MeasurementShape> | null;
}) => number | null;
/** Same as `boundedPhotoArea`, with the same cut applied to the volume. */
export declare const boundedPhotoVolume: (photo: {
    areaM2?: number | null;
    volumeM3?: number | null;
    measurement?: Partial<MeasurementShape> | null;
}) => number | null;
/** Fan diagonals, in the order `areaByTriangulation` expects. */
export declare const diagonalLengths: (shape: MeasurementShape) => Array<number | null>;
/** `diag-0` is the diagonal from the 1st vertex to the 3rd, `diag-1` to the 4th, etc. */
export declare const buildDiagonalId: (index: number) => string;
