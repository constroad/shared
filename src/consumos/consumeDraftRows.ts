import { CONSUME_RATE_VARIANCE_WARN_PCT } from './consumeConstants';
import type { TankContentType } from './tankModel';
import type { ConsumeMovementOrderListItem, ConsumeMovementRecord } from './consumeMovementFlow';
import { shiftPeruInputDate } from './tankMovementDates';
import { num } from './toolNumber';
import { compareReadings, type ConsumeProblem } from './consumeEngine';

/**
 * The rows of a consume draft for Lilachat (José, 30/10/2026: Wilson sees
 * there what he sees today on the screen). Pure: the loaders feed it, agentes
 * turns `id`/`etiqueta`/`detalle` into the options of the form.
 */

const LIMA = 'America/Lima';
const DEFAULT_PERIOD_DAYS = 7;
export const MAX_PERIOD_DAYS = 31;
const MAX_PHOTOS = 6;
const INPUT_DATE = /^\d{4}-\d{2}-\d{2}$/;

const dayMonth = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', timeZone: LIMA });
const hourMinute = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: LIMA });
const dayMonthOf = (value: string | Date): string => dayMonth.format(new Date(value));
const DAY_MS = 86_400_000;
const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

export type DraftPeriod = { desde: string; hasta: string };

export function resolveDraftPeriod(
  args: { desde?: string; hasta?: string },
  today: string
): { ok: true; period: DraftPeriod } | { ok: false; message: string } {
  const from = args.desde ?? (args.hasta ? args.hasta : shiftPeruInputDate(today, -DEFAULT_PERIOD_DAYS));
  const to = args.hasta ?? (args.desde ? args.desde : today);
  if (!INPUT_DATE.test(from) || !INPUT_DATE.test(to)) return { ok: false, message: 'Las fechas van como AAAA-MM-DD.' };
  if (from > to) return { ok: false, message: '«desde» no puede ser posterior a «hasta».' };
  if (daysBetween(from, to) > MAX_PERIOD_DAYS) return { ok: false, message: `El periodo puede tener hasta ${MAX_PERIOD_DAYS} días.` };
  return { ok: true, period: { desde: from, hasta: to } };
}

export const contentLabelOf = (content: TankContentType): string =>
  content === 'pen' ? 'PEN' : content === 'gasohol' ? 'Gasohol' : content === 'other' ? 'Otro' : 'Petróleo';

type DraftOrder = ConsumeMovementOrderListItem & { isProjected?: boolean; sourceCompanyName?: string };

export interface OrderRow {
  id: string;
  etiqueta: string;
  detalle: string;
  bloqueado?: true;
}

export const orderLabelOf = (order: DraftOrder): string =>
  [order.cliente || 'Sin cliente', order.obra || 'Sin obra'].join(' · ');

export function orderRowOf(input: { order: DraftOrder; m3: number; dispatchCount: number; usedOn?: string }): OrderRow {
  const { order, m3, dispatchCount, usedOn } = input;
  const base = { id: String(order._id), etiqueta: orderLabelOf(order) };
  if (usedOn) return { ...base, detalle: `Usado en el consumo del ${dayMonthOf(usedOn)}`, bloqueado: true };
  const parts = [
    order.fechaProgramacion ? dayMonthOf(order.fechaProgramacion) : 'Sin fecha',
    order.design || order.tipoMAC || '-',
    `${num(m3)} m³`,
    `${dispatchCount} ${dispatchCount === 1 ? 'despacho' : 'despachos'}`,
    ...(order.isProjected && order.sourceCompanyName ? [`de ${order.sourceCompanyName}`] : []),
  ];
  return { ...base, detalle: parts.join(' · ') };
}

export interface ReadingRow {
  id: string;
  tanqueId: string;
  etiqueta: string;
  detalle: string;
  foto?: string;
  fotos?: string[];
  bloqueada?: true;
}

export const readingLabelOf = (movement: ConsumeMovementRecord): string =>
  `${dayMonthOf(movement.date)} ${hourMinute.format(new Date(movement.date))} · ${num(movement.levelCentimeter)} cm · ${num(Math.round(movement.effectiveGallons))} gl`;

const stepOf = (movement: ConsumeMovementRecord, previous?: ConsumeMovementRecord): string => {
  if (!previous) return 'Primer punto';
  const delta = Math.round(movement.effectiveGallons - previous.effectiveGallons);
  if (delta > 0) return `+${num(delta)} gl recarga`;
  return delta < 0 ? `−${num(-delta)} gl` : 'Sin cambio';
};

