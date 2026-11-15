"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stationLabel = exports.kmLabel = exports.cutoffDates = exports.kmStrip = void 0;
const streetProgress_1 = require("./streetProgress");
const partidaColors_1 = require("./partidaColors");
const scopeMetrics_1 = require("./scopeMetrics");
const round2 = (value) => Math.round(value * 100) / 100;
/** The scope's axis: its tags if it has any, otherwise its partidas. */
const workIdsOf = (scope) => (scope.tagIds ?? []).length > 0 ? scope.tagIds : scope.partidaIds ?? [];
const buildContext = (params) => {
    const tagById = new Map(params.tags.map((tag) => [String(tag._id), tag]));
    const partidaById = new Map(params.partidas.map((partida) => [String(partida._id), partida]));
    const labelOf = (workId) => tagById.get(workId)?.name ?? partidaById.get(workId)?.description ?? 'Sin clasificar';
    const colorOf = (workId) => tagById.get(workId)?.color ?? (0, partidaColors_1.colorForPartida)(workId, labelOf(workId));
    const eventsOf = (streetId) => params.progress
        .filter((record) => record.streetId === streetId)
        .map((record) => ({
        workId: record.tagId || record.partidaId || '',
        fromM: record.fromM,
        toM: record.toM,
        // The client only receives approved work (`clientStreets` already trims it).
        status: 'approved',
        date: record.date,
        rework: record.rework,
    }));
    return { params, labelOf, colorOf, eventsOf };
};
const streetSegments = (context, street) => {
    const events = context.eventsOf(street._id);
    const scopes = context.params.scopes.filter((scope) => scope.streetId === street._id);
    const segments = [];
    for (const scope of scopes) {
        for (const workId of workIdsOf(scope)) {
            const intervals = (0, streetProgress_1.coveredIntervals)({
                events,
                workId,
                scope: { fromM: scope.fromM, toM: scope.toM },
                upToDate: context.params.upToDate,
            });
            for (const [fromM, toM] of intervals) {
                segments.push({ workId, label: context.labelOf(workId), color: context.colorOf(workId), fromM, toM });
            }
        }
    }
    return segments;
};
const buildStreet = (context, street) => {
    const segments = streetSegments(context, street);
    const frenteM = segments.reduce((farthest, segment) => (farthest === null || segment.toM > farthest ? segment.toM : farthest), null);
    return { streetId: street._id, name: street.name, lengthM: street.lengthM, segments, frenteM };
};
/** Area of a layer, street by street: each one is measured with its own width. */
const areaOf = (context, workId) => {
    const { params } = context;
    let area = 0;
    let measured = false;
    for (const street of params.streets) {
        const scopes = params.scopes.filter((scope) => scope.streetId === street._id && workIdsOf(scope).includes(workId));
        const width = scopes.length > 0 ? (0, scopeMetrics_1.effectiveWidthM)(scopes[0], street) : null;
        if (!width)
            continue;
        const total = (0, streetProgress_1.aggregateByWork)({
            scopes: scopes.map((scope) => ({ streetId: scope.streetId, fromM: scope.fromM, toM: scope.toM, workIds: [workId] })),
            eventsByStreet: context.eventsOf,
            upToDate: params.upToDate,
        })[0];
        area += (total?.approvedM ?? 0) * width;
        measured = true;
    }
    return measured ? round2(area) : null;
};
const buildLegend = (context) => (0, streetProgress_1.aggregateByWork)({
    scopes: context.params.scopes.map((scope) => ({
        streetId: scope.streetId,
        fromM: scope.fromM,
        toM: scope.toM,
        workIds: workIdsOf(scope),
    })),
    eventsByStreet: context.eventsOf,
    upToDate: context.params.upToDate,
}).map((total) => ({
    workId: total.workId,
    label: context.labelOf(total.workId),
    color: context.colorOf(total.workId),
    approvedM: total.approvedM,
    m2: areaOf(context, total.workId),
    pct: total.pct,
}));
const kmStrip = (params) => {
    const context = buildContext(params);
    const streets = params.streets.map((street) => buildStreet(context, street));
    return { streets, legend: buildLegend(context) };
};
exports.kmStrip = kmStrip;
/** Days with progress, newest to oldest: the cutoff selector. */
const cutoffDates = (progress) => Array.from(new Set(progress.map((record) => record.date).filter((date) => Boolean(date))))
    .sort()
    .reverse();
exports.cutoffDates = cutoffDates;
/** The chainage as on the drawings: «Km 0+650». */
const kmLabel = (meters) => {
    const wholeMeters = Math.round(meters);
    const km = Math.floor(wholeMeters / 1000);
    const remainder = wholeMeters - km * 1000;
    return `Km ${km}+${String(remainder).padStart(3, '0')}`;
};
exports.kmLabel = kmLabel;
/** The chainage without the «Km»: «0+650», as a stretch is named («0+040 a 0+150»). */
const stationLabel = (meters) => (0, exports.kmLabel)(meters).slice('Km '.length);
exports.stationLabel = stationLabel;
