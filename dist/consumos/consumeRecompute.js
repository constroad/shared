"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toEngineMovement = exports.toEngineTank = exports.selectionFromConsume = exports.CONSUME_NOT_COMPUTABLE_MESSAGE = void 0;
exports.recomputeConsume = recomputeConsume;
const consumeEngine_1 = require("./consumeEngine");
exports.CONSUME_NOT_COMPUTABLE_MESSAGE = 'Con las lecturas guardadas, el consumo no tiene un tanque con inicio y fin, o no tiene m³. Vuelve a cargar la pantalla.';
/** What the person chose: the marked readings by tank and the orders. Pure. */
const selectionFromConsume = (consume) => ({
    orderIds: Array.from(new Set((consume.orders ?? []).map((order) => order.orderId).filter(Boolean))),
    selectionByTankKey: (consume.measures ?? []).reduce((selection, measure) => {
        if (!measure.tankId)
            return selection;
        const current = selection[measure.tankId] ?? [];
        return { ...selection, [measure.tankId]: Array.from(new Set([...current, ...(measure.movementIds ?? [])])) };
    }, {}),
});
exports.selectionFromConsume = selectionFromConsume;
const toEngineTank = (tank) => ({
    _id: String(tank._id),
    name: tank.name,
    tableReference: tank.tableReference,
    contentType: tank.contentType,
    ...(tank.sharedTankId ? { sharedTankId: tank.sharedTankId } : {}),
});
exports.toEngineTank = toEngineTank;
const toEngineMovement = (row) => ({
    _id: String(row._id),
    tankId: row.tankId,
    tankName: row.tankName,
    eventType: row.eventType,
    levelCentimeter: row.levelCentimeter,
    effectiveGallons: row.effectiveGallons,
    date: new Date(row.date).toISOString(),
    ...(row.createdAt ? { createdAt: new Date(row.createdAt).toISOString() } : {}),
    ...(row.consumedByConsumeId ? { consumedByConsumeId: row.consumedByConsumeId, isConsumed: true } : {}),
});
exports.toEngineMovement = toEngineMovement;
/**
 * The consume as it is saved: recomputed by the engine over the database. A
 * legacy consume (typed by hand, no readings) is saved as it came.
 */
async function recomputeConsume(params, deps) {
    const { companyId, consume, ignoredConsumeId } = params;
    if (consume.source !== 'tank-movements')
        return consume;
    const selection = (0, exports.selectionFromConsume)(consume);
    const engineData = await deps.loadEngineData(companyId, selection);
    const outcome = (0, consumeEngine_1.computeConsume)({
        ...engineData,
        selectionByTankKey: selection.selectionByTankKey,
        ignoredConsumeId,
        orders: consume.orders ?? [],
        manualM3: consume.manualM3,
        calculationNotes: consume.calculationNotes,
    });
    if (outcome.problems.includes('no-complete-tank') || outcome.problems.includes('no-cubes')) {
        throw new Error(exports.CONSUME_NOT_COMPUTABLE_MESSAGE);
    }
    const differences = (0, consumeEngine_1.diffConsumeFigures)(consume, {
        quantityPen: outcome.payload.quantityPen,
        quantityGasohol: outcome.payload.quantityGasohol,
        quantityPetroleo: outcome.payload.quantityPetroleo,
        totalCubes: outcome.payload.totalCubes,
    });
    if (differences.length > 0) {
        deps.log(`[consume] ${companyId}: the server recomputed figures that differ from the browser's ${JSON.stringify(differences)}`);
    }
    const { date: _computedAt, orders: _orders, ...figures } = outcome.payload;
    return { ...consume, ...figures };
}
