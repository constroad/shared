"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldTrustMatch = exports.matchDeviationM = exports.MATCH_MAX_DEVIATION_M = void 0;
const streetGeometry_1 = require("./streetGeometry");
/**
 * How far the automatic snapping (OSRM `/match`) can be trusted.
 *
 * ## The real case
 *
 * José draws "Jirón Miguel Grau" by hand and, on saving, the street shows up
 * one block lower (04/09/2026). The hand-drawn trace is sent to OSRM to snap it
 * to the real road —that is what gives it the exact shape of the carriageway—
 * and the snapping can resolve to the PARALLEL road: technically a street, but
 * not the one the person pointed at. And it was saved silently.
 *
 * ## The rule
 *
 * If the snapped line strays from the drawn trace by more than the width of a
 * street, it is not used. The hand trace is worse geometry —straight lines
 * between taps— but it tells the truth about WHERE, and where is the one thing
 * that cannot be fixed later without going back to the site.
 */
/**
 * 25 m. A carriageway is ~10 m wide and the GPS/finger add a few more; at 25 m
 * it is no longer an adjustment of the trace, it is another street. The
 * parallel street of a grid layout is 60-100 m away.
 */
exports.MATCH_MAX_DEVIATION_M = 25;
/**
 * The farthest the snapped line strays from the drawn trace, in metres.
 *
 * MAXIMUM and not average: a snap that follows half the street well and
 * escapes on the other half averages low and still leaves the street wrong.
 * `Infinity` when either one is missing: with nothing to compare, there is no
 * trust to grant.
 */
const matchDeviationM = (drawn, matched) => {
    if ((drawn?.length ?? 0) < 2 || (matched?.length ?? 0) < 2)
        return Infinity;
    let worst = 0;
    for (const point of drawn) {
        const projected = (0, streetGeometry_1.projectToLine)(matched, point);
        if (!projected)
            return Infinity;
        worst = Math.max(worst, projected.distanceM);
    }
    return Math.round(worst * 100) / 100;
};
exports.matchDeviationM = matchDeviationM;
const shouldTrustMatch = (params) => (0, exports.matchDeviationM)(params.drawn, params.matched) <= exports.MATCH_MAX_DEVIATION_M;
exports.shouldTrustMatch = shouldTrustMatch;
