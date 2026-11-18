"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeArCapture = normalizeArCapture;
exports.arCaptureMetrics = arCaptureMetrics;
const arPlan_1 = require("./arPlan");
const MIN_CORNERS = 3;
const TRACKINGS = new Set(['normal', 'limitado']);
const AR_ENGINES = new Set(['arcore', 'arkit']);
const DEVICE_TEXT_MAX = 60;
const isLoose = (value) => typeof value === 'object' && value !== null;
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
function planOf(value) {
    if (!Array.isArray(value) || value.length < MIN_CORNERS)
        return null;
    const plan = value.map((point) => (isLoose(point) && finite(point.x) && finite(point.y) ? { x: point.x, y: point.y } : null));
    return plan.every((point) => point !== null) ? plan : null;
}
const tapeOf = (value) => Array.isArray(value)
    ? value.filter((entry) => isLoose(entry) && Number.isInteger(entry.side) && finite(entry.lengthM) && entry.lengthM > 0).map(({ side, lengthM }) => ({ side, lengthM }))
    : [];
const readingsOf = (value) => (Array.isArray(value) ? value.filter((reading) => finite(reading) && reading > 0) : []);
const textOf = (value) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, DEVICE_TEXT_MAX) : null);
function deviceOf(value) {
    if (!isLoose(value))
        return null;
    const [model, os, version] = [textOf(value.model), textOf(value.os), textOf(value.version)];
    const engine = typeof value.ar === 'string' && AR_ENGINES.has(value.ar) ? value.ar : null;
    return model && os && version && engine ? { model, os, ar: engine, version } : null;
}
/** The capture as it can be trusted, or null when there is no plan to measure. */
function normalizeArCapture(input) {
    if (!isLoose(input))
        return null;
    const plan = planOf(input.plan);
    if (!plan)
        return null;
    const capture = { plan, tape: tapeOf(input.tape), thicknessCm: readingsOf(input.thicknessCm) };
    if (typeof input.tracking === 'string' && TRACKINGS.has(input.tracking))
        capture.tracking = input.tracking;
    const device = deviceOf(input.device);
    if (device)
        capture.device = device;
    return capture;
}
/** Area from the plan fitted by the tape; the thickness from the readings. */
function arCaptureMetrics(capture) {
    const fitted = (0, arPlan_1.fitTapeScale)(capture.plan, capture.tape);
    if (!fitted.ok)
        return { area: null, source: null, perimeter: null, thicknessM: null };
    const thickness = (0, arPlan_1.thicknessStats)(capture.thicknessCm, fitted.areaM2);
    return { area: fitted.areaM2, source: fitted.source, perimeter: fitted.perimeterM, thicknessM: thickness.n > 0 ? thickness.meanM : null };
}
