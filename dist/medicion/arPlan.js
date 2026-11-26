"use strict";
/**
 * The AR measurement of a patch on the floor (ARPlan 3D pattern, `rumbo/specs/MEDICION-AR.spec.md` §3): the phone
 * hands the corners in metres on the floor plane, one or more sides taped fix the scale, and the area is the shoelace
 * of the contour. Pure: shared by Portal (the server recomputes, it never trusts the phone's number) and Lilachat's APK.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.planArea = planArea;
exports.fitTapeScale = fitTapeScale;
exports.thicknessStats = thicknessStats;
const MIN_VERTICES = 3;
/** Two taps closer than this are the same corner. */
const SAME_CORNER_M = 0.01;
/** A side whose AR and tape lengths differ by more than this (or the relative one) is flagged. */
const TAPE_TOLERANCE_M = 0.02;
const TAPE_TOLERANCE_RATIO = 0.01;
/** Drift by axis beyond this ratio is irregular tracking. */
const AXIS_DRIFT_RATIO = 0.02;
/** Two taped sides must be at least ~20° apart to tell the axes apart. */
const MIN_AXIS_SINE = 0.34;
const RECOMMENDED_READINGS = 3;
const CM_PER_M = 100;
const lengthOf = (from, to) => Math.hypot(to.x - from.x, to.y - from.y);
const sideOf = (plan, index) => [plan[index], plan[(index + 1) % plan.length]];
/** Drops a corner tapped twice, the closing one included. */
function withoutRepeatedCorners(plan) {
    const kept = [];
    for (const point of plan) {
        if (kept.length === 0 || lengthOf(kept[kept.length - 1], point) >= SAME_CORNER_M)
            kept.push(point);
    }
    while (kept.length > 1 && lengthOf(kept[kept.length - 1], kept[0]) < SAME_CORNER_M)
        kept.pop();
    return kept;
}
const cross = (origin, first, second) => (first.x - origin.x) * (second.y - origin.y) - (first.y - origin.y) * (second.x - origin.x);
const segmentsCross = ([a, b], [c, d]) => cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
function crossesItself(plan) {
    const count = plan.length;
    for (let first = 0; first < count; first += 1) {
        for (let second = first + 2; second < count; second += 1) {
            const adjacent = first === 0 && second === count - 1;
            if (!adjacent && segmentsCross(sideOf(plan, first), sideOf(plan, second)))
                return true;
        }
    }
    return false;
}
const shoelace = (plan) => Math.abs(plan.reduce((sum, point, index) => sum + cross({ x: 0, y: 0 }, point, plan[(index + 1) % plan.length]), 0)) / 2;
const perimeterOf = (plan) => plan.reduce((sum, _point, index) => sum + lengthOf(...sideOf(plan, index)), 0);
/** Area and perimeter of a contour on the floor; refuses what has no area. */
function planArea(rawPlan) {
    const plan = withoutRepeatedCorners(rawPlan);
    if (plan.length < MIN_VERTICES)
        return { ok: false, reason: 'pocos-vertices' };
    if (crossesItself(plan))
        return { ok: false, reason: 'se-cruza' };
    return { ok: true, areaM2: shoelace(plan), perimeterM: perimeterOf(plan) };
}
const validTape = (plan, tape) => tape.filter((entry) => Number.isInteger(entry.side) && entry.side >= 0 && entry.side < plan.length && Number.isFinite(entry.lengthM) && entry.lengthM > 0);
/** Least squares: s = Σ(l·|e|) / Σ|e|². */
function globalScale(plan, tape) {
    if (tape.length === 0)
        return 1;
    const sums = tape.reduce((acc, entry) => {
        const arLength = lengthOf(...sideOf(plan, entry.side));
        return { top: acc.top + entry.lengthM * arLength, bottom: acc.bottom + arLength * arLength };
    }, { top: 0, bottom: 0 });
    return sums.bottom > 0 ? sums.top / sums.bottom : 1;
}
const isDiscrepant = (residualM, lengthM) => Math.abs(residualM) > Math.max(TAPE_TOLERANCE_M, TAPE_TOLERANCE_RATIO * lengthM);
/** The tape wins: the side's end corner slides along the side until it measures what the tape says. */
function applyTape(plan, entry) {
    const [start, end] = sideOf(plan, entry.side);
    const arLength = lengthOf(start, end);
    if (arLength === 0)
        return plan;
    const ratio = entry.lengthM / arLength;
    const moved = { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
    return plan.map((point, index) => (index === (entry.side + 1) % plan.length ? moved : point));
}
const unitOf = (plan, side) => {
    const [start, end] = sideOf(plan, side);
    const length = lengthOf(start, end) || 1;
    return { x: (end.x - start.x) / length, y: (end.y - start.y) / length };
};
const axesApart = (plan, tape) => tape.some((first, index) => tape.slice(index + 1).some((second) => Math.abs(cross({ x: 0, y: 0 }, unitOf(plan, first.side), unitOf(plan, second.side))) >= MIN_AXIS_SINE));
/** Solves l² = a·dx² + b·dy² by least squares; the drift by axis is √a and √b. */
function irregularTracking(plan, tape) {
    if (tape.length < 2 || !axesApart(plan, tape))
        return false;
    let [xx, xy, yy, xl, yl] = [0, 0, 0, 0, 0];
    for (const entry of tape) {
        const [start, end] = sideOf(plan, entry.side);
        const dx2 = (end.x - start.x) ** 2;
        const dy2 = (end.y - start.y) ** 2;
        const target = entry.lengthM ** 2;
        [xx, xy, yy, xl, yl] = [xx + dx2 * dx2, xy + dx2 * dy2, yy + dy2 * dy2, xl + dx2 * target, yl + dy2 * target];
    }
    const determinant = xx * yy - xy * xy;
    if (determinant === 0)
        return false;
    const a = (xl * yy - xy * yl) / determinant;
    const b = (xx * yl - xy * xl) / determinant;
    if (a <= 0 || b <= 0)
        return false;
    const [scaleX, scaleY] = [Math.sqrt(a), Math.sqrt(b)];
    return Math.abs(scaleX - scaleY) / ((scaleX + scaleY) / 2) > AXIS_DRIFT_RATIO;
}
const roundCm = (metres) => Math.round(metres * CM_PER_M * 10) / 10;
/** The AR plan corrected by the tape: one scale for the drift, and the tape over AR on every side that disagrees. */
function fitTapeScale(rawPlan, rawTape) {
    const measured = planArea(rawPlan);
    if (!measured.ok)
        return measured;
    const plan = withoutRepeatedCorners(rawPlan);
    const tape = validTape(plan, rawTape);
    const scale = globalScale(plan, tape);
    const scaledPlan = plan.map((point) => ({ x: point.x * scale, y: point.y * scale }));
    const residuals = tape.map((entry) => ({ side: entry.side, residualM: lengthOf(...sideOf(scaledPlan, entry.side)) - entry.lengthM, lengthM: entry.lengthM }));
    const discrepant = tape.filter((_entry, index) => isDiscrepant(residuals[index].residualM, residuals[index].lengthM));
    const fitted = discrepant.reduce(applyTape, scaledPlan);
    const fittedMeasure = planArea(fitted);
    if (!fittedMeasure.ok)
        return fittedMeasure;
    return {
        ok: true,
        plan: fitted,
        areaM2: fittedMeasure.areaM2,
        perimeterM: fittedMeasure.perimeterM,
        scale,
        residuals: residuals.map((entry) => ({ side: entry.side, cm: roundCm(entry.residualM) })),
        discrepantSides: discrepant.map((entry) => entry.side),
        irregularTracking: irregularTracking(plan, tape),
        source: tape.length > 0 ? 'ar+wincha' : 'ar',
    };
}
/** Thickness from n readings in cm: mean, spread, and the volume with the ± that the spread leaves. */
function thicknessStats(readingsCm, areaM2) {
    const readings = readingsCm.filter((value) => Number.isFinite(value) && value > 0).map((value) => value / CM_PER_M);
    const n = readings.length;
    if (n === 0)
        return { n: 0, meanM: 0, sdM: 0, volumeM3: 0, volumePlusMinusM3: 0, fewReadings: true };
    const meanM = readings.reduce((sum, value) => sum + value, 0) / n;
    const sdM = n > 1 ? Math.sqrt(readings.reduce((sum, value) => sum + (value - meanM) ** 2, 0) / (n - 1)) : 0;
    return { n, meanM, sdM, volumeM3: areaM2 * meanM, volumePlusMinusM3: (areaM2 * sdM) / Math.sqrt(n), fewReadings: n < RECOMMENDED_READINGS };
}
