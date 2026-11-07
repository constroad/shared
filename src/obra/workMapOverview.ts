import type { ClientWorkStreets } from './clientWorkStreets';
import { kmLabel, kmStrip, type KmStripLegendItem, type KmStripPartidaInput } from './kmStrip';
import { aggregateByWork, type StreetProgressEvent } from './streetProgress';
import { progressDays } from './progressTimeline';

/**
 * The figures of the «Mapa de la obra» page: overall progress, the lead layer,
 * finished streets, last working day and how far each street got. Everything
 * rewinds with the cut-off date, like the map itself.
 */

export type WorkStreetsPayload = ClientWorkStreets;

export interface WorkMapStreet {
  streetId: string;
  name: string;
  lengthM: number;
  segments: Array<{ workId: string; color: string; fromPct: number; widthPct: number }>;
  status: string;
  done: boolean;
}

export interface WorkMapOverview {
  progressPct: number;
  lead: { label: string; value: string; unit: string } | null;
  streetsDone: number;
  streetsTotal: number;
  lastDay: { date: string; number: number } | null;
  activeFront: { street: string; meters: number } | null;
  layers: KmStripLegendItem[];
  streets: WorkMapStreet[];
}

const ASPHALT_LAYER = /asfalt|carpeta/i;
const COMPLETE_PCT = 100;
const NO_PROGRESS = 'Sin avance a esta fecha';
const MAX_STATUS_PARTS = 2;

const whole = (value: number): string => value.toLocaleString('en-US', { maximumFractionDigits: 0 });

const oneDecimal = (value: number): number => Math.round(value * 10) / 10;

const worksOf = (scope: WorkStreetsPayload['scopes'][number]): string[] =>
  scope.tagIds.length > 0 ? scope.tagIds : scope.partidaIds;

const eventsOf = (workStreets: WorkStreetsPayload, streetId: string): StreetProgressEvent[] =>
  workStreets.progress
    .filter((record) => record.streetId === streetId)
    .map((record) => ({
      workId: record.tagId || record.partidaId,
      fromM: record.fromM,
      toM: record.toM,
      status: 'approved' as const,
      date: record.date,
      rework: record.rework,
    }));

const totalsOfStreet = (workStreets: WorkStreetsPayload, streetId: string, upToDate?: string) =>
  aggregateByWork({
    scopes: workStreets.scopes
      .filter((scope) => scope.streetId === streetId)
      .map((scope) => ({ streetId, fromM: scope.fromM, toM: scope.toM, workIds: worksOf(scope) })),
    eventsByStreet: (id) => eventsOf(workStreets, id),
    upToDate,
  });

const leadLayer = (layers: KmStripLegendItem[]): WorkMapOverview['lead'] => {
  const named = layers.find((layer) => ASPHALT_LAYER.test(layer.label));
  const layer = named ?? [...layers].sort((left, right) => right.approvedM - left.approvedM)[0];
  if (!layer) return null;
  return layer.m2 !== null
    ? { label: layer.label, value: whole(layer.m2), unit: 'm²' }
    : { label: layer.label, value: whole(layer.approvedM), unit: 'm' };
};

const lastDayOf = (workStreets: WorkStreetsPayload, upToDate?: string): WorkMapOverview['lastDay'] => {
  const events = workStreets.progress.map((record) => ({
    workId: record.tagId || record.partidaId,
    fromM: record.fromM,
    toM: record.toM,
    status: 'approved' as const,
    date: record.date,
  }));
  const days = progressDays(events).filter((day) => !upToDate || day.date <= upToDate);
  const last = days[days.length - 1];
  return last ? { date: last.date, number: last.dayNumber } : null;
};

export const workMapOverview = (params: {
  workStreets: WorkStreetsPayload;
  partidas: KmStripPartidaInput[];
  upToDate?: string;
}): WorkMapOverview => {
  const { workStreets, partidas, upToDate } = params;
  const strip = kmStrip({ ...workStreets, partidas, upToDate });
  const nameOf = (workId: string): string =>
    strip.legend.find((layer) => layer.workId === workId)?.label ?? 'Capa';

  const streets: WorkMapStreet[] = strip.streets.map((street) => {
    const totals = totalsOfStreet(workStreets, street.streetId, upToDate);
    const done = totals.length > 0 && totals.every((total) => total.pct >= COMPLETE_PCT);
    const started = totals.filter((total) => total.pct > 0);
    const furthest = (workId: string): number =>
      Math.max(0, ...street.segments.filter((segment) => segment.workId === workId).map((segment) => segment.toM));
    const parts = started
      .slice(-MAX_STATUS_PARTS)
      .map((total) =>
        total.pct >= COMPLETE_PCT
          ? `${nameOf(total.workId)} completa`
          : `${nameOf(total.workId)} hasta ${kmLabel(furthest(total.workId))}`
      );
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

/** The work narrowed to one stage. An empty id is the whole work. */
export const narrowToStage = (workStreets: WorkStreetsPayload, stageId: string): WorkStreetsPayload => {
  if (!stageId) return workStreets;
  const scopes = workStreets.scopes.filter((scope) => scope.stageId === stageId);
  const streetIds = new Set(scopes.map((scope) => scope.streetId));
  return {
    ...workStreets,
    scopes,
    streets: workStreets.streets.filter((street) => streetIds.has(street._id)),
    progress: workStreets.progress.filter((record) => streetIds.has(record.streetId)),
  };
};
