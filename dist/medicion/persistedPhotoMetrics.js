"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPersistedMetric = exports.persistedPhotoMetrics = void 0;
/** Measured with diagonals, a escuadra, or AR fitted by the tape is report data. AR alone is not. */
const FUENTES_QUE_SE_GUARDAN = new Set(['medida', 'escuadra', 'ar+wincha']);
/**
 * Four decimals, not the two that get printed: a 0.30 m² patch at two decimals
 * already carries ±1.7 % rounding. The table rounds when it displays.
 */
const DECIMALES_GUARDADOS = 4;
const round = (value, decimals) => {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
};
const persistedPhotoMetrics = (metrics) => {
    if (metrics.areaFuente === null) {
        return { areaM2: undefined, volumeM3: undefined };
    }
    if (!FUENTES_QUE_SE_GUARDAN.has(metrics.areaFuente) || metrics.area === null) {
        return { areaM2: null, volumeM3: null };
    }
    return {
        areaM2: round(metrics.area, DECIMALES_GUARDADOS),
        // Measured area without thickness: the old m³ would come from ANOTHER area. Clear it.
        volumeM3: metrics.volume === null ? null : round(metrics.volume, DECIMALES_GUARDADOS),
    };
};
exports.persistedPhotoMetrics = persistedPhotoMetrics;
/** Applies the tri-state over the value stored on the photo. */
const applyPersistedMetric = (next, current) => {
    if (next === undefined)
        return current;
    if (next === null)
        return undefined;
    return next;
};
exports.applyPersistedMetric = applyPersistedMetric;
