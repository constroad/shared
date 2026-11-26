"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tankAuditReasons = void 0;
exports.tankMovementFromLevel = tankMovementFromLevel;
exports.tankAsMeasured = tankAsMeasured;
const tankEngine_1 = require("./tankEngine");
/** Two decimals, the same rounding the measure screen persists. */
const roundGallons = (value) => Number(value.toFixed(2));
function tankMovementFromLevel(tank, request) {
    const input = (0, tankEngine_1.tankDocumentToCalculationInput)(tank);
    const atLevel = (0, tankEngine_1.geometricGallonsAtLevel)(input, request.levelCm);
    if (!atLevel.ok)
        return { ok: false, reason: atLevel.message };
    const available = (0, tankEngine_1.availableForProductionGallons)(input, request.levelCm);
    if (!available.ok)
        return { ok: false, reason: available.message };
    if (!('availableGallons' in available))
        return { ok: false, reason: 'No se pudo calcular el disponible del tanque' };
    return {
        ok: true,
        movement: {
            tankId: String(tank._id ?? ''),
            tankName: String(tank.name ?? ''),
            eventType: request.eventType,
            levelCentimeter: request.levelCm,
            effectiveGallons: roundGallons(atLevel.effectiveGallons),
            availableGallons: roundGallons(available.availableGallons),
            valveDeadGallons: roundGallons(available.valveDeadGallons),
            date: request.date ?? new Date(),
            note: request.note,
        },
    };
}
const IDLE_HOURS = 6;
const MILLISECONDS_PER_HOUR = 3600000;
const MIN_DROP_CM = 1;
const LARGE_DROP_CM = 10;
const MORNING_END_HOUR = 10;
const NIGHT_START_HOUR = 18;
/** Peru has no daylight saving: its clock is always five hours behind UTC. */
const PERU_UTC_OFFSET_HOURS = 5;
const timeOf = (reading) => new Date(reading.date).getTime();
const peruHourOf = (reading) => new Date(timeOf(reading) - PERU_UTC_OFFSET_HOURS * MILLISECONDS_PER_HOUR).getUTCHours();
const isNightToMorning = (start, end) => peruHourOf(start) >= NIGHT_START_HOUR && peruHourOf(end) <= MORNING_END_HOUR;
/** Why a measure deserves a second look, against the reading before it. */
const tankAuditReasons = ({ evidenceCount, movement, previousMovement }) => {
    const dropCentimeters = Math.abs(movement.levelCentimeter - previousMovement.levelCentimeter);
    const deltaGallons = movement.effectiveGallons - previousMovement.effectiveGallons;
    const gapHours = Math.abs(timeOf(movement) - timeOf(previousMovement)) / MILLISECONDS_PER_HOUR;
    const reasons = [];
    if (evidenceCount === 0)
        reasons.push('sin evidencia fotografica');
    if (deltaGallons > 0 && evidenceCount === 0)
        reasons.push('recarga sin evidencia');
    if (deltaGallons < 0 && dropCentimeters >= LARGE_DROP_CM)
        reasons.push(`caida grande de ${dropCentimeters.toFixed(1)} cm`);
    if (deltaGallons < 0 && dropCentimeters >= MIN_DROP_CM && gapHours >= IDLE_HOURS && isNightToMorning(previousMovement, movement)) {
        reasons.push('caida entre cierre nocturno y reinicio');
    }
    return reasons;
};
exports.tankAuditReasons = tankAuditReasons;
/** The tank as this measure leaves it: its own stock is synced after the measure is saved. */
function tankAsMeasured(tank, measure) {
    return {
        ...tank,
        ...(Number.isFinite(measure.effectiveGallons) ? { volumeInStock: measure.effectiveGallons } : {}),
        ...(Number.isFinite(measure.levelCentimeter) ? { levelCentimeter: measure.levelCentimeter } : {}),
    };
}
