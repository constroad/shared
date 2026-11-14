"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeMovement = exports.checkMovementQuantity = exports.MAX_MOVEMENT_QUANTITY = void 0;
exports.planMaterialMovement = planMaterialMovement;
const kardexBalance_1 = require("../kardex/kardexBalance");
/** A quantity above this is a typo: one extra zero on a 30 m³ truck would wipe out the plant's stock. */
exports.MAX_MOVEMENT_QUANTITY = 100000;
/** The quantity to move, rounded; refused when it is not a positive number or has an extra zero. */
const checkMovementQuantity = (value) => {
    const quantity = (0, kardexBalance_1.roundKardex)(Number(value));
    if (!Number.isFinite(quantity) || quantity <= 0)
        return { ok: false, reason: 'La cantidad tiene que ser un número mayor que cero.' };
    if (quantity > exports.MAX_MOVEMENT_QUANTITY)
        return { ok: false, reason: `Esa cantidad supera el máximo de ${exports.MAX_MOVEMENT_QUANTITY}: revisa si sobra un cero.` };
    return { ok: true, quantity };
};
exports.checkMovementQuantity = checkMovementQuantity;
/** The ledger's only free text: the note and who registered it. */
const describeMovement = (note, operator) => {
    const parts = [note?.trim(), operator?.trim() ? `por ${operator.trim()} (Lila)` : ''].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : 'Movimiento registrado por Lila';
};
exports.describeMovement = describeMovement;
/** What a movement does to a material: refuse an exit larger than the stock, or build the ledger line. */
function planMaterialMovement(request, material, now = new Date()) {
    const name = String(material.name ?? '');
    const unit = String(material.unit ?? '').trim() || 'm³';
    const stockBefore = (0, kardexBalance_1.roundKardex)(Number(material.quantity) || 0);
    if (request.kind === 'salida' && request.quantity > stockBefore)
        return { ok: false, reason: `No hay tanto: ${name} tiene ${stockBefore} ${unit}.` };
    if (request.kind === 'ajuste')
        return { ok: true, kind: 'ajuste', quantity: request.quantity };
    return {
        ok: true,
        kind: request.kind,
        movement: {
            type: request.kind === 'ingreso' ? 'Ingreso' : 'Salida',
            quantity: request.quantity,
            value: 0,
            unitCost: 0,
            date: now,
            description: (0, exports.describeMovement)(request.note, request.operator),
            source: 'manual',
        },
    };
}
