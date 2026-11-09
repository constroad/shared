"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatOrderLabel = exports.expandSelectedMovements = exports.calculateTankConsumption = exports.buildConsumePayload = exports.buildConsumeOrder = exports.formatMovementLabel = exports.buildEditConsumeSelection = void 0;
const tankMovementDates_1 = require("./tankMovementDates");
/**
 * Selección de lecturas al EDITAR un consumo, agrupada por tanque canónico.
 * Fuente primaria: `measures[].movementIds` (la selección completa, incluido
 * el punto de INICIO). `movementRefs` solo trae el punto FINAL de cada tramo
 * desde el fix de deltas (2026-07-22: editar marcaba solo el fin) — queda
 * como fallback para consumos legacy sin `measures.movementIds`.
 */
const buildEditConsumeSelection = (consume, resolveTankKey) => {
    const selectionEntries = [
        ...(consume.measures ?? []).flatMap((measure) => (measure.movementIds ?? []).map((movementId) => ({
            tankId: measure.tankId || '',
            movementId,
        }))),
        ...(consume.movementRefs ?? []).map((movementRef) => ({
            tankId: movementRef.tankId,
            movementId: movementRef.movementId,
        })),
    ].filter((entry) => entry.movementId && entry.tankId);
    return selectionEntries.reduce((selectionByTank, entry) => {
        const movementKey = resolveTankKey(entry.tankId);
        const currentIds = selectionByTank[movementKey] ?? [];
        if (currentIds.includes(entry.movementId))
            return selectionByTank;
        return { ...selectionByTank, [movementKey]: [...currentIds, entry.movementId] };
    }, {});
};
exports.buildEditConsumeSelection = buildEditConsumeSelection;
const formatMovementLabel = (movement) => {
    const date = (0, tankMovementDates_1.formatPeruDateTime)(movement.date);
    const createdAtLabel = formatCreatedAtLabel(movement);
    return `${date}${createdAtLabel} · ${movement.eventType} · ${movement.levelCentimeter} cm · ${movement.effectiveGallons.toFixed(2)} gl`;
};
exports.formatMovementLabel = formatMovementLabel;
const formatCreatedAtLabel = (movement) => {
    if (!movement.createdAt)
        return '';
    const movementDate = (0, tankMovementDates_1.formatPeruDate)(movement.date);
    const createdAtDate = (0, tankMovementDates_1.formatPeruDate)(movement.createdAt);
    return movementDate === createdAtDate ? '' : ` (registrado ${createdAtDate})`;
};
// The calculation lives in the server's single engine (José, 30/10/2026).
var consumeEngine_1 = require("./consumeEngine");
Object.defineProperty(exports, "buildConsumeOrder", { enumerable: true, get: function () { return consumeEngine_1.buildConsumeOrder; } });
Object.defineProperty(exports, "buildConsumePayload", { enumerable: true, get: function () { return consumeEngine_1.buildConsumePayload; } });
Object.defineProperty(exports, "calculateTankConsumption", { enumerable: true, get: function () { return consumeEngine_1.calculateTankConsumption; } });
Object.defineProperty(exports, "expandSelectedMovements", { enumerable: true, get: function () { return consumeEngine_1.expandSelectedMovements; } });
Object.defineProperty(exports, "formatOrderLabel", { enumerable: true, get: function () { return consumeEngine_1.formatOrderLabel; } });
