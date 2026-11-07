import {
  aggregateByWork,
  coveredIntervals,
  type StreetProgressEvent,
} from './streetProgress';
import { colorForPartida } from './partidaColors';
import { effectiveWidthM } from './scopeMetrics';

/**
 * The client report's "km strip" (F8): each street as a bar along its chainage,
 * segmented by the work axis that covered it, with the active front and the
 * legend in m².
 *
 * It is the reading the Stitch design brings ("Mapa Técnico de Avance
 * Geoespacial"), and spec §5 places it NEXT TO the real map, not instead of it:
 * the strip is read at a glance; the map is recognised.
 *
 * **There is no new engine.** Approved intervals per axis and totals come from
 * `streetProgress` —the same thing that paints the client map—; here they are
 * translated into something drawn without geometry. The axis is the TAG, with
 * the partida as fallback, just like in `WorkStreetsClientMap`.
 */

export interface KmStripStreetInput {
  _id: string;
  name: string;
  lengthM: number;
  widthM?: number | null;
}

export interface KmStripScopeInput {
  _id: string;
  streetId: string;
  fromM: number;
  toM: number;
  partidaIds?: string[];
  tagIds?: string[];
  widthM?: number | null;
}

export interface KmStripProgressInput {
  streetId: string;
  partidaId?: string;
  tagId?: string;
  fromM: number;
  toM: number;
  date?: string;
  rework?: boolean;
}

export interface KmStripTagInput {
  _id: string;
  name: string;
  color: string;
}

export interface KmStripPartidaInput {
  _id: string;
  description?: string;
}

export interface KmStripSegment {
  workId: string;
  label: string;
  color: string;
  fromM: number;
  toM: number;
}

export interface KmStripStreet {
  streetId: string;
  name: string;
  lengthM: number;
  segments: KmStripSegment[];
  /** The farthest metre worked on the street; `null` without progress. */
  frenteM: number | null;
}

export interface KmStripLegendItem {
  workId: string;
  label: string;
  color: string;
  approvedM: number;
  /** `null` when no width is loaded: area is never made up. */
  m2: number | null;
  /** Approved metres over the contracted ones for that axis, 0–100. */
  pct: number;
}

export interface KmStrip {
  streets: KmStripStreet[];
  legend: KmStripLegendItem[];
}

interface KmStripParams {
  streets: KmStripStreetInput[];
  scopes: KmStripScopeInput[];
  progress: KmStripProgressInput[];
  tags: KmStripTagInput[];
  partidas: KmStripPartidaInput[];
  /** Cutoff date (date-only): only what was worked up to that day counts. */
  upToDate?: string;
}

/** Lookups shared by the street and legend builders. */
interface KmStripContext {
  params: KmStripParams;
  labelOf: (workId: string) => string;
  colorOf: (workId: string) => string;
  eventsOf: (streetId: string) => StreetProgressEvent[];
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** The scope's axis: its tags if it has any, otherwise its partidas. */
const workIdsOf = (scope: KmStripScopeInput): string[] =>
  (scope.tagIds ?? []).length > 0 ? (scope.tagIds as string[]) : scope.partidaIds ?? [];

const buildContext = (params: KmStripParams): KmStripContext => {
  const tagById = new Map(params.tags.map((tag) => [String(tag._id), tag]));
  const partidaById = new Map(params.partidas.map((partida) => [String(partida._id), partida]));

  const labelOf = (workId: string): string =>
    tagById.get(workId)?.name ?? partidaById.get(workId)?.description ?? 'Sin clasificar';
  const colorOf = (workId: string): string =>
    tagById.get(workId)?.color ?? colorForPartida(workId, labelOf(workId));

  const eventsOf = (streetId: string): StreetProgressEvent[] =>
    params.progress
      .filter((record) => record.streetId === streetId)
      .map((record) => ({
        workId: record.tagId || record.partidaId || '',
        fromM: record.fromM,
        toM: record.toM,
        // The client only receives approved work (`clientStreets` already trims it).
        status: 'approved' as const,
        date: record.date,
        rework: record.rework,
      }));

  return { params, labelOf, colorOf, eventsOf };
};

const streetSegments = (context: KmStripContext, street: KmStripStreetInput): KmStripSegment[] => {
  const events = context.eventsOf(street._id);
  const scopes = context.params.scopes.filter((scope) => scope.streetId === street._id);
  const segments: KmStripSegment[] = [];

  for (const scope of scopes) {
    for (const workId of workIdsOf(scope)) {
      const intervals = coveredIntervals({
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

const buildStreet = (context: KmStripContext, street: KmStripStreetInput): KmStripStreet => {
  const segments = streetSegments(context, street);
  const frenteM = segments.reduce<number | null>(
    (farthest, segment) => (farthest === null || segment.toM > farthest ? segment.toM : farthest),
    null
  );
  return { streetId: street._id, name: street.name, lengthM: street.lengthM, segments, frenteM };
};

/** Area of a layer, street by street: each one is measured with its own width. */
const areaOf = (context: KmStripContext, workId: string): number | null => {
  const { params } = context;
  let area = 0;
  let measured = false;
  for (const street of params.streets) {
    const scopes = params.scopes.filter(
      (scope) => scope.streetId === street._id && workIdsOf(scope).includes(workId)
    );
    const width = scopes.length > 0 ? effectiveWidthM(scopes[0], street) : null;
    if (!width) continue;
    const total = aggregateByWork({
      scopes: scopes.map((scope) => ({ streetId: scope.streetId, fromM: scope.fromM, toM: scope.toM, workIds: [workId] })),
      eventsByStreet: context.eventsOf,
      upToDate: params.upToDate,
    })[0];
    area += (total?.approvedM ?? 0) * width;
    measured = true;
  }
  return measured ? round2(area) : null;
};

const buildLegend = (context: KmStripContext): KmStripLegendItem[] =>
  aggregateByWork({
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

export const kmStrip = (params: KmStripParams): KmStrip => {
  const context = buildContext(params);
  const streets = params.streets.map((street) => buildStreet(context, street));
  return { streets, legend: buildLegend(context) };
};

/** Days with progress, newest to oldest: the cutoff selector. */
export const cutoffDates = (progress: Array<{ date?: string }>): string[] =>
  Array.from(new Set(progress.map((record) => record.date).filter((date): date is string => Boolean(date))))
    .sort()
    .reverse();

/** The chainage as on the drawings: «Km 0+650». */
export const kmLabel = (meters: number): string => {
  const wholeMeters = Math.round(meters);
  const km = Math.floor(wholeMeters / 1000);
  const remainder = wholeMeters - km * 1000;
  return `Km ${km}+${String(remainder).padStart(3, '0')}`;
};

/** The chainage without the «Km»: «0+650», as a stretch is named («0+040 a 0+150»). */
export const stationLabel = (meters: number): string => kmLabel(meters).slice('Km '.length);
