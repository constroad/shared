/**
 * The client report's "km strip" (F8): each street as a bar along its chainage,
 * segmented by the work axis that covered it, with the active front and the
 * legend in m².
 *
 * It is the reading the Stitch design brings ("Mapa Técnico de Avance
 * Geoespacial"), and spec §5 places it NEXT TO the real map, not instead of it:
 * the strip is read at a glance; the map is recognised.
 *
 * **There is no new engine.** Approved intervals per axis and totals come from
 * `streetProgress` —the same thing that paints the client map—; here they are
 * translated into something drawn without geometry. The axis is the TAG, with
 * the partida as fallback, just like in `WorkStreetsClientMap`.
 */
export interface KmStripStreetInput {
    _id: string;
    name: string;
    lengthM: number;
    widthM?: number | null;
}
export interface KmStripScopeInput {
    _id: string;
    streetId: string;
    fromM: number;
    toM: number;
    partidaIds?: string[];
    tagIds?: string[];
    widthM?: number | null;
}
export interface KmStripProgressInput {
    streetId: string;
    partidaId?: string;
    tagId?: string;
    fromM: number;
    toM: number;
    date?: string;
    rework?: boolean;
}
export interface KmStripTagInput {
    _id: string;
    name: string;
    color: string;
}
export interface KmStripPartidaInput {
    _id: string;
    description?: string;
}
export interface KmStripSegment {
    workId: string;
    label: string;
    color: string;
    fromM: number;
    toM: number;
}
export interface KmStripStreet {
    streetId: string;
    name: string;
    lengthM: number;
    segments: KmStripSegment[];
    /** The farthest metre worked on the street; `null` without progress. */
    frenteM: number | null;
}
export interface KmStripLegendItem {
    workId: string;
    label: string;
    color: string;
    approvedM: number;
    /** `null` when no width is loaded: area is never made up. */
    m2: number | null;
    /** Approved metres over the contracted ones for that axis, 0–100. */
    pct: number;
}
export interface KmStrip {
    streets: KmStripStreet[];
    legend: KmStripLegendItem[];
}
interface KmStripParams {
    streets: KmStripStreetInput[];
    scopes: KmStripScopeInput[];
    progress: KmStripProgressInput[];
    tags: KmStripTagInput[];
    partidas: KmStripPartidaInput[];
    /** Cutoff date (date-only): only what was worked up to that day counts. */
    upToDate?: string;
}
export declare const kmStrip: (params: KmStripParams) => KmStrip;
/** Days with progress, newest to oldest: the cutoff selector. */
export declare const cutoffDates: (progress: Array<{
    date?: string;
}>) => string[];
/** The chainage as on the drawings: «Km 0+650». */
export declare const kmLabel: (meters: number) => string;
export {};
