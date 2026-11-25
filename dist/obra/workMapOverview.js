"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.narrowToStage = exports.workMapOverview = void 0;
const kmStrip_1 = require("./kmStrip");
const streetProgress_1 = require("./streetProgress");
const progressTimeline_1 = require("./progressTimeline");
const ASPHALT_LAYER = /asfalt|carpeta/i;
const COMPLETE_PCT = 100;
const NO_PROGRESS = 'Sin avance a esta fecha';
const MAX_STATUS_PARTS = 2;
const whole = (value) => value.toLocaleString('en-US', { maximumFractionDigits: 0 });
const oneDecimal = (value) => Math.round(value * 10) / 10;
const worksOf = (scope) => scope.tagIds.length > 0 ? scope.tagIds : scope.partidaIds;
const eventsOf = (workStreets, streetId) => workStreets.progress
    .filter((record) => record.streetId === streetId)
    .map((record) => ({
    workId: record.tagId || record.partidaId,
    fromM: record.fromM,
    toM: record.toM,
    status: 'approved',
    date: record.date,
    rework: record.rework,
}));
const totalsOfStreet = (workStreets, streetId, upToDate) => (0, streetProgress_1.aggregateByWork)({
    scopes: workStreets.scopes
        .filter((scope) => scope.streetId === streetId)
        .map((scope) => ({ streetId, fromM: scope.fromM, toM: scope.toM, workIds: worksOf(scope) })),
    eventsByStreet: (id) => eventsOf(workStreets, id),
    upToDate,
});
const leadLayer = (layers) => {
    const named = layers.find((layer) => ASPHALT_LAYER.test(layer.label));
    const layer = named ?? [...layers].sort((left, right) => right.approvedM - left.approvedM)[0];
    if (!layer)
        return null;
    return layer.m2 !== null
        ? { label: layer.label, value: whole(layer.m2), unit: 'm²' }
        : { label: layer.label, value: whole(layer.approvedM), unit: 'm' };
};
const lastDayOf = (workStreets, upToDate) => {
    const events = workStreets.progress.map((record) => ({
        workId: record.tagId || record.partidaId,
        fromM: record.fromM,
        toM: record.toM,
        status: 'approved',
        date: record.date,
    }));
    const days = (0, progressTimeline_1.progressDays)(events).filter((day) => !upToDate || day.date <= upToDate);
    const last = days[days.length - 1];
    return last ? { date: last.date, number: last.dayNumber } : null;
};
const workMapOverview = (params) => {
    const { workStreets, partidas, upToDate } = params;
    const strip = (0, kmStrip_1.kmStrip)({ ...workStreets, partidas, upToDate });
    const nameOf = (workId) => strip.legend.find((layer) => layer.workId === workId)?.label ?? 'Capa';
    const streets = strip.streets.map((street) => {
        const totals = totalsOfStreet(workStreets, street.streetId, upToDate);
        const done = totals.length > 0 && totals.every((total) => total.pct >= COMPLETE_PCT);
        const started = totals.filter((total) => total.pct > 0);
        const furthest = (workId) => Math.max(0, ...street.segments.filter((segment) => segment.workId === workId).map((segment) => segment.toM));
        const parts = started
            .slice(-MAX_STATUS_PARTS)
            .map((total) => total.pct >= COMPLETE_PCT
            ? `${nameOf(total.workId)} completa`
            : `${nameOf(total.workId)} hasta ${(0, kmStrip_1.kmLabel)(furthest(total.workId))}`);
        const length = Math.max(1, street.lengthM);
        return {
            streetId: street.streetId,
            name: street.name,
            lengthM: street.lengthM,
            segments: street.segments.map((segment) => ({
                workId: segment.workId,
                color: segment.color,
                fromPct: (segment.fromM / length) * 100,
                widthPct: ((segment.toM - segment.fromM) / length) * 100,
            })),
            status: done ? 'Terminada' : parts.join(' · ') || NO_PROGRESS,
            done,
        };
    });
    const allTotals = workStreets.streets.flatMap((street) => totalsOfStreet(workStreets, street._id, upToDate));
    const metres = allTotals.reduce((total, work) => total + work.totalM, 0);
    const approved = allTotals.reduce((total, work) => total + work.approvedM, 0);
    const front = strip.streets
        .filter((street) => street.frenteM !== null && !streets.find((row) => row.streetId === street.streetId)?.done)
        .sort((left, right) => Number(right.frenteM) - Number(left.frenteM))[0];
    return {
        progressPct: metres > 0 ? oneDecimal((approved / metres) * 100) : 0,
        lead: leadLayer(strip.legend),
        streetsDone: streets.filter((street) => street.done).length,
        streetsTotal: streets.length,
        lastDay: lastDayOf(workStreets, upToDate),
        activeFront: front ? { street: front.name, meters: Number(front.frenteM) } : null,
        layers: strip.legend,
        streets,
    };
};
exports.workMapOverview = workMapOverview;
/** The work narrowed to one stage. An empty id is the whole work. */
const narrowToStage = (workStreets, stageId) => {
    if (!stageId)
        return workStreets;
    const scopes = workStreets.scopes.filter((scope) => scope.stageId === stageId);
    const streetIds = new Set(scopes.map((scope) => scope.streetId));
    return {
        ...workStreets,
        scopes,
        streets: workStreets.streets.filter((street) => streetIds.has(street._id)),
        progress: workStreets.progress.filter((record) => streetIds.has(record.streetId)),
    };
};
exports.narrowToStage = narrowToStage;
