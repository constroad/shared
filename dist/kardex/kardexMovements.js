"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderExitQuantity = exports.kardexRecountAdjustment = exports.kardexTransfer = exports.kardexUnitValue = exports.inputIngressMovement = void 0;
const inputArrivalDate_1 = require("./inputArrivalDate");
const kardexBalance_1 = require("./kardexBalance");
const ingressDescription = (input) => {
    const sale = input.vendorProviderName ? `, venta ${input.vendorProviderName}` : '';
    const arrival = input.arriveDate ? `, ${input.arriveDate instanceof Date ? input.arriveDate.toISOString() : input.arriveDate}` : '';
    return `Ingreso: ${input.material}, transporte ${input.providerName}${sale}, ${input.driver} ${input.m3}m3${arrival}`;
};
/**
 * The Ingreso that accepts a reception, or null when there is nothing to enter
 * (no quantity, or it already entered). The movement is dated by its arrival,
 * then by its creation, then by `now`.
 */
const inputIngressMovement = (input, now = new Date()) => {
    if (!input.m3 || input.status === 'Completed')
        return null;
    return {
        purchaseId: input._id,
        purchaseOrderId: input.purchaseOrderId,
        purchaseOrderNumber: input.purchaseOrderNumber,
        materialId: String(input.materialId ?? ''),
        locationId: input.locationId,
        locationName: input.locationName,
        providerId: input.providerId,
        providerName: input.providerName,
        vendorProviderId: input.vendorProviderId,
        vendorProviderName: input.vendorProviderName,
        type: 'Ingreso',
        source: 'input',
        quantity: input.m3,
        value: 0,
        unitCost: 0,
        date: (0, inputArrivalDate_1.parseInputArrivalDate)(input.arriveDate) ?? (0, inputArrivalDate_1.parseInputArrivalDate)(input.createdAt) ?? now,
        description: ingressDescription(input),
    };
};
exports.inputIngressMovement = inputIngressMovement;
/** The average value of one unit of what is in stock; zero when nothing is. */
const kardexUnitValue = (balance) => (balance.quantity > 0 ? balance.value / balance.quantity : 0);
exports.kardexUnitValue = kardexUnitValue;
/** A move between locations: a Salida at the origin and an Ingreso at the destination, at the same value. */
const kardexTransfer = (params, fromBalance) => {
    const quantity = (0, kardexBalance_1.roundKardex)((0, kardexBalance_1.toKardexNumber)(params.quantity));
    if (quantity <= 0)
        return { ok: false, error: 'Cantidad inválida' };
    if (params.fromLocationId === params.toLocationId)
        return { ok: false, error: 'El origen y el destino deben ser distintos' };
    if (fromBalance.quantity < quantity)
        return { ok: false, error: 'Stock insuficiente en la ubicación de origen' };
    const unitValue = (0, exports.kardexUnitValue)(fromBalance);
    const shared = {
        materialId: params.materialId,
        quantity,
        value: (0, kardexBalance_1.roundKardex)(unitValue * quantity),
        unitCost: (0, kardexBalance_1.roundKardex)(unitValue),
        date: params.date ? new Date(params.date) : new Date(),
        description: params.description || 'Reubicación de inventario',
        source: 'transfer',
    };
    return {
        ok: true,
        movements: [
            { ...shared, type: 'Salida', locationId: params.fromLocationId },
            { ...shared, type: 'Ingreso', locationId: params.toLocationId },
        ],
    };
};
exports.kardexTransfer = kardexTransfer;
/** The adjustment that makes the stock equal a physical count, or null when it already does. */
const kardexRecountAdjustment = (count, current, options = {}) => {
    const delta = (0, kardexBalance_1.roundKardex)((0, kardexBalance_1.roundKardex)((0, kardexBalance_1.toKardexNumber)(count.countedQuantity)) - current.quantity);
    if (delta === 0)
        return null;
    const unitValue = (0, exports.kardexUnitValue)(current);
    return {
        materialId: count.materialId,
        type: delta > 0 ? 'Ingreso' : 'Salida',
        quantity: Math.abs(delta),
        value: (0, kardexBalance_1.roundKardex)(Math.abs(delta) * unitValue),
        unitCost: (0, kardexBalance_1.roundKardex)(unitValue),
        locationId: count.locationId || undefined,
        date: options.date ?? new Date(),
        description: options.description || 'Ajuste por conteo físico',
        source: 'adjustment',
    };
};
exports.kardexRecountAdjustment = kardexRecountAdjustment;
/** What an order takes out of one material: its share of the total, to two decimals. */
const orderExitQuantity = (total, percentage) => Number((total * (percentage / 100)).toFixed(2));
exports.orderExitQuantity = orderExitQuantity;
