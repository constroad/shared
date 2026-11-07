import { sliceLine, type LatLng } from './streetGeometry';

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
export const mergeIntervals = (intervals: Interval[]): Interval[] => {
  const clean = intervals
    .map(([from, to]) => [Number(from), Number(to)] as Interval)
    .filter(([from, to]) => Number.isFinite(from) && Number.isFinite(to) && to > from)
    .sort((left, right) => left[0] - right[0]);
  if (clean.length === 0) return [];

  const merged: Interval[] = [clean[0]];
  clean.slice(1).forEach(([from, to]) => {
    const last = merged[merged.length - 1];
    if (from <= last[1]) last[1] = Math.max(last[1], to);
    else merged.push([from, to]);
  });
  return merged;
};

const lengthOfIntervals = (intervals: Interval[]): number =>
  Math.round(intervals.reduce((total, [from, to]) => total + (to - from), 0) * 100) / 100;

/** Metres COVERED by the events, without counting repeats twice. */
export const coverageMeters = (events: StreetProgressEvent[]): number =>
  lengthOfIntervals(mergeIntervals(events.map((event) => [event.fromM, event.toM])));

const clampToScope = (interval: Interval, scope: StreetScope): Interval | null => {
  const from = Math.max(interval[0], scope.fromM);
  const to = Math.min(interval[1], scope.toM);
  return to > from ? [from, to] : null;
};

const selectIntervals = (
  events: StreetProgressEvent[],
  filter: {
    workId: string;
    status: ProgressStatus;
    scope: StreetScope;
    upToDate?: string;
    /** `true` = rework only; `false` = only those that extend coverage. */
    rework?: boolean;
  }
): Interval[] =>
  events
    .filter((event) => event.workId === filter.workId && event.status === filter.status)
    .filter((event) => filter.rework === undefined || Boolean(event.rework) === filter.rework)
    .filter((event) => !filter.upToDate || !event.date || event.date <= filter.upToDate)
    .map((event) => clampToScope([event.fromM, event.toM], filter.scope))
    .filter((interval): interval is Interval => interval !== null);

/** Subtracts B from A on the line (pending must not overwrite approved). */
const subtract = (base: Interval[], cut: Interval[]): Interval[] => {
  let result = base;
  cut.forEach(([cutFrom, cutTo]) => {
    const next: Interval[] = [];
    result.forEach(([from, to]) => {
      if (cutTo <= from || cutFrom >= to) {
        next.push([from, to]);
        return;
      }
      if (cutFrom > from) next.push([from, cutFrom]);
      if (cutTo < to) next.push([cutTo, to]);
    });
    result = next;
  });
  return result;
};

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
export const progressByWork = (params: {
  events: StreetProgressEvent[];
  scope: StreetScope;
  workIds: string[];
  upToDate?: string;
}): WorkProgressRow[] => {
  const { events, scope, workIds, upToDate } = params;
  const scopeLength = Math.max(0, scope.toM - scope.fromM);

  return workIds.map((workId) => {
    const base = { workId, scope, upToDate };
    // Rework stays OUT of coverage: repaving the same stretch is not progress.
    const approved = mergeIntervals(selectIntervals(events, { ...base, status: 'approved', rework: false }));
    const approvedM = lengthOfIntervals(approved);
    const reworkM = lengthOfIntervals(
      mergeIntervals(selectIntervals(events, { ...base, status: 'approved', rework: true }))
    );
    const pending = mergeIntervals(selectIntervals(events, { ...base, status: 'pending' }));

    return {
      workId,
      approvedM,
      pendingM: lengthOfIntervals(subtract(pending, approved)),
      reworkM,
      pct: scopeLength > 0 ? Math.round((approvedM / scopeLength) * 100) : 0,
    };
  });
};

/**
 * The APPROVED intervals of an axis within the scope, merged, without geometry.
 * It is `paintSegments` for whoever does not draw on the map: the client
 * report's km strip (F8) and any reading by chainage.
 */
export const coveredIntervals = (params: {
  events: StreetProgressEvent[];
  workId: string;
  scope: StreetScope;
  upToDate?: string;
}): Interval[] =>
  mergeIntervals(
    selectIntervals(params.events, {
      workId: params.workId,
      status: 'approved',
      scope: params.scope,
      upToDate: params.upToDate,
    })
  );

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
export const paintSegments = (params: {
  line: LatLng[];
  events: StreetProgressEvent[];
  workId: string;
  scope: StreetScope;
  upToDate?: string;
}): PaintSegment[] => {
  const { line, events, workId, scope, upToDate } = params;
  const base = { workId, scope, upToDate };
  const approved = mergeIntervals(selectIntervals(events, { ...base, status: 'approved' }));
  const pending = subtract(mergeIntervals(selectIntervals(events, { ...base, status: 'pending' })), approved);

  const build = (intervals: Interval[], state: PaintSegment['state']): PaintSegment[] =>
    intervals
      .map(([fromM, toM]) => ({ fromM, toM, state, points: sliceLine(line, fromM, toM) }))
      .filter((segment) => segment.points.length >= 2);

  return [...build(approved, 'approved'), ...build(pending, 'pending')];
};

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
export const aggregateByWork = (params: {
  scopes: Array<{ streetId: string; fromM: number; toM: number; workIds: string[] }>;
  eventsByStreet: (streetId: string) => StreetProgressEvent[];
  upToDate?: string;
}): WorkTotals[] => {
  const totals = new Map<string, { approvedM: number; totalM: number }>();

  (params.scopes ?? []).forEach((scope) => {
    const rows = progressByWork({
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
