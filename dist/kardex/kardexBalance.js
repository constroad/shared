"use strict";
/**
 * The kardex ledger, as pure math: a balance is the sum of its movements in
 * timeline order (date, then creation time, then id). Portal and Inframaq read
 * and write the movements their own way; the balance, the snapshot by
 * material and location, and the order of the timeline are computed here, so
 * both apps give the same number for the same movements.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.kardexSnapshot = exports.kardexSnapshotFromGroups = exports.kardexGroups = exports.kardexMatchesLocation = exports.kardexBalances = exports.compareKardexTimeline = exports.applyKardexMovement = exports.roundKardex = exports.toKardexNumber = exports.KARDEX_UNASSIGNED_LOCATION_NAME = exports.KARDEX_UNASSIGNED_LOCATION_ID = void 0;
exports.KARDEX_UNASSIGNED_LOCATION_ID = 'unassigned';
exports.KARDEX_UNASSIGNED_LOCATION_NAME = 'Sin ubicación';
const KARDEX_DECIMALS = 6;
const toKardexNumber = (value) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
};
exports.toKardexNumber = toKardexNumber;
const roundKardex = (value) => Number(value.toFixed(KARDEX_DECIMALS));
exports.roundKardex = roundKardex;
const applyKardexMovement = (balance, entry) => {
    const quantity = (0, exports.toKardexNumber)(entry.quantity);
    const value = (0, exports.toKardexNumber)(entry.value);
    return entry.type === 'Ingreso'
        ? { quantity: balance.quantity + quantity, value: balance.value + value }
        : { quantity: balance.quantity - quantity, value: balance.value - value };
};
exports.applyKardexMovement = applyKardexMovement;
const instantOf = (value) => {
    if (value === null || value === undefined)
        return 0;
    const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
};
/** Date, then creation time, then id: the order the balance runs in. */
const compareKardexTimeline = (a, b) => instantOf(a.date) - instantOf(b.date) || instantOf(a.createdAt) - instantOf(b.createdAt) || String(a._id ?? '').localeCompare(String(b._id ?? ''));
exports.compareKardexTimeline = compareKardexTimeline;
/** The balance after each movement, in timeline order, and the closing balance. */
const kardexBalances = (entries, opening = { quantity: 0, value: 0 }) => {
    let running = { ...opening };
    const rows = [...entries].sort(exports.compareKardexTimeline).map((entry) => {
        running = (0, exports.applyKardexMovement)(running, entry);
        return { entry, balanceQuantity: (0, exports.roundKardex)(running.quantity), balanceValue: (0, exports.roundKardex)(running.value) };
    });
    return { rows, closing: running };
};
exports.kardexBalances = kardexBalances;
const hasNoLocation = (entry) => entry.locationId === undefined || entry.locationId === null || entry.locationId === '';
/** A location filter. «unassigned» also takes the movements that have no location. */
const kardexMatchesLocation = (entry, locationId) => {
    if (!locationId)
        return true;
    if (locationId === exports.KARDEX_UNASSIGNED_LOCATION_ID && hasNoLocation(entry))
        return true;
    return entry.locationId === locationId;
};
exports.kardexMatchesLocation = kardexMatchesLocation;
const groupKey = (materialId, locationId) => `${materialId}\u0000${locationId}`;
/** The movements summed by material and location; the location name is the last one in timeline order. */
const kardexGroups = (entries) => {
    const groups = new Map();
    for (const entry of [...entries].sort(exports.compareKardexTimeline)) {
        const materialId = String(entry.materialId ?? '');
        const locationId = hasNoLocation(entry) ? exports.KARDEX_UNASSIGNED_LOCATION_ID : String(entry.locationId);
        const key = groupKey(materialId, locationId);
        const group = groups.get(key) ?? { materialId, locationId, locationName: '', quantity: 0, value: 0 };
        const after = (0, exports.applyKardexMovement)({ quantity: group.quantity, value: group.value }, entry);
        groups.set(key, { ...group, locationName: entry.locationName ?? group.locationName, ...after });
    }
    return [...groups.values()];
};
exports.kardexGroups = kardexGroups;
const validDate = (value) => (value instanceof Date && !Number.isNaN(value.getTime()) ? value : null);
/** The stock by material, and inside each its locations, from groups already summed. */
const kardexSnapshotFromGroups = (groups, options = {}) => {
    const byMaterial = new Map();
    for (const group of groups) {
        const materialId = String(group.materialId ?? '');
        if (!materialId)
            continue;
        const quantity = (0, exports.roundKardex)((0, exports.toKardexNumber)(group.quantity));
        const value = (0, exports.roundKardex)((0, exports.toKardexNumber)(group.value));
        const material = byMaterial.get(materialId) ?? { materialId, quantity: 0, value: 0, locations: [] };
        material.quantity = (0, exports.roundKardex)(material.quantity + quantity);
        material.value = (0, exports.roundKardex)(material.value + value);
        material.locations.push({
            locationId: String(group.locationId || exports.KARDEX_UNASSIGNED_LOCATION_ID),
            locationName: String(group.locationName || exports.KARDEX_UNASSIGNED_LOCATION_NAME),
            quantity,
            value,
        });
        byMaterial.set(materialId, material);
    }
    const asOf = validDate(options.asOf);
    return { asOf: asOf ? asOf.toISOString() : null, locationId: options.locationId || undefined, materials: [...byMaterial.values()] };
};
exports.kardexSnapshotFromGroups = kardexSnapshotFromGroups;
/** The stock "as of" a date (the date included), by material and location, from the movements. */
const kardexSnapshot = (entries, options = {}) => {
    const asOf = validDate(options.asOf);
    const inRange = entries.filter((entry) => (!asOf || instantOf(entry.date) <= asOf.getTime()) && (0, exports.kardexMatchesLocation)(entry, options.locationId));
    return (0, exports.kardexSnapshotFromGroups)((0, exports.kardexGroups)(inRange), options);
};
exports.kardexSnapshot = kardexSnapshot;
