/**
 * The flat base map of the work map, the same one Lilachat draws (José, 09/11/2026:
 * the Portal map looked ugly and 3D). OpenFreeMap's `liberty` style extrudes the
 * buildings (`fill-extrusion`), and with the camera's perspective their walls show
 * even on a flat view. This style paints the buildings as plain blocks, so the
 * colored lines of the work are what stands out.
 *
 * Same free tiles (no token, data from OpenStreetMap). The road layers keep their
 * OpenMapTiles names, because a tap on a street reads them (`ROAD_SOURCE_LAYERS`).
 * MapLibre paint cannot read CSS variables: the colors are literal HSL, in one place.
 */
export type MapStyleLayer = {
    id: string;
    type: 'background' | 'fill' | 'line' | 'symbol';
    source?: string;
    'source-layer'?: string;
    minzoom?: number;
    filter?: unknown[];
    layout?: Record<string, unknown>;
    paint?: Record<string, unknown>;
};
export type MapStyle = {
    version: 8;
    name: string;
    sources: Record<string, {
        type: 'vector';
        url: string;
    }>;
    glyphs: string;
    layers: MapStyleLayer[];
};
export declare const WORK_MAP_STYLE: MapStyle;