/** One tank's readings, in date order, with the step against the previous one. */
export function readingRowsOf(
  tankKey: string,
  movements: ConsumeMovementRecord[],
  photoUrlsByMovementId: Record<string, string[]>
): ReadingRow[] {
  const ordered = [...movements].sort(compareReadings);
  return ordered.map((movement, index) => {
    const photos = (photoUrlsByMovementId[movement._id] ?? []).slice(0, MAX_PHOTOS);
    const detail = [stepOf(movement, ordered[index - 1]), movement.note?.trim(), movement.deviceName?.trim()].filter(Boolean).join(' · ');
    return {
      id: movement._id,
      tanqueId: tankKey,
      etiqueta: readingLabelOf(movement),
      detalle: detail,
      ...(photos.length > 0 ? { foto: photos[0], fotos: photos } : {}),
      ...(movement.consumedByConsumeId ? { bloqueada: true as const } : {}),
    };
  });
}

export interface DraftTramo {
  tanqueId: string;
  inicioId?: string;
  finId?: string;
}

/** The marked readings by tank; a row with neither end does not enter. */
export function selectionFromTramos(tramos: DraftTramo[]): { selectionByTankKey: Record<string, string[]>; singlePointTankIds: string[] } {
  const selectionByTankKey: Record<string, string[]> = {};
  const singlePointTankIds: string[] = [];
  tramos.forEach((tramo) => {
    const ids = [tramo.inicioId, tramo.finId].filter((id): id is string => Boolean(id));
    if (ids.length === 0) return;
    selectionByTankKey[tramo.tanqueId] = Array.from(new Set(ids));
    if (ids.length === 1) singlePointTankIds.push(tramo.tanqueId);
  });
  return { selectionByTankKey, singlePointTankIds };
}

const PROBLEM_WARNINGS: Record<ConsumeProblem, string> = {
  'no-orders': 'Falta elegir al menos un pedido.',
  'no-complete-tank': 'Falta un tanque con inicio y fin.',
  'no-cubes': 'No hay m³: elige pedidos con despachos o escribe los m³.',
};

/** What blocks saving (conflicts) and what to look at before sending (warnings). */
export function reviewFindingsOf(input: {
  problems: ConsumeProblem[];
  incompleteTanks: string[];
  usedOrders: Array<{ etiqueta: string; usedOn: string }>;
  missingOrderIds: string[];
  takenReadings: string[];
  variancePct: number | null;
}): { conflictos: string[]; avisos: string[] } {
  const conflicts = [
    ...input.usedOrders.map((order) => `El pedido ${order.etiqueta} ya está en el consumo del ${dayMonthOf(order.usedOn)}.`),
    ...(input.missingOrderIds.length > 0 ? [`Un pedido elegido no está en el periodo: ${input.missingOrderIds.join(', ')}.`] : []),
    ...input.takenReadings.map((label) => `La lectura ${label} ya está en otro consumo.`),
  ];
  const variance = input.variancePct;
  const warnings = [
    ...input.problems.map((problem) => PROBLEM_WARNINGS[problem]),
    ...input.incompleteTanks.map((tankName) => `${tankName} tiene un solo punto: marca el inicio y el fin.`),
    ...(variance != null && Math.abs(variance) > CONSUME_RATE_VARIANCE_WARN_PCT
      ? [`El gl/m³ se desvía ${variance > 0 ? '+' : ''}${num(variance)} % del promedio (umbral ±${CONSUME_RATE_VARIANCE_WARN_PCT} %).`]
      : []),
  ];
  return { conflictos: conflicts, avisos: warnings };
}

/** Lilachat's kit (agentes, 30/10/2026): limits per field and at most 8 blocks. */
const MAX_BLOCKS = 8;
const MAX_ROWS = 12;
const LIMIT = { metricValue: 24, metricLabel: 80, rowLabel: 60, rowValue: 24, rowSub: 80, chipSub: 40, text: 300 };
const clip = (value: string, max: number): string => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

export type BlockTone = 'ok' | 'info' | 'warn' | 'error' | 'neutral';
export type ReviewBlock =
  | { type: 'metric'; value: string; unit?: string; label?: string; tone?: BlockTone }
  | { type: 'rows'; rows: Array<{ label: string; value: string; sub?: string; tone?: BlockTone }> }
  | { type: 'chips'; items: Array<{ label: string; sub?: string; tone?: BlockTone }> }
  | { type: 'text'; text: string; tone?: BlockTone };

