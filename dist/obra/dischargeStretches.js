"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestDischarges = exports.WORST_PRECISION_M = exports.STREET_REACH_M = void 0;
const streetGeometry_1 = require("./streetGeometry");
/** Farther than this from the axis is not that street: Portal's search radius and a sidewalk. */
exports.STREET_REACH_M = 30;
/** A fix worse than this does not tell one stretch from the next. */
exports.WORST_PRECISION_M = 30;
const NO_ARRIVAL = '9999';
const VOLUME_ROUNDING = 100;
const trusted = (point) => (point.precision_m ?? 0) <= exports.WORST_PRECISION_M;
const fitOn = (street, points) => {
    const feet = points
        .map((point) => (0, streetGeometry_1.projectToLine)(street.geometry, point))
        .filter((foot) => foot !== null && foot.distanceM <= exports.STREET_REACH_M);
    if (feet.length === 0)
        return null;
    const offsetM = feet.reduce((total, foot) => total + foot.distanceM, 0);
    return { street, measures: feet.map((foot) => Math.min(foot.measureM, street.lengthM)), offsetM };
};
/** The street that holds the most photos of the unit and, between equals, the closest one. */
const bestFit = (streets, points) => {
    const better = (one, other) => one.measures.length - other.measures.length || other.offsetM - one.offsetM;
    return streets.reduce((best, street) => {
        const fit = fitOn(street, points);
        return fit && (!best || better(fit, best) > 0) ? fit : best;
    }, null);
};
const placeUnit = (streets, unit) => {
    const points = unit.points.filter(trusted);
    const last = points[points.length - 1];
    if (!last)
        return { state: 'noPlace', dispatchId: unit.dispatch_id };
    const fit = bestFit(streets, points);
    if (!fit)
        return { state: 'outside', dispatchId: unit.dispatch_id, point: { lat: last.lat, lng: last.lng } };
    return { state: 'placed', dispatchId: unit.dispatch_id, streetId: fit.street._id, fromM: Math.round(Math.min(...fit.measures)), toM: Math.round(Math.max(...fit.measures)) };
};
const stretchOf = (street, placed, volumeOf) => {
    const onStreet = placed.filter((one) => one.streetId === street._id);
    if (onStreet.length === 0)
        return null;
    const fromM = Math.min(...onStreet.map((one) => one.fromM));
    const toM = Math.max(...onStreet.map((one) => one.toM));
    const volume = onStreet.reduce((total, one) => total + volumeOf(one.dispatchId), 0);
    return {
        streetId: street._id,
        streetName: street.name,
        fromM,
        toM,
        lengthM: toM - fromM,
        volumeM3: Math.round(volume * VOLUME_ROUNDING) / VOLUME_ROUNDING,
        dispatchIds: onStreet.map((one) => one.dispatchId),
    };
};
/** ISO hours sort as text; a unit without an hour goes last. */
const byArrival = (one, other) => {
    const [left, right] = [one.arrival_at ?? NO_ARRIVAL, other.arrival_at ?? NO_ARRIVAL];
    return left === right ? 0 : left < right ? -1 : 1;
};
/** Each unit placed on a street (or outside the work, or without a place) and one stretch per street. */
const suggestDischarges = (streets, discharges) => {
    const arrived = [...discharges].sort(byArrival);
    const units = arrived.map((unit) => placeUnit(streets, unit));
    const placed = units.filter((one) => one.state === 'placed');
    const volumes = new Map(discharges.map((unit) => [unit.dispatch_id, unit.m3 ?? 0]));
    const volumeOf = (dispatchId) => volumes.get(dispatchId) ?? 0;
    return { units, stretches: streets.map((street) => stretchOf(street, placed, volumeOf)).filter((stretch) => stretch !== null) };
};
exports.suggestDischarges = suggestDischarges;
