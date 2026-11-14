"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregatesLineOf = exports.readingLabelOf = exports.orderLabelOf = exports.contentLabelOf = exports.MAX_PERIOD_DAYS = void 0;
exports.resolveDraftPeriod = resolveDraftPeriod;
exports.orderRowOf = orderRowOf;
exports.readingRowsOf = readingRowsOf;
exports.selectionFromTramos = selectionFromTramos;
exports.reviewFindingsOf = reviewFindingsOf;
exports.reviewBlocksOf = reviewBlocksOf;
const consumeConstants_1 = require("./consumeConstants");
const tankMovementDates_1 = require("./tankMovementDates");
const toolNumber_1 = require("./toolNumber");
const consumeEngine_1 = require("./consumeEngine");
/**
 * The rows of a consume draft for Lilachat (José, 30/10/2026: Wilson sees
 * there what he sees today on the screen). Pure: the loaders feed it, agentes
 * turns `id`/`etiqueta`/`detalle` into the options of the form.
 */
const LIMA = 'America/Lima';
const DEFAULT_PERIOD_DAYS = 7;
exports.MAX_PERIOD_DAYS = 31;
const MAX_PHOTOS = 6;
const INPUT_DATE = /^\d{4}-\d{2}-\d{2}$/;
const dayMonth = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', timeZone: LIMA });
const hourMinute = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: LIMA });
const dayMonthOf = (value) => dayMonth.format(new Date(value));
const DAY_MS = 86400000;
const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
function resolveDraftPeriod(args, today) {
    const from = args.desde ?? (args.hasta ? args.hasta : (0, tankMovementDates_1.shiftPeruInputDate)(today, -DEFAULT_PERIOD_DAYS));
    const to = args.hasta ?? (args.desde ? args.desde : today);
    if (!INPUT_DATE.test(from) || !INPUT_DATE.test(to))
        return { ok: false, message: 'Las fechas van como AAAA-MM-DD.' };
    if (from > to)
        return { ok: false, message: '«desde» no puede ser posterior a «hasta».' };
    if (daysBetween(from, to) > exports.MAX_PERIOD_DAYS)
        return { ok: false, message: `El periodo puede tener hasta ${exports.MAX_PERIOD_DAYS} días.` };
    return { ok: true, period: { desde: from, hasta: to } };
}
const contentLabelOf = (content) => content === 'pen' ? 'PEN' : content === 'gasohol' ? 'Gasohol' : content === 'other' ? 'Otro' : 'Petróleo';
exports.contentLabelOf = contentLabelOf;
const orderLabelOf = (order) => [order.cliente || 'Sin cliente', order.obra || 'Sin obra'].join(' · ');
exports.orderLabelOf = orderLabelOf;
function orderRowOf(input) {
    const { order, m3, dispatchCount, usedOn } = input;
    const base = { id: String(order._id), etiqueta: (0, exports.orderLabelOf)(order) };
    if (usedOn)
        return { ...base, detalle: `Usado en el consumo del ${dayMonthOf(usedOn)}`, bloqueado: true };
    const parts = [
        order.fechaProgramacion ? dayMonthOf(order.fechaProgramacion) : 'Sin fecha',
        order.design || order.tipoMAC || '-',
        `${(0, toolNumber_1.num)(m3)} m³`,
        `${dispatchCount} ${dispatchCount === 1 ? 'despacho' : 'despachos'}`,
        ...(order.isProjected && order.sourceCompanyName ? [`de ${order.sourceCompanyName}`] : []),
    ];
    return { ...base, detalle: parts.join(' · ') };
}
const readingLabelOf = (movement) => `${dayMonthOf(movement.date)} ${hourMinute.format(new Date(movement.date))} · ${(0, toolNumber_1.num)(movement.levelCentimeter)} cm · ${(0, toolNumber_1.num)(Math.round(movement.effectiveGallons))} gl`;
exports.readingLabelOf = readingLabelOf;
const stepOf = (movement, previous) => {
    if (!previous)
        return 'Primer punto';
    const delta = Math.round(movement.effectiveGallons - previous.effectiveGallons);
    if (delta > 0)
        return `+${(0, toolNumber_1.num)(delta)} gl recarga`;
    return delta < 0 ? `−${(0, toolNumber_1.num)(-delta)} gl` : 'Sin cambio';
};
/** One tank's readings, in date order, with the step against the previous one. */
function readingRowsOf(tankKey, movements, photoUrlsByMovementId) {
    const ordered = [...movements].sort(consumeEngine_1.compareReadings);
    return ordered.map((movement, index) => {
        const photos = (photoUrlsByMovementId[movement._id] ?? []).slice(0, MAX_PHOTOS);
        const detail = [stepOf(movement, ordered[index - 1]), movement.note?.trim(), movement.deviceName?.trim()].filter(Boolean).join(' · ');
        return {
            id: movement._id,
            tanqueId: tankKey,
            etiqueta: (0, exports.readingLabelOf)(movement),
            detalle: detail,
            ...(photos.length > 0 ? { foto: photos[0], fotos: photos } : {}),
            ...(movement.consumedByConsumeId ? { bloqueada: true } : {}),
        };
    });
}
/** The marked readings by tank; a row with neither end does not enter. */
function selectionFromTramos(tramos) {
    const selectionByTankKey = {};
    const singlePointTankIds = [];
    tramos.forEach((tramo) => {
        const ids = [tramo.inicioId, tramo.finId].filter((id) => Boolean(id));
        if (ids.length === 0)
            return;
        selectionByTankKey[tramo.tanqueId] = Array.from(new Set(ids));
        if (ids.length === 1)
            singlePointTankIds.push(tramo.tanqueId);
    });
    return { selectionByTankKey, singlePointTankIds };
}
const PROBLEM_WARNINGS = {
    'no-orders': 'Falta elegir al menos un pedido.',
    'no-complete-tank': 'Falta un tanque con inicio y fin.',
    'no-cubes': 'No hay m³: elige pedidos con despachos o escribe los m³.',
};
/** What blocks saving (conflicts) and what to look at before sending (warnings). */
function reviewFindingsOf(input) {
    const conflicts = [
        ...input.usedOrders.map((order) => `El pedido ${order.etiqueta} ya está en el consumo del ${dayMonthOf(order.usedOn)}.`),
        ...(input.missingOrderIds.length > 0 ? [`Un pedido elegido no está en el periodo: ${input.missingOrderIds.join(', ')}.`] : []),
        ...input.takenReadings.map((label) => `La lectura ${label} ya está en otro consumo.`),
    ];
    const variance = input.variancePct;
    const warnings = [
        ...input.problems.map((problem) => PROBLEM_WARNINGS[problem]),
        ...input.incompleteTanks.map((tankName) => `${tankName} tiene un solo punto: marca el inicio y el fin.`),
        ...(variance != null && Math.abs(variance) > consumeConstants_1.CONSUME_RATE_VARIANCE_WARN_PCT
            ? [`El gl/m³ se desvía ${variance > 0 ? '+' : ''}${(0, toolNumber_1.num)(variance)} % del promedio (umbral ±${consumeConstants_1.CONSUME_RATE_VARIANCE_WARN_PCT} %).`]
            : []),
    ];
    return { conflictos: conflicts, avisos: warnings };
}
/** Lilachat's kit (agentes, 30/10/2026): limits per field and at most 8 blocks. */
const MAX_BLOCKS = 8;
const MAX_ROWS = 12;
const LIMIT = { metricValue: 24, metricLabel: 80, rowLabel: 60, rowValue: 24, rowSub: 80, chipSub: 40, text: 300 };
const clip = (value, max) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);
const textBlocks = (texts, tone) => texts.map((text) => ({ type: 'text', text: clip(text, LIMIT.text), tone }));
function rateBlock(input) {
    const { variancePct, averageRatePerM3 } = input;
    const comparison = averageRatePerM3 != null && variancePct != null
        ? ` · promedio ${(0, toolNumber_1.num)(averageRatePerM3)} (${variancePct > 0 ? '+' : ''}${(0, toolNumber_1.num)(variancePct)} %)`
        : '';
    const outside = variancePct != null && Math.abs(variancePct) > consumeConstants_1.CONSUME_RATE_VARIANCE_WARN_PCT;
    return { type: 'metric', value: clip((0, toolNumber_1.num)(input.ratePerM3 ?? 0), LIMIT.metricValue), unit: 'gl/m³', label: clip(`gl/m³${comparison}`, LIMIT.metricLabel), tone: outside ? 'warn' : 'neutral' };
}
function tankRows(input) {
    const tankRowsList = input.tanks.slice(0, MAX_ROWS - 1).map((tank) => ({
        label: clip(tank.nombre, LIMIT.rowLabel),
        value: clip(`${(0, toolNumber_1.num)(tank.gl)} gl`, LIMIT.rowValue),
        sub: clip(`${(0, toolNumber_1.num)(tank.inicioCm)} → ${(0, toolNumber_1.num)(tank.finCm)} cm${tank.recargaGl > 0 ? ` · +${(0, toolNumber_1.num)(tank.recargaGl)} gl recarga` : ''}`, LIMIT.rowSub),
    }));
    const cubesSub = input.m3Manual ? `manual · despachados ${(0, toolNumber_1.num)(input.m3Despachados)}` : `${input.despachos} ${input.despachos === 1 ? 'despacho' : 'despachos'}`;
    return { type: 'rows', rows: [...tankRowsList, { label: 'm³', value: clip(`${(0, toolNumber_1.num)(input.m3)} m³`, LIMIT.rowValue), sub: clip(cubesSub, LIMIT.rowSub) }] };
}
/** What Lilachat draws above «Enviar»: an incomplete draft only says what is missing. */
function reviewBlocksOf(input) {
    if (!input.complete)
        return textBlocks(input.avisos, 'warn').slice(0, MAX_BLOCKS);
    const fuels = input.fuels.filter((fuel) => fuel.gl > 0);
    return [
        rateBlock(input),
        tankRows(input),
        ...(fuels.length > 0
            ? [{ type: 'chips', items: fuels.map((fuel) => ({ label: fuel.label, sub: clip(`${(0, toolNumber_1.num)(fuel.gl)} gl · ${(0, toolNumber_1.num)(fuel.glPorM3)} gl/m³`, LIMIT.chipSub) })) }]
            : []),
        ...aggregatesBlock(input.aggregates ?? []),
        ...textBlocks(input.conflictos, 'error'),
        ...textBlocks(input.avisos, 'warn'),
    ].slice(0, MAX_BLOCKS);
}
/** One line per client of what the consume takes from its stock. Pure. */
const aggregatesLineOf = (preview) => `${preview.client}: ${preview.materials.map((material) => `${material.name} ${(0, toolNumber_1.num)(material.quantity)}`).join(' · ')}`;
exports.aggregatesLineOf = aggregatesLineOf;
function aggregatesBlock(previews) {
    const rows = previews.flatMap((preview) => preview.materials.map((material) => ({
        label: clip(material.name, LIMIT.rowLabel),
        value: clip(`${(0, toolNumber_1.num)(material.quantity)} m³`, LIMIT.rowValue),
        sub: clip(`Agregados · ${preview.client}`, LIMIT.rowSub),
    })));
    return rows.length > 0 ? [{ type: 'rows', rows: rows.slice(0, MAX_ROWS) }] : [];
}
