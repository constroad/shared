/**
 * Linear geometry of a street (LRS — linear referencing).
 *
 * A street is drawn ONCE as a polyline; everything that happens on it (the
 * contracted scope, each partida's progress) is expressed as MEASURES along
 * that axis: "from chainage 40 to 150". This module is the arithmetic of that
 * rule and is pure: it knows nothing about Mongo, React or MapLibre.
 *
 * Everything in METRES. Coordinates are `{lat,lng}` in degrees, the same shape
 * `trip.routeSnapshot.line` already persists.
 */
export type LatLng = {
    lat: number;
    lng: number;
};
/** Distance between two points by Haversine. Good enough at street scale. */
export declare const haversineMeters: (from: LatLng, to: LatLng) => number;
/** Cumulative chainage of each vertex; `[0, …, totalLength]`. */
export declare const measuresOf: (line: LatLng[]) => number[];
/** Total length following the bends, NOT the straight line between ends. */
export declare const lengthOfLine: (line: LatLng[]) => number;
/**
 * Point on the axis at the requested chainage. Out of range it CLAMPS to the
 * ends instead of returning a meaningless extrapolation.
 */
export declare const pointAtMeasure: (line: LatLng[], measureM: number) => LatLng | null;
/**
 * Sub-polyline between two chainages, keeping the intermediate vertices.
 * It is what allows painting "from 40 to 150" without redrawing the street.
 * An inverted or zero-length cut returns `[]` (there is nothing to paint).
 */
export declare const sliceLine: (line: LatLng[], fromM: number, toM: number) => LatLng[];
/**
 * Projects a point (the engineer's GPS position) onto the street axis and
 * returns its chainage. GPS never falls on the axis —people walk on the
 * sidewalk—, so THIS projection is what turns "I am here" into "chainage 108".
 * `distanceM` is how far it was shifted: useful to distrust the result when the
 * device's accuracy is poor.
 */
export declare const projectToLine: (line: LatLng[], point: LatLng) => {
    measureM: number;
    distanceM: number;
    point: LatLng;
} | null;
/**
 * The scope's target DERIVED from geometry — nobody types targets.
 *
 * It returns `null` on purpose when it cannot be derived (no roadway width, no
 * thickness for m³, or a non-geometric unit such as `glb`): the scope is left
 * "without target" and the UI asks for it, instead of inventing a number that
 * later pollutes the % and the valuation.
 */
export declare const deriveTargetQuantity: (params: {
    unit?: string;
    lengthM: number;
    widthM?: number;
    thicknessM?: number;
}) => number | null;
