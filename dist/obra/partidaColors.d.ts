/**
 * Color of each partida on the map.
 *
 * They are HEX on purpose, not brand tokens: MapLibre paints in WebGL and does
 * not resolve `hsl(var(--token))`; above all, **the color here is work data, not
 * branding**. The Civil 3D drawing already uses brown for base and black for
 * asphalt: if the map picked others, the engineer would have to learn a new
 * language to read the same thing. Same criterion as `CONGESTION_COLOR`.
 */
/** A delimited street that has no partida assigned yet. */
export declare const NO_PARTIDA_COLOR = "#94a3b8";
export declare const colorForPartida: (partidaId: string, description: string) => string;
export interface PartidaLegendEntry {
    _id: string;
    description: string;
    color: string;
    /** On how many streets of the area it applies. */
    streetCount: number;
}
/**
 * Map legend: only the partidas someone actually assigned.
 *
 * A budget partida nobody put on any street does NOT go in: in this module
 * "does not apply" and "is at zero" are different things, and listing it would
 * make it look like pending work that was never planned there.
 */
export declare const legendForStreets: (scopes: Array<{
    partidaIds?: string[];
}>, partidas: Array<{
    _id: string;
    description?: string;
}>) => PartidaLegendEntry[];