export interface ReviewBlocksInput {
  aggregates?: DraftAggregates[];
  complete: boolean;
  ratePerM3: number | null;
  averageRatePerM3: number | null;
  variancePct: number | null;
  tanks: Array<{ nombre: string; gl: number; inicioCm: number; finCm: number; recargaGl: number }>;
  m3: number;
  m3Despachados: number;
  m3Manual?: number;
  despachos: number;
  fuels: Array<{ label: string; gl: number; glPorM3: number }>;
  conflictos: string[];
  avisos: string[];
}

const textBlocks = (texts: string[], tone: BlockTone): ReviewBlock[] => texts.map((text) => ({ type: 'text', text: clip(text, LIMIT.text), tone }));

function rateBlock(input: ReviewBlocksInput): ReviewBlock {
  const { variancePct, averageRatePerM3 } = input;
  const comparison = averageRatePerM3 != null && variancePct != null
    ? ` · promedio ${num(averageRatePerM3)} (${variancePct > 0 ? '+' : ''}${num(variancePct)} %)`
    : '';
  const outside = variancePct != null && Math.abs(variancePct) > CONSUME_RATE_VARIANCE_WARN_PCT;
  return { type: 'metric', value: clip(num(input.ratePerM3 ?? 0), LIMIT.metricValue), unit: 'gl/m³', label: clip(`gl/m³${comparison}`, LIMIT.metricLabel), tone: outside ? 'warn' : 'neutral' };
}

function tankRows(input: ReviewBlocksInput): ReviewBlock {
  const tankRowsList = input.tanks.slice(0, MAX_ROWS - 1).map((tank) => ({
    label: clip(tank.nombre, LIMIT.rowLabel),
    value: clip(`${num(tank.gl)} gl`, LIMIT.rowValue),
    sub: clip(`${num(tank.inicioCm)} → ${num(tank.finCm)} cm${tank.recargaGl > 0 ? ` · +${num(tank.recargaGl)} gl recarga` : ''}`, LIMIT.rowSub),
  }));
  const cubesSub = input.m3Manual ? `manual · despachados ${num(input.m3Despachados)}` : `${input.despachos} ${input.despachos === 1 ? 'despacho' : 'despachos'}`;
  return { type: 'rows', rows: [...tankRowsList, { label: 'm³', value: clip(`${num(input.m3)} m³`, LIMIT.rowValue), sub: clip(cubesSub, LIMIT.rowSub) }] };
}

export type DraftAggregates = { client: string; materials: Array<{ name: string; quantity: number }> };

/** What Lilachat draws above «Enviar»: an incomplete draft only says what is missing. */
export function reviewBlocksOf(input: ReviewBlocksInput): ReviewBlock[] {
  if (!input.complete) return textBlocks(input.avisos, 'warn').slice(0, MAX_BLOCKS);
  const fuels = input.fuels.filter((fuel) => fuel.gl > 0);
  return [
    rateBlock(input),
    tankRows(input),
    ...(fuels.length > 0
      ? [{ type: 'chips' as const, items: fuels.map((fuel) => ({ label: fuel.label, sub: clip(`${num(fuel.gl)} gl · ${num(fuel.glPorM3)} gl/m³`, LIMIT.chipSub) })) }]
      : []),
    ...aggregatesBlock(input.aggregates ?? []),
    ...textBlocks(input.conflictos, 'error'),
    ...textBlocks(input.avisos, 'warn'),
  ].slice(0, MAX_BLOCKS);
}

/** One line per client of what the consume takes from its stock. Pure. */
export const aggregatesLineOf = (preview: DraftAggregates): string =>
  `${preview.client}: ${preview.materials.map((material) => `${material.name} ${num(material.quantity)}`).join(' · ')}`;

function aggregatesBlock(previews: DraftAggregates[]): ReviewBlock[] {
  const rows = previews.flatMap((preview) =>
    preview.materials.map((material) => ({
      label: clip(material.name, LIMIT.rowLabel),
      value: clip(`${num(material.quantity)} m³`, LIMIT.rowValue),
      sub: clip(`Agregados · ${preview.client}`, LIMIT.rowSub),
    }))
  );
  return rows.length > 0 ? [{ type: 'rows', rows: rows.slice(0, MAX_ROWS) }] : [];
}
