"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diffConsumeFigures = exports.computeConsume = exports.buildConsumePayload = exports.computeTankCalculations = exports.totalByContentType = exports.calculateTankConsumption = exports.expandSelectedMovements = exports.buildConsumeOrder = exports.formatOrderLabel = exports.groupTankMovementsByTank = exports.resolveTankMovementKey = exports.normalizeTankName = exports.tankMovementKey = exports.compareReadings = void 0;
const tankMovementDates_1 = require("./tankMovementDates");
const DECIMALS_GALLONS = 2;
const DECIMALS_RATE = 4;
const round = (value, decimals) => Number(value.toFixed(decimals));
const timeOf = (movement) => new Date(movement.date).getTime();
const registeredAt = (movement) => (movement.createdAt ? new Date(movement.createdAt).getTime() : 0);
/**
 * Chronological order of readings. `date` is saved to the minute, so readings
 * of the same minute tie: the one registered first goes first, then the id, and
 * the order never depends on how the list arrived (Inframaq 7066a5f, 31/10/2026).
 */
const compareReadings = (first, second) => timeOf(first) - timeOf(second) || registeredAt(first) - registeredAt(second) || first._id.localeCompare(second._id);
exports.compareReadings = compareReadings;
const byDate = exports.compareReadings;
const tankMovementKey = (tank) => tank.sharedTankId || tank._id;
exports.tankMovementKey = tankMovementKey;
/** Tank names of the same physical tank may differ in case between companies. */
const normalizeTankName = (name) => (name ?? '').trim().toLocaleLowerCase('es');
exports.normalizeTankName = normalizeTankName;
/**
 * The tank a reading belongs to: by id or shared id, else by name (a reading
 * taken by another company carries its own alias id but the same tank name).
 */
const resolveTankMovementKey = (tanks, movementTankId, movementTankName) => {
    const directMatch = tanks.find((tank) => tank._id === movementTankId || tank.sharedTankId === movementTankId);
    if (directMatch)
        return (0, exports.tankMovementKey)(directMatch);
    const normalizedName = (0, exports.normalizeTankName)(movementTankName);
    const nameMatch = normalizedName ? tanks.find((tank) => (0, exports.normalizeTankName)(tank.name) === normalizedName) : undefined;
    return nameMatch ? (0, exports.tankMovementKey)(nameMatch) : movementTankId;
};
exports.resolveTankMovementKey = resolveTankMovementKey;
const groupTankMovementsByTank = (tanks, movements) => movements.reduce((groupedMovements, movement) => {
    const movementKey = (0, exports.resolveTankMovementKey)(tanks, movement.tankId, movement.tankName);
    groupedMovements[movementKey] = [...(groupedMovements[movementKey] ?? []), movement];
    return groupedMovements;
}, {});
exports.groupTankMovementsByTank = groupTankMovementsByTank;
const formatOrderLabel = (order) => {
    const scheduleDate = order.fechaProgramacion ? (0, tankMovementDates_1.formatPeruDate)(order.fechaProgramacion) : 'Sin fecha';
    return `${order.cliente ?? 'Sin cliente'} · ${scheduleDate} · ${order.obra ?? 'Sin obra'}`;
};
exports.formatOrderLabel = formatOrderLabel;
/** An order as a consume stores it; a projected one keeps whose order it is. */
const buildConsumeOrder = (order) => {
    if (!order._id)
        return null;
    const sourceCompanyId = order.sourceCompanyId;
    return {
        orderId: order._id,
        orderName: (0, exports.formatOrderLabel)(order),
        orderClient: order.cliente ?? '',
        tipoMAC: order.design || order.tipoMAC || '-',
        ...(sourceCompanyId ? { sourceCompanyId } : {}),
    };
};
exports.buildConsumeOrder = buildConsumeOrder;
/**
 * Expands a selection to the continuous span between the first and the last
 * selected reading, with EVERY reading in between: a refill in the middle is
 * then a refill and not a missed consumption.
 */
