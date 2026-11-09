"use strict";
/**
 * A reading belongs to at most one consume, and an order too (F1
 * CONSUMES-TANK-RECONCILIATION). The rules each app applies to its own data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveConsumePeriod = exports.extractUniqueConsumeMovementIds = exports.extractConsumeMovementIds = exports.ORDERS_ALREADY_USED_MESSAGE = exports.MOVEMENTS_NOT_ACCESSIBLE_MESSAGE = exports.MOVEMENTS_ALREADY_USED_MESSAGE = void 0;
exports.MOVEMENTS_ALREADY_USED_MESSAGE = 'Una o más medidas ya fueron usadas en otro consumo.';
exports.MOVEMENTS_NOT_ACCESSIBLE_MESSAGE = 'Una o más medidas no existen o no pertenecen a esta empresa.';
exports.ORDERS_ALREADY_USED_MESSAGE = 'Uno o más pedidos ya fueron usados en otro consumo.';
const extractConsumeMovementIds = (consume) => [
    ...(consume.movementRefs ?? []).map((movementRef) => movementRef.movementId),
    ...(consume.measures ?? []).flatMap((measure) => measure.movementIds ?? []),
].filter(Boolean);
exports.extractConsumeMovementIds = extractConsumeMovementIds;
const extractUniqueConsumeMovementIds = (consume) => Array.from(new Set((0, exports.extractConsumeMovementIds)(consume)));
exports.extractUniqueConsumeMovementIds = extractUniqueConsumeMovementIds;
/**
 * The period really measured: the first and last reading of the consume. With no
 * readings it falls back to the consume's date, never null, so a list can filter
 * by period without another branch.
 */
const deriveConsumePeriod = (consume) => {
    const times = (consume.movementRefs ?? []).map((movementRef) => new Date(movementRef.date).getTime()).filter(Number.isFinite);
    if (times.length === 0) {
        const fallbackDate = new Date(consume.date);
        return { periodStart: fallbackDate, periodEnd: fallbackDate };
    }
    return { periodStart: new Date(Math.min(...times)), periodEnd: new Date(Math.max(...times)) };
};
exports.deriveConsumePeriod = deriveConsumePeriod;
