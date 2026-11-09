"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateByWork = exports.paintSegments = exports.coveredIntervals = exports.progressByWork = exports.coverageMeters = exports.mergeIntervals = void 0;
const streetGeometry_1 = require("./streetGeometry");
/** Merges overlapping or adjacent intervals and drops degenerate ones. */
const mergeIntervals = (intervals) => {
    const clean = intervals
        .map(([from, to]) => [Number(from), Number(to)])
        .filter(([from, to]) => Number.isFinite(from) && Number.isFinite(to) && to > from)
        .sort((left, right) => left[0] - right[0]);
    if (clean.length === 0)
        return [];
    const merged = [clean[0]];
    clean.slice(1).forEach(([from, to]) => {
        const last = merged[merged.length - 1];
        if (from <= last[1])
            last[1] = Math.max(last[1], to);
        else
            merged.push([from, to]);
    });
    return merged;
};
exports.mergeIntervals = mergeIntervals;
const lengthOfIntervals = (intervals) => Math.round(intervals.reduce((total, [from, to]) => total + (to - from), 0) * 100) / 100;
/** Metres COVERED by the events, without counting repeats twice. */
const coverageMeters = (events) => lengthOfIntervals((0, exports.mergeIntervals)(events.map((event) => [event.fromM, event.toM])));
exports.coverageMeters = coverageMeters;
const clampToScope = (interval, scope) => {
    const from = Math.max(interval[0], scope.fromM);
    const to = Math.min(interval[1], scope.toM);
    return to > from ? [from, to] : null;
};
const selectIntervals = (events, filter) => events
    .filter((event) => event.workId === filter.workId && event.status === filter.status)
    .filter((event) => filter.rework === undefined || Boolean(event.rework) === filter.rework)
    .filter((event) => !filter.upToDate || !event.date || event.date <= filter.upToDate)
    .map((event) => clampToScope([event.fromM, event.toM], filter.scope))
    .filter((interval) => interval !== null);
/** Subtracts B from A on the line (pending must not overwrite approved). */
const subtract = (base, cut) => {
    let result = base;
    cut.forEach(([cutFrom, cutTo]) => {
        const next = [];
        result.forEach(([from, to]) => {
            if (cutTo <= from || cutFrom >= to) {
                next.push([from, to]);
                return;
            }
            if (cutFrom > from)
                next.push([from, cutFrom]);
            if (cutTo < to)
                next.push([cutTo, to]);
        });
        result = next;
    });
    return result;
};
/**
 * Progress per partida within the scope's contracted range.
 *
 * `upToDate` rebuilds the state at a date: it is what feeds the client report's
 * slider.
 */
const progressByWork = (params) => {
    const { events, scope, workIds, upToDate } = params;
    const scopeLength = Math.max(0, scope.toM - scope.fromM);
    return workIds.map((workId) => {
        const base = { workId, scope, upToDate };
        // Rework stays OUT of coverage: repaving the same stretch is not progress.
        const approved = (0, exports.mergeIntervals)(selectIntervals(events, { ...base, status: 'approved', rework: false }));
        const approvedM = lengthOfIntervals(approved);
        const reworkM = lengthOfIntervals((0, exports.mergeIntervals)(selectIntervals(events, { ...base, status: 'approved', rework: true })));
        const pending = (0, exports.mergeIntervals)(selectIntervals(events, { ...base, status: 'pending' }));
        return {
            workId,
            approvedM,
            pendingM: lengthOfIntervals(subtract(pending, approved)),
            reworkM,
            pct: scopeLength > 0 ? Math.round((approvedM / scopeLength) * 100) : 0,
        };
    });
};
exports.progressByWork = progressByWork;
/**
 * The APPROVED intervals of an axis within the scope, merged, without geometry.
 * It is `paintSegments` for whoever does not draw on the map: the client
 * report's km strip (F8) and any reading by chainage.
 */
const coveredIntervals = (params) => (0, exports.mergeIntervals)(selectIntervals(params.events, {
    workId: params.workId,
    status: 'approved',
    scope: params.scope,
    upToDate: params.upToDate,
}));
exports.coveredIntervals = coveredIntervals;
/**
 * Stretches to draw for a partida. Approved is solid and pending is hatched;
 * pending NEVER overwrites approved (if they overlap, approved wins and the
 * hatching covers only what it adds).
 */
const paintSegments = (params) => {
    const { line, events, workId, scope, upToDate } = params;
    const base = { workId, scope, upToDate };
    const approved = (0, exports.mergeIntervals)(selectIntervals(events, { ...base, status: 'approved' }));
    const pending = subtract((0, exports.mergeIntervals)(selectIntervals(events, { ...base, status: 'pending' })), approved);
    const build = (intervals, state) => intervals
        .map(([fromM, toM]) => ({ fromM, toM, state, points: (0, streetGeometry_1.sliceLine)(line, fromM, toM) }))
        .filter((segment) => segment.points.length >= 2);
    return [...build(approved, 'approved'), ...build(pending, 'pending')];
};
exports.paintSegments = paintSegments;
/**
 * The work's total per axis: what the client sees as "imprimación 62 %".
 *
 * It adds by SCOPE, not by street: a street split into two scopes with
 * different partidas contributes to each only its own piece. Adding by street
 * would inflate the denominator with metres that partida never had contracted.
 */
const aggregateByWork = (params) => {
    const totals = new Map();
    (params.scopes ?? []).forEach((scope) => {
        const rows = (0, exports.progressByWork)({
            events: params.eventsByStreet(scope.streetId),
            scope: { fromM: scope.fromM, toM: scope.toM },
            workIds: scope.workIds ?? [],
            upToDate: params.upToDate,
        });
        const scopeLength = Math.max(0, scope.toM - scope.fromM);
        rows.forEach((row) => {
            const current = totals.get(row.workId) ?? { approvedM: 0, totalM: 0 };
            current.approvedM += row.approvedM;
            current.totalM += scopeLength;
            totals.set(row.workId, current);
        });
    });
    return Array.from(totals.entries()).map(([workId, value]) => ({
        workId,
        approvedM: Math.round(value.approvedM * 100) / 100,
        totalM: Math.round(value.totalM * 100) / 100,
        pct: value.totalM > 0 ? Math.round((value.approvedM / value.totalM) * 100) : 0,
    }));
};
exports.aggregateByWork = aggregateByWork;