const expandSelectedMovements = (sortedMovements, selectedIds) => {
    const ordered = [...sortedMovements].sort(byDate);
    const selectedIndexes = ordered
        .map((movement, index) => (selectedIds.has(movement._id) ? index : -1))
        .filter((index) => index >= 0);
    if (selectedIndexes.length < 2)
        return ordered.filter((movement) => selectedIds.has(movement._id));
    return ordered.slice(selectedIndexes[0], selectedIndexes[selectedIndexes.length - 1] + 1);
};
exports.expandSelectedMovements = expandSelectedMovements;
const intervalTypeOf = (deltaGallons) => deltaGallons < 0 ? 'consumption' : deltaGallons > 0 ? 'refill' : 'flat';
/**
 * A span's consumption = ONLY the steps between consecutive readings of the
 * span (a drop is consumption, a rise a refill). The first reading is the
 * baseline: its stored delta against a reading OUTSIDE the span never counts
 * (bug 22/07/2026 doubled the consumption). One point = incomplete.
 */
const calculateTankConsumption = (tank, selectedMovements) => {
    const sortedMovements = [...selectedMovements].sort(byDate);
    const intervals = sortedMovements.slice(1).map((movement, index) => {
        const previousMovement = sortedMovements[index];
        const deltaGallons = round(movement.effectiveGallons - previousMovement.effectiveGallons, DECIMALS_GALLONS);
        return {
            startMovement: previousMovement,
            endMovement: movement,
            startLevelCentimeter: previousMovement.levelCentimeter,
            endLevelCentimeter: movement.levelCentimeter,
            startEffectiveGallons: previousMovement.effectiveGallons,
            endEffectiveGallons: movement.effectiveGallons,
            deltaGallons,
            consumedGallons: deltaGallons < 0 ? Math.abs(deltaGallons) : 0,
            refillGallons: deltaGallons > 0 ? deltaGallons : 0,
            intervalType: intervalTypeOf(deltaGallons),
        };
    });
    const consumedGallons = intervals.reduce((total, interval) => total + interval.consumedGallons, 0);
    return {
        tankId: (0, exports.tankMovementKey)(tank),
        tankName: tank.name,
        tankReference: tank.tableReference || tank.name,
        contentType: tank.contentType,
        selectedMovements: sortedMovements,
        intervals,
        consumedGallons: round(consumedGallons, DECIMALS_GALLONS),
        initialMeasure: sortedMovements[0]?.levelCentimeter ?? 0,
        finalMeasure: sortedMovements[sortedMovements.length - 1]?.levelCentimeter ?? 0,
        isComplete: intervals.length > 0,
    };
};
exports.calculateTankConsumption = calculateTankConsumption;
const totalByContentType = (calculations, contentTypes) => {
    const contentTypeSet = new Set(contentTypes);
    const total = calculations
        .filter((calculation) => contentTypeSet.has(calculation.contentType))
        .reduce((sum, calculation) => sum + calculation.consumedGallons, 0);
    return round(total, DECIMALS_GALLONS);
};
exports.totalByContentType = totalByContentType;
/**
 * Every tank with a marked reading, over its expanded span. A reading another
 * consume already uses is left out; one of the consume being edited stays.
 */
