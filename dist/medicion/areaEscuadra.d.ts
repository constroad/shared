/**
 * A ESCUADRA mode (square corners): area of an ORTHOGONAL polygon from its
 * sides. PURE engine. It exists because of the Globofast incident (30/09/2026):
 * a hole of (3.30 + 4.10) × 0.65 = 4.81 m² came out as 9–20 m², because five
 * sides without diagonals do not determine the polygon, and the cyclic ceiling
 * was shown.
 *
 * Patches and holes are cut with a saw: corners at 90°. With that premise the
 * polygon IS determined by the lengths, plus the direction of each turn
 * (left/right/straight), which is read from the drawing on the photo.
 * Perspective distorts the angles but keeps two things: the turn direction
 * (with every point in front of the camera) and collinearity.
 *
 * It is a closed survey traverse:
 * 1. Walk it turning 90° as drawn (the doubtful vertex, corner or straight,
 *    is decided by the closure: every combination is tried).
 * 2. The CLOSURE ERROR (where it ends vs. where it started) measures quality:
 *    a mistyped length does not close; two different widths almost close.
 * 3. The error is spread per AXIS, in equal parts among that axis' sides
 *    (two widths → their average), so the figure stays orthogonal.
 * 4. Area by the shoelace formula over the adjusted plan.
 */
export type Giro = 'izquierda' | 'derecha' | 'recto';
export type EscuadraStatus = 'medida' | 'faltan-datos' | 'no-ortogonal' | 'no-cierra';
export interface PuntoPlano {
    x: number;
    y: number;
}
/** Closure error: in meters and as a fraction of the perimeter. */
export interface CierreEscuadra {
    distancia: number;
    relativo: number;
}
export interface AreaEscuadra {
    estado: EscuadraStatus;
    /** m². `null` unless the status is `medida`. */
    area: number | null;
    /** Turn at each vertex i (between side i-1 and side i). */
    giros: Giro[];
    cierre: CierreEscuadra | null;
    /** Rebuilt plan in meters, vertex 0 at the origin. Adjusted if it closed. */
    planta: PuntoPlano[] | null;
}
export interface EscuadraInput {
    /** Drawing points, in order, normalized 0..1 per axis. */
    points: Array<{
        x: number;
        y: number;
    }>;
    /** Length of side i (vertex i → i+1); the last one closes against vertex 0. */
    lados: Array<number | null | undefined>;
    /** Photo width/height: without it the drawing's angles come out distorted. */
    aspect?: number;
    /** Turn forced by the user at a vertex, overriding the drawing. */
    girosForzados?: Partial<Record<number, Giro>>;
}
/**
 * How much a side may TILT to absorb the closure error: sine of the angle. The
 * closure error on one axis is absorbed by the sides of the OTHER axis tilting:
 * a mismeasured length (7.40 vs 7.10) forces the 0.65 widths to tilt 27° and
 * the real area is 11 % smaller than the averaged one; two different widths
 * (0.65 vs 0.70) tilt the lengths 0.4° and the average is exact.
 * With sin θ ≤ 0.14, 1 − cos θ ≤ 1 %: the per-axis average stays within 1 %.
 */
export declare const INCLINACION_MAXIMA = 0.14;
export declare const areaEscuadra: (entrada: EscuadraInput) => AreaEscuadra;
/** What the panel tells the operator about the a escuadra mode. `null` = nothing to say. */
export declare const describirEscuadra: (escuadra: AreaEscuadra | null) => {
    tono: "ok" | "alerta";
    texto: string;
} | null;
