"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.measuredByLine = exports.dispatchCubicageOf = exports.newestCubicage = exports.needsSiblingLookup = void 0;
const cubicage_1 = require("./cubicage");
const shape_1 = require("./shape");
const isMeasured = (unit) => Number(unit.m3) > 0 && (0, shape_1.truckShapeOf)(unit.shape) !== '';
const timeOf = (unit) => (unit.cubicageUpdatedAt ? new Date(unit.cubicageUpdatedAt).getTime() : 0);
/** The local unit is enough unless it has no volume or was born provisional from a dispatch. */
const needsSiblingLookup = (unit) => !unit || !isMeasured(unit) || unit.pendingCubicageRegularization === true;
exports.needsSiblingLookup = needsSiblingLookup;
/** The newest measured candidate; on a tie the first one wins, so list the local company first. */
const newestCubicage = (candidates) => candidates.filter((candidate) => isMeasured(candidate.unit)).reduce((best, candidate) => (!best || timeOf(candidate.unit) > timeOf(best.unit) ? candidate : best), null);
exports.newestCubicage = newestCubicage;
const numericMeasures = (measures) => Object.fromEntries(cubicage_1.CUBICAGE_MEASURE_KEYS.flatMap((key) => {
    const value = measures?.[key];
    const number = Number(value);
    return value === null || value === undefined || value === '' || !Number.isFinite(number) ? [] : [[key, number]];
}));
const optional = (key, value) => (value === undefined || value === null || value === '' ? {} : { [key]: value });
/** Null when the candidate has no volume or no known shape: nothing worth copying. */
const dispatchCubicageOf = (candidate, params) => {
    const { unit } = candidate;
    const shape = (0, shape_1.truckShapeOf)(unit.shape);
    if (!isMeasured(unit) || !shape)
        return null;
    return {
        plate: unit.plate,
        m3: Number(unit.m3),
        shape,
        measures: numericMeasures(unit.measures),
        ...optional('measuredBy', unit.cubicator),
        measuredByCompanyId: candidate.companyId,
        measuredByCompanyName: candidate.companyName,
        ...optional('measuredAt', unit.cubicageUpdatedAt ? new Date(unit.cubicageUpdatedAt).toISOString() : undefined),
        ...optional('certificateNumber', unit.certificateNumber),
        source: candidate.companyId === params.ownCompanyId ? 'local' : 'sibling',
        ...(unit.pendingCubicageRegularization ? { provisional: true } : {}),
        capturedAt: params.capturedAt.toISOString(),
    };
};
exports.dispatchCubicageOf = dispatchCubicageOf;
const LIMA_DAY = { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' };
/** «Medido por INFRAMAQ el 13/11/2026» when another company measured; null when the issuer did. */
const measuredByLine = (copy, issuerCompanyId) => {
    if (copy.measuredByCompanyId === issuerCompanyId)
        return null;
    const day = copy.measuredAt ? ` el ${new Date(copy.measuredAt).toLocaleDateString('es-PE', LIMA_DAY)}` : '';
    return `Medido por ${copy.measuredByCompanyName}${day}`;
};
exports.measuredByLine = measuredByLine;
