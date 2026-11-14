"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchReference = exports.dispatchCm = void 0;
const cubicage_1 = require("./cubicage");
/**
 * Dispatch heights in CENTIMETERS, as the plant measures them with the tape. `dispatchHeight`
 * answers in meters; Portal printed those meters with «cm» (0.47 «cm» for 47 cm). The screen, the
 * certificate and the Lilachat card read this, so they never disagree.
 */
const CM_PER_M = 100;
const REFERENCE_ROWS = 4;
const REFERENCE_STEP_M3 = 2;
const dispatchCm = (shape, measures, m3) => {
    if (!(m3 > 0))
        return null;
    const height = (0, cubicage_1.dispatchHeight)(shape, measures, m3);
    return height ? { m3, loadCm: Math.round(height.loadHeight * CM_PER_M), fromTopCm: Math.round(height.fromTop * CM_PER_M) } : null;
};
exports.dispatchCm = dispatchCm;
/** Whole m³ every two, from the volume down: what the plant loads most often. */
const dispatchReference = (shape, measures, volume) => {
    const top = Math.floor(volume);
    return Array.from({ length: REFERENCE_ROWS }, (_unused, index) => top - REFERENCE_STEP_M3 * (REFERENCE_ROWS - 1 - index))
        .filter((m3) => m3 > 0)
        .flatMap((m3) => {
        const row = (0, exports.dispatchCm)(shape, measures, m3);
        return row ? [row] : [];
    });
};
exports.dispatchReference = dispatchReference;
