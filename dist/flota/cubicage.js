"use strict";
/**
 * A dump truck's volume from its tape measures, in meters and m³. Portal and
 * Inframaq cubicate the same fleet, so both read these rules. The field names keep
 * Portal's spelling (`concaveHight`): they are what its documents store.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchHeight = exports.cubicageM3 = exports.measuresOf = exports.deriveConcaveMeasures = exports.plateKeyOf = exports.measureFieldsOf = exports.CUBICAGE_MEASURE_KEYS = void 0;
exports.CUBICAGE_MEASURE_KEYS = ['totalWidth', 'totalLength', 'totalHeight', 'concaveHight', 'squareHeight', 'leftConcaveWidth', 'centralConcaveWidth', 'rightConcaveWidth'];
const SQUARE_FIELDS = [
    { key: 'totalWidth', label: 'A1 Ancho' },
    { key: 'totalLength', label: 'A2 Largo' },
    { key: 'totalHeight', label: 'A3 Alto' },
];
const CONCAVE_FIELDS = [
    ...SQUARE_FIELDS,
    { key: 'concaveHight', label: 'A4 Alto cóncavo', hint: 'A3 − A5' },
    { key: 'squareHeight', label: 'A5 Alto cuadrado' },
    { key: 'leftConcaveWidth', label: 'B1 Ancho cóncavo', hint: '(A1 − B2) / 2' },
    { key: 'centralConcaveWidth', label: 'B2 Ancho centro' },
    { key: 'rightConcaveWidth', label: 'B3 Ancho derecho', hint: '(A1 − B2) / 2' },
];
/** Millimeters: how a tape reads. */
const MEASURE_DECIMALS = 3;
const measureFieldsOf = (shape) => (shape === 'Cuadrado' ? SQUARE_FIELDS : CONCAVE_FIELDS);
exports.measureFieldsOf = measureFieldsOf;
/** «B4X 836», «T2T-809» and «c9r753» are plates of one form. */
const plateKeyOf = (plate) => String(plate ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
exports.plateKeyOf = plateKeyOf;
const numberOf = (measure) => {
    const parsed = Number(String(measure ?? '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
};
const measureOf = (value) => (value > 0 ? String(Number(value.toFixed(MEASURE_DECIMALS))) : '0');
/** The hopper is measured outside and at its center; the rest follows from those. */
const deriveConcaveMeasures = (base) => {
    const sideWidth = measureOf((numberOf(base.totalWidth) - numberOf(base.centralConcaveWidth)) / 2);
    return { concaveHight: measureOf(numberOf(base.totalHeight) - numberOf(base.squareHeight)), leftConcaveWidth: sideWidth, rightConcaveWidth: sideWidth };
};
exports.deriveConcaveMeasures = deriveConcaveMeasures;
/** The measures that count for a shape; a deduced one beats whatever was typed. */
const measuresOf = (shape, measures) => {
    if (shape === 'Concavo')
        return { ...measures, ...(0, exports.deriveConcaveMeasures)(measures) };
    const { totalWidth, totalLength, totalHeight } = measures;
    return { totalWidth, totalLength, totalHeight };
};
exports.measuresOf = measuresOf;
const concaveParts = (measures) => {
    const known = (0, exports.measuresOf)('Concavo', measures);
    const [length, curveHeight] = [numberOf(known.totalLength), numberOf(known.concaveHight)];
    const flatBottom = curveHeight * numberOf(known.centralConcaveWidth) * length;
    const curvedSides = ((curveHeight * numberOf(known.leftConcaveWidth) * Math.PI) / 2) * length;
    return { straight: numberOf(known.totalWidth) * length * numberOf(known.squareHeight), curved: flatBottom + curvedSides };
};
const cubicageM3 = (shape, measures) => {
    if (shape === 'Cuadrado')
        return numberOf(measures.totalWidth) * numberOf(measures.totalLength) * numberOf(measures.totalHeight);
    const { straight, curved } = concaveParts(measures);
    return straight + curved;
};
exports.cubicageM3 = cubicageM3;
const heightOf = (loadHeight, totalHeight) => Number.isFinite(loadHeight) ? { loadHeight, fromTop: totalHeight - loadHeight } : null;
/** How high the load reaches for a volume: a concave truck fills its curved part first. */
const dispatchHeight = (shape, measures, requestedM3) => {
    if (!Number.isFinite(requestedM3) || requestedM3 <= 0)
        return null;
    const totalHeight = numberOf(measures.totalHeight);
    if (shape === 'Cuadrado') {
        const total = (0, exports.cubicageM3)(shape, measures);
        return total > 0 ? heightOf((requestedM3 * totalHeight) / total, totalHeight) : null;
    }
    const { straight, curved } = concaveParts(measures);
    if (straight <= 0)
        return null;
    const known = (0, exports.measuresOf)('Concavo', measures);
    return heightOf(((requestedM3 - curved) * numberOf(known.squareHeight)) / straight + numberOf(known.concaveHight), totalHeight);
};
exports.dispatchHeight = dispatchHeight;
