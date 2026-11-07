"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exceedsVarianceThreshold = exports.computeRateVariancePct = exports.computeRateBaseline = exports.sampleRatePerM3 = void 0;
const consumeConstants_1 = require("./consumeConstants");
const sampleRatePerM3 = (sample) => {
    const totalGallons = (sample.quantityPen ?? 0) + (sample.quantityGasohol ?? 0) + (sample.quantityPetroleo ?? 0);
    const totalCubes = Number(sample.totalCubes ?? 0);
    if (!(totalCubes > 0) || !(totalGallons > 0))
        return null;
    return totalGallons / totalCubes;
};
exports.sampleRatePerM3 = sampleRatePerM3;
const computeRateBaseline = (samples, excludeConsumeId, maxSamples = consumeConstants_1.CONSUME_RATE_BASELINE_SAMPLES) => {
    const rates = samples
        .filter((sample) => !excludeConsumeId || String(sample._id || '') !== excludeConsumeId)
        .map(exports.sampleRatePerM3)
        .filter((rate) => rate != null)
        .slice(0, maxSamples);
    if (rates.length === 0)
        return { averageRatePerM3: null, sampleSize: 0 };
    const average = rates.reduce((total, rate) => total + rate, 0) / rates.length;
    return { averageRatePerM3: Number(average.toFixed(4)), sampleSize: rates.length };
};
exports.computeRateBaseline = computeRateBaseline;
/** Variación % del rate actual vs el promedio; null si falta alguno. */
const computeRateVariancePct = (currentRate, averageRatePerM3) => {
    if (currentRate == null || averageRatePerM3 == null || averageRatePerM3 <= 0)
        return null;
    return Number((((currentRate - averageRatePerM3) / averageRatePerM3) * 100).toFixed(1));
};
exports.computeRateVariancePct = computeRateVariancePct;
const exceedsVarianceThreshold = (variancePct) => variancePct != null && Math.abs(variancePct) > consumeConstants_1.CONSUME_RATE_VARIANCE_WARN_PCT;
exports.exceedsVarianceThreshold = exceedsVarianceThreshold;
