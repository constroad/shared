"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareConsume = prepareConsume;
exports.reviewConsume = reviewConsume;
exports.registerConsume = registerConsume;
const consumeEngine_1 = require("./consumeEngine");
const consumeDraftRows_1 = require("./consumeDraftRows");
const consumeRateBaseline_1 = require("./consumeRateBaseline");
const tankMovementDates_1 = require("./tankMovementDates");
const promedioOf = (baseline) => baseline.averageRatePerM3 == null ? null : { glPorM3: Number(baseline.averageRatePerM3.toFixed(4)), muestras: baseline.sampleSize };
const periodOf = (args) => (0, consumeDraftRows_1.resolveDraftPeriod)(args, (0, tankMovementDates_1.todayPeruInputDate)());
async function prepareConsume(args, deps) {
    const resolved = periodOf(args);
    if (!resolved.ok)
        return resolved;
    const { period } = resolved;
    const [orders, usedOn, readings, baseline] = await Promise.all([
        deps.periodOrders(period),
        deps.usedOrders(),
        deps.periodReadings(period),
        deps.rateBaseline(),
    ]);
    const movementsByTank = (0, consumeEngine_1.groupTankMovementsByTank)(readings.tanks, readings.movements);
    const tanksWithReadings = readings.tanks.filter((tank) => (movementsByTank[(0, consumeEngine_1.tankMovementKey)(tank)] ?? []).length > 0);
    const tanques = tanksWithReadings.map((tank) => ({ id: (0, consumeEngine_1.tankMovementKey)(tank), nombre: tank.name, contenido: (0, consumeDraftRows_1.contentLabelOf)(tank.contentType) }));
    return {
        ok: true,
        value: {
            periodo: period,
            pedidos: orders.map((row) => (0, consumeDraftRows_1.orderRowOf)({ ...row, usedOn: usedOn.get(String(row.order._id)) })),
            tanques,
            lecturas: tanques.flatMap((tank) => (0, consumeDraftRows_1.readingRowsOf)(tank.id, movementsByTank[tank.id] ?? [], readings.photoUrlsByMovementId)),
            promedio: promedioOf(baseline),
            form: { defaults: { desde: period.desde, hasta: period.hasta, tramos: tanques.map((tank) => ({ tanqueId: tank.id })) } },
        },
    };
}
const refillOf = (tank) => Number(tank.intervals.reduce((total, interval) => total + interval.refillGallons, 0).toFixed(2));
function summaryOf(outcome, dispatchCount, baseline) {
    const { payload } = outcome;
    const rate = (gallons) => (payload.totalCubes > 0 ? Number((gallons / payload.totalCubes).toFixed(4)) : 0);
    return {
        m3: payload.totalCubes,
        m3Despachados: payload.computedM3,
        ...(payload.manualM3 ? { m3Manual: payload.manualM3 } : {}),
        despachos: dispatchCount,
        tanques: outcome.tanks.map((tank) => ({
            tanqueId: tank.tankId,
            nombre: tank.tankName,
            contenido: (0, consumeDraftRows_1.contentLabelOf)(tank.contentType),
            inicioCm: tank.initialMeasure,
            finCm: tank.finalMeasure,
            gl: tank.consumedGallons,
            recargaGl: refillOf(tank),
            glPorM3: rate(tank.consumedGallons),
        })),
        totales: { pen: payload.quantityPen, gasohol: payload.quantityGasohol, petroleo: payload.quantityPetroleo },
        glPorM3: { pen: payload.penConsume, gasohol: payload.gasoholConsume, petroleo: payload.petroleoConsume },
        recargasGl: Number(outcome.tanks.reduce((total, tank) => total + refillOf(tank), 0).toFixed(2)),
        promedio: promedioOf(baseline),
    };
}
async function computeDraft(args, period, deps, options = {}) {
    const { selectionByTankKey } = (0, consumeDraftRows_1.selectionFromTramos)(args.tramos);
    const [periodOrders, usedOn, engineData, baseline] = await Promise.all([
        deps.periodOrders(period),
        deps.usedOrders(),
        deps.engineData({ orderIds: args.pedidos, selectionByTankKey }),
        deps.rateBaseline(),
    ]);
    const chosen = periodOrders.filter((row) => args.pedidos.includes(String(row.order._id)));
    const chosenIds = new Set(chosen.map((row) => String(row.order._id)));
    const orders = chosen.map((row) => (0, consumeEngine_1.buildConsumeOrder)(row.order)).filter((order) => Boolean(order));
    const outcome = (0, consumeEngine_1.computeConsume)({ ...engineData, selectionByTankKey, orders, manualM3: args.m3Manual, calculationNotes: args.nota });
    const markedIds = new Set(Object.values(selectionByTankKey).flat());
    const currentRate = (0, consumeRateBaseline_1.sampleRatePerM3)(outcome.payload);
    const findings = (0, consumeDraftRows_1.reviewFindingsOf)({
        problems: outcome.problems,
        incompleteTanks: outcome.incompleteTanks,
        usedOrders: chosen.flatMap((row) => {
            const usedOnDate = usedOn.get(String(row.order._id));
            return usedOnDate ? [{ etiqueta: (0, consumeDraftRows_1.orderLabelOf)(row.order), usedOn: usedOnDate }] : [];
        }),
        missingOrderIds: args.pedidos.filter((orderId) => !chosenIds.has(orderId)),
        takenReadings: engineData.movements.filter((movement) => markedIds.has(movement._id) && movement.consumedByConsumeId).map(consumeDraftRows_1.readingLabelOf),
        variancePct: currentRate == null ? null : (0, consumeRateBaseline_1.computeRateVariancePct)(currentRate, baseline.averageRatePerM3),
    });
    const summary = summaryOf(outcome, engineData.dispatch.ids.length, baseline);
    const aggregates = options.withAggregates ? await deps.previewAggregates(orders) : [];
    const blocks = (0, consumeDraftRows_1.reviewBlocksOf)({
        aggregates,
        complete: !outcome.problems.some((problem) => problem !== 'no-cubes'),
        ratePerM3: currentRate,
        averageRatePerM3: baseline.averageRatePerM3,
        variancePct: currentRate == null ? null : (0, consumeRateBaseline_1.computeRateVariancePct)(currentRate, baseline.averageRatePerM3),
        tanks: summary.tanques,
        m3: summary.m3,
        m3Despachados: summary.m3Despachados,
        m3Manual: summary.m3Manual,
        despachos: summary.despachos,
        fuels: [
            { label: 'PEN', gl: summary.totales.pen, glPorM3: summary.glPorM3.pen },
            { label: 'Gasohol', gl: summary.totales.gasohol, glPorM3: summary.glPorM3.gasohol },
            { label: 'Petróleo', gl: summary.totales.petroleo, glPorM3: summary.glPorM3.petroleo },
        ],
        conflictos: findings.conflictos,
        avisos: findings.avisos,
    });
    return { outcome, findings, summary, blocks, aggregates };
}
async function reviewConsume(args, deps) {
    const resolved = periodOf(args);
    if (!resolved.ok)
        return resolved;
    const { findings, summary, blocks, aggregates } = await computeDraft(args, resolved.period, deps, { withAggregates: true });
    const agregados = aggregates.length > 0 ? { agregados: aggregates } : {};
    return { ok: true, value: { resumen: summary, avisos: findings.avisos, conflictos: findings.conflictos, blocks, ...agregados } };
}
/** Saves the consume Lila reviewed: same engine, same write path as the screen. */
async function registerConsume(args, author, deps) {
    const resolved = periodOf(args);
    if (!resolved.ok)
        return resolved;
    const { outcome, findings, summary } = await computeDraft(args, resolved.period, deps);
    if (findings.conflictos.length > 0)
        return { ok: false, message: findings.conflictos.join(' ') };
    if (outcome.problems.length > 0)
        return { ok: false, message: findings.avisos.slice(0, outcome.problems.length).join(' ') };
    const input = { ...outcome.payload, createdBy: { ...(author.name ? { name: author.name } : {}), via: 'lila' } };
    const saved = await deps.saveConsume(input);
    if (!saved.ok)
        return { ok: false, message: saved.message };
    const consumoId = String(saved.consume._id);
    const agregados = saved.aggregates ? { agregados: saved.aggregates } : {};
    return { ok: true, value: { consumoId, resumen: summary, enlace: await deps.consumeLink(consumoId), ...agregados } };
}
