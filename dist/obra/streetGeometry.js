"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveTargetQuantity = exports.projectToLine = exports.sliceLine = exports.pointAtMeasure = exports.lengthOfLine = exports.measuresOf = exports.haversineMeters = void 0;
const EARTH_RADIUS_M = 6371008.8;
const toRad = (deg) => (deg * Math.PI) / 180;
const round2 = (value) => Math.round(value * 100) / 100;
/** Distance between two points by Haversine. Good enough at street scale. */
const haversineMeters = (from, to) => {
    const dLat = toRad(to.lat - from.lat);
    const dLng = toRad(to.lng - from.lng);
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
};
exports.haversineMeters = haversineMeters;
/** Cumulative chainage of each vertex; `[0, …, totalLength]`. */
const measuresOf = (line) => {
    if (!Array.isArray(line) || line.length === 0)
        return [];
    const measures = [0];
    for (let index = 1; index < line.length; index += 1) {
        measures.push(measures[index - 1] + (0, exports.haversineMeters)(line[index - 1], line[index]));
    }
    return measures;
};
exports.measuresOf = measuresOf;
/** Total length following the bends, NOT the straight line between ends. */
const lengthOfLine = (line) => {
    const measures = (0, exports.measuresOf)(line);
    return measures.length > 0 ? measures[measures.length - 1] : 0;
};
exports.lengthOfLine = lengthOfLine;
const lerp = (from, to, ratio) => ({
    lat: from.lat + (to.lat - from.lat) * ratio,
    lng: from.lng + (to.lng - from.lng) * ratio,
});
/**
 * Point on the axis at the requested chainage. Out of range it CLAMPS to the
 * ends instead of returning a meaningless extrapolation.
 */
const pointAtMeasure = (line, measureM) => {
    if (!Array.isArray(line) || line.length === 0)
        return null;
    if (line.length === 1)
        return line[0];
    const measures = (0, exports.measuresOf)(line);
    const total = measures[measures.length - 1];
    if (measureM <= 0)
        return line[0];
    if (measureM >= total)
        return line[line.length - 1];
    for (let index = 1; index < measures.length; index += 1) {
        if (measureM <= measures[index]) {
            const spanM = measures[index] - measures[index - 1];
            const ratio = spanM === 0 ? 0 : (measureM - measures[index - 1]) / spanM;
            return lerp(line[index - 1], line[index], ratio);
        }
    }
    return line[line.length - 1];
};
exports.pointAtMeasure = pointAtMeasure;
/**
 * Sub-polyline between two chainages, keeping the intermediate vertices.
 * It is what allows painting "from 40 to 150" without redrawing the street.
 * An inverted or zero-length cut returns `[]` (there is nothing to paint).
 */
const sliceLine = (line, fromM, toM) => {
    if (!Array.isArray(line) || line.length < 2)
        return [];
    const total = (0, exports.lengthOfLine)(line);
    const start = Math.max(0, Math.min(fromM, total));
    const end = Math.max(0, Math.min(toM, total));
    if (end - start <= 0)
        return [];
    const measures = (0, exports.measuresOf)(line);
    const startPoint = (0, exports.pointAtMeasure)(line, start);
    const endPoint = (0, exports.pointAtMeasure)(line, end);
    if (!startPoint || !endPoint)
        return [];
    const middle = line.filter((_, index) => measures[index] > start && measures[index] < end);
    return [startPoint, ...middle, endPoint];
};
exports.sliceLine = sliceLine;
/**
 * Projects a point (the engineer's GPS position) onto the street axis and
 * returns its chainage. GPS never falls on the axis —people walk on the
 * sidewalk—, so THIS projection is what turns "I am here" into "chainage 108".
 * `distanceM` is how far it was shifted: useful to distrust the result when the
 * device's accuracy is poor.
 */
const projectToLine = (line, point) => {
    if (!Array.isArray(line) || line.length < 2)
        return null;
    const measures = (0, exports.measuresOf)(line);
    let best = null;
    for (let index = 1; index < line.length; index += 1) {
        const from = line[index - 1];
        const to = line[index];
        // Local plane: at block scale, the error of projecting in degrees scaled by
        // cos(lat) is negligible next to GPS accuracy (±5 m).
        const scale = Math.cos(toRad(from.lat));
        const ax = (to.lng - from.lng) * scale;
        const ay = to.lat - from.lat;
        const bx = (point.lng - from.lng) * scale;
        const by = point.lat - from.lat;
        const denominator = ax * ax + ay * ay;
        const ratio = denominator === 0 ? 0 : Math.max(0, Math.min(1, (ax * bx + ay * by) / denominator));
        const foot = lerp(from, to, ratio);
        const distanceM = (0, exports.haversineMeters)(point, foot);
        if (!best || distanceM < best.distanceM) {
            const spanM = measures[index] - measures[index - 1];
            best = { measureM: round2(measures[index - 1] + spanM * ratio), distanceM: round2(distanceM), point: foot };
        }
    }
    return best;
};
exports.projectToLine = projectToLine;
const AREA_UNITS = new Set(['m2', 'm²', 'mt2', 'm^2']);
const LINEAR_UNITS = new Set(['m', 'ml', 'mt', 'metro', 'metros']);
const VOLUME_UNITS = new Set(['m3', 'm³', 'mt3', 'm^3']);
/**
 * The scope's target DERIVED from geometry — nobody types targets.
 *
 * It returns `null` on purpose when it cannot be derived (no roadway width, no
 * thickness for m³, or a non-geometric unit such as `glb`): the scope is left
 * "without target" and the UI asks for it, instead of inventing a number that
 * later pollutes the % and the valuation.
 */
const deriveTargetQuantity = (params) => {
    const unit = String(params.unit ?? '').trim().toLowerCase();
    const lengthM = Number(params.lengthM) || 0;
    if (!unit || lengthM <= 0)
        return null;
    if (LINEAR_UNITS.has(unit))
        return round2(lengthM);
    const widthM = Number(params.widthM) || 0;
    if (widthM <= 0)
        return null;
    if (AREA_UNITS.has(unit))
        return round2(lengthM * widthM);
    if (VOLUME_UNITS.has(unit)) {
        const thicknessM = Number(params.thicknessM) || 0;
        if (thicknessM <= 0)
            return null;
        return round2(lengthM * widthM * thicknessM);
    }
    return null;
};
exports.deriveTargetQuantity = deriveTargetQuantity;
