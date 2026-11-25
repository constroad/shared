"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dischargesOf = void 0;
const dispatchClientFacingM3_1 = require("./dispatchClientFacingM3");
const MAX_LATITUDE = 90;
const MAX_LONGITUDE = 180;
const isoOf = (value) => {
    if (!value)
        return undefined;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? new Date(time).toISOString() : undefined;
};
const positionOf = (geo) => {
    const [lat, lng] = String(geo ?? '').split(',').map(Number);
    const valid = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= MAX_LATITUDE && Math.abs(lng) <= MAX_LONGITUDE;
    return valid ? { lat, lng } : null;
};
/** The photo's taken time; an older photo without one is dated by its upload. */
const pointOf = (photo) => {
    const position = positionOf(photo.metadata?.geo);
    const at = isoOf(photo.metadata?.takenAt) ?? isoOf(photo.createdAt);
    if (!position || !at)
        return null;
    const precision = Number(photo.metadata?.precisionM);
    return { kind: String(photo.metadata?.tipoFoto ?? ''), ...position, ...(Number.isFinite(precision) && photo.metadata?.precisionM ? { precision_m: precision } : {}), at };
};
const pointsByDispatch = (photos) => {
    const byDispatch = new Map();
    photos.forEach((photo) => {
        const dispatchId = String(photo.metadata?.dispatchId ?? '');
        const point = pointOf(photo);
        if (dispatchId && point)
            byDispatch.set(dispatchId, [...(byDispatch.get(dispatchId) ?? []), point]);
    });
    return byDispatch;
};
const dischargesOf = (dispatches, photos) => {
    const points = pointsByDispatch(photos);
    return dispatches.flatMap((dispatch) => {
        const id = String(dispatch._id);
        const own = (points.get(id) ?? []).sort((left, right) => left.at.localeCompare(right.at));
        if (!own.length)
            return [];
        const m3 = (0, dispatchClientFacingM3_1.resolveClientFacingM3)(dispatch);
        const arrivalAt = isoOf(dispatch.arrival?.at);
        const finishedAt = isoOf(dispatch.fieldWork?.finishedAt);
        return [{
                dispatch_id: id,
                plate: String(dispatch.plate ?? '').toUpperCase(),
                ...(typeof m3 === 'number' && m3 > 0 ? { m3 } : {}),
                ...(arrivalAt ? { arrival_at: arrivalAt } : {}),
                ...(finishedAt ? { finished_at: finishedAt } : {}),
                points: own,
            }];
    });
};
exports.dischargesOf = dischargesOf;