const computeTankCalculations = (input) => {
    const movementsByTank = (0, exports.groupTankMovementsByTank)(input.tanks, input.movements);
    const isFree = (movement) => !movement.consumedByConsumeId || movement.consumedByConsumeId === input.ignoredConsumeId;
    return input.tanks
        .map((tank) => {
        const movementKey = (0, exports.tankMovementKey)(tank);
        const selectedIds = new Set(input.selectionByTankKey[movementKey] ?? []);
        const span = (0, exports.expandSelectedMovements)(movementsByTank[movementKey] ?? [], selectedIds).filter(isFree);
        return (0, exports.calculateTankConsumption)(tank, span);
    })
        .filter((calculation) => calculation.selectedMovements.length > 0);
};
exports.computeTankCalculations = computeTankCalculations;
const intervalReferences = (tank) => tank.intervals.map((interval) => ({
    movementId: interval.endMovement._id,
    tankId: interval.endMovement.tankId,
    tankName: interval.endMovement.tankName,
    eventType: interval.endMovement.eventType,
    initialLevelCentimeter: interval.startLevelCentimeter,
    initialEffectiveGallons: round(interval.startEffectiveGallons, DECIMALS_GALLONS),
    levelCentimeter: interval.endLevelCentimeter,
    effectiveGallons: round(interval.endEffectiveGallons, DECIMALS_GALLONS),
    deltaGallons: interval.deltaGallons,
    consumedGallons: interval.consumedGallons,
    refillGallons: interval.refillGallons,
    intervalType: interval.intervalType,
    date: interval.endMovement.date,
    role: 'selected',
}));
/** The document a consume is saved as. */
const buildConsumePayload = (calculation) => {
    const { totalCubes } = calculation;
    const rate = (value) => (totalCubes > 0 ? round(value / totalCubes, DECIMALS_RATE) : 0);
    return {
        source: 'tank-movements',
        date: new Date(),
        orders: calculation.orders,
        measures: calculation.tanks.map((tank) => ({
            tank: tank.tankReference,
            tankId: tank.tankId,
            initialMeasure: tank.initialMeasure,
            finalMeasure: tank.finalMeasure,
            quantityConsumed: tank.consumedGallons,
            movementIds: tank.selectedMovements.map((movement) => movement._id),
        })),
        movementRefs: calculation.tanks.flatMap(intervalReferences),
        dispatchIds: calculation.dispatchIds,
        computedM3: calculation.computedM3,
        manualM3: calculation.manualM3,
        calculationNotes: calculation.calculationNotes,
        quantityPen: calculation.quantityPen,
        quantityGasohol: calculation.quantityGasohol,
        quantityPetroleo: calculation.quantityPetroleo,
        quantityGas: 0,
        penConsume: rate(calculation.quantityPen),
        fakePenConsume: rate(calculation.quantityPen),
        gasoholConsume: rate(calculation.quantityGasohol),
        petroleoConsume: rate(calculation.quantityPetroleo),
        gasConsume: 0,
        totalCubes,
    };
};
exports.buildConsumePayload = buildConsumePayload;
/** What would be saved, from the readings and dispatches as they are now. */
const computeConsume = (input) => {
    const calculations = (0, exports.computeTankCalculations)(input);
    const complete = calculations.filter((calculation) => calculation.isComplete);
    const computedM3 = round(input.dispatch.m3, DECIMALS_GALLONS);
    const manualM3 = input.manualM3 && input.manualM3 > 0 ? input.manualM3 : undefined;
    const totalCubes = manualM3 ?? computedM3;
    const problems = [
        ...(input.orders.length === 0 ? ['no-orders'] : []),
        ...(complete.length === 0 ? ['no-complete-tank'] : []),
        ...(totalCubes <= 0 ? ['no-cubes'] : []),
    ];
    const payload = (0, exports.buildConsumePayload)({
        orders: input.orders,
        tanks: complete,
        dispatchIds: input.dispatch.ids,
        computedM3,
        manualM3,
        totalCubes,
        quantityPen: (0, exports.totalByContentType)(complete, ['pen']),
        quantityGasohol: (0, exports.totalByContentType)(complete, ['gasohol']),
        quantityPetroleo: (0, exports.totalByContentType)(complete, ['petroleum', 'thermal_oil']),
        calculationNotes: input.calculationNotes?.trim() || undefined,
    });
    return {
        payload,
        tanks: complete,
        incompleteTanks: calculations.filter((calculation) => !calculation.isComplete).map((calculation) => calculation.tankName),
        problems,
    };
};
exports.computeConsume = computeConsume;
const COMPARED_FIGURES = ['quantityPen', 'quantityGasohol', 'quantityPetroleo', 'totalCubes'];
const FIGURE_TOLERANCE = 0.01;
/** Where the browser's figures differ from the server's (the server wins). */
const diffConsumeFigures = (browser, server) => COMPARED_FIGURES.flatMap((field) => {
    const browserValue = Number(browser[field] ?? 0);
    return Math.abs(browserValue - server[field]) > FIGURE_TOLERANCE ? [{ field, browser: browserValue, server: server[field] }] : [];
});
exports.diffConsumeFigures = diffConsumeFigures;
