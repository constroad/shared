import { type LatLng } from './streetGeometry';
/**
 * Progress of a street over measures (LRS).
 *
 * Each working day records an EVENT `{workId, fromM, toM, date, status}`.
 * Progress is not a number that gets overwritten: it is the union of those
 * intervals. That is why two crews do not overwrite each other, rework does not
 * contradict the percentage, and any date can be rebuilt (the drawing's
 * "día 1 / día 2 / día 3").
 *
 * ## `workId` is THE WORK AXIS, which is why it is not called `partidaId`
 *
 * It was called that until 30/08/2026, when the map started recording progress
 * by work TAG (`work-tag`) instead of by contracted partida. The field ended up
 * carrying tags under a partida name, the kind of lie the next reader pays for:
 * they would look for the partida and find a `work-tag`.
 *
 * It is an OPAQUE id on purpose. The engine does not care what it accumulates
 * against —a tag, a partida, whatever comes—: only that two events of the same
 * axis merge and those of different axes do not mix. What goes there is decided
 * at the edge (`eventsOfStreet` in the section), which does know the
 * difference: **only the partida moves the contract's executed metrado.**
 *
 * Pure module: it touches neither Mongo nor the map.
 */
export type ProgressStatus = 'pending' | 'approved' | 'rejected';
export interface StreetProgressEvent {
    workId: string;
    fromM: number;
    toM: number;
    status: ProgressStatus;
    /** `YYYY-MM-DD`. Compared as a STRING: comparing ISO date-only values is safe
     *  and avoids the one-day shift that building a `Date` causes (portal-pitfalls §1). */
    date?: string;
    /** An already covered stretch was worked again (resurfacing, rework). It adds
     *  real metrado but does NOT extend coverage. */
    rework?: boolean;
}
export interface StreetScope {
    fromM: number;
    toM: number;
}
export type Interval = [number, number];
/** Merges overlapping or adjacent intervals and drops degenerate ones. */
export declare const mergeIntervals: (intervals: Interval[]) => Interval[];
/** Metres COVERED by the events, without counting repeats twice. */
export declare const coverageMeters: (events: StreetProgressEvent[]) => number;
export interface WorkProgressRow {
    workId: string;
    /** Covered and approved metres within the scope. */
    approvedM: number;
    /** Metres added by not-yet-approved events (without overwriting approved). */
    pendingM: number;
    /** Metres reworked over already covered stretches (they do not raise the %). */
    reworkM: number;
    /** Approved coverage over the SCOPE length, 0–100. */
    pct: number;
}
/**
 * Progress per partida within the scope's contracted range.
 *
 * `upToDate` rebuilds the state at a date: it is what feeds the client report's
 * slider.
 */
export declare const progressByWork: (params: {
    events: StreetProgressEvent[];
    scope: StreetScope;
    workIds: string[];
    upToDate?: string;
}) => WorkProgressRow[];
/**
 * The APPROVED intervals of an axis within the scope, merged, without geometry.
 * It is `paintSegments` for whoever does not draw on the map: the client
 * report's km strip (F8) and any reading by chainage.
 */
export declare const coveredIntervals: (params: {
    events: StreetProgressEvent[];
    workId: string;
    scope: StreetScope;
    upToDate?: string;
}) => Interval[];
export interface PaintSegment {
    fromM: number;
    toM: number;
    state: 'approved' | 'pending';
    points: LatLng[];
}
/**
 * Stretches to draw for a partida. Approved is solid and pending is hatched;
 * pending NEVER overwrites approved (if they overlap, approved wins and the
 * hatching covers only what it adds).
 */
export declare const paintSegments: (params: {
    line: LatLng[];
    events: StreetProgressEvent[];
    workId: string;
    scope: StreetScope;
    upToDate?: string;
}) => PaintSegment[];
export interface WorkTotals {
    workId: string;
    /** Approved metres adding ALL the scopes where the partida applies. */
    approvedM: number;
    /** Contracted metres of the partida (sum of the scopes that include it). */
    totalM: number;
    pct: number;
}
/**
 * The work's total per axis: what the client sees as "imprimación 62 %".
 *
 * It adds by SCOPE, not by street: a street split into two scopes with
 * different partidas contributes to each only its own piece. Adding by street
 * would inflate the denominator with metres that partida never had contracted.
 */
export declare const aggregateByWork: (params: {
    scopes: Array<{
        streetId: string;
        fromM: number;
        toM: number;
        workIds: string[];
    }>;
    eventsByStreet: (streetId: string) => StreetProgressEvent[];
    upToDate?: string;
}) => WorkTotals[];
