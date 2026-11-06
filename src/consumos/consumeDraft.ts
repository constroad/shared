import type { ConsumeMovementRecord, ConsumeMovementTankCalculation } from './consumeMovementFlow';
import { buildConsumeOrder, computeConsume, groupTankMovementsByTank, tankMovementKey, type EngineTank } from './consumeEngine';
import {
  contentLabelOf,
  orderLabelOf,
  orderRowOf,
  readingLabelOf,
  readingRowsOf,
  resolveDraftPeriod,
  reviewBlocksOf,
  reviewFindingsOf,
  selectionFromTramos,
  type DraftAggregates,
  type DraftPeriod,
} from './consumeDraftRows';
import { computeRateVariancePct, sampleRatePerM3, type ConsumeRateBaseline } from './consumeRateBaseline';
import type { ConsumeEngineData, ConsumeSelection } from './consumeRecompute';
import { todayPeruInputDate } from './tankMovementDates';

/**
 * Wilson's consume from Lilachat (José, 30/10/2026): `preparar_consumo` lists
 * what the screen shows, `revisar_consumo` says what WOULD be saved and
 * `registrar_consumo` saves it through the app's one write path. Each app gives
 * its data through `ConsumeDraftDeps`.
 */

type DraftOrder = Parameters<typeof orderRowOf>[0]['order'];

export interface PeriodOrder {
  order: DraftOrder;
  m3: number;
  dispatchCount: number;
}

export interface ConsumeDraftArgs {
  desde?: string;
  hasta?: string;
  m3Manual?: number;
  nota?: string;
  pedidos: string[];
  tramos: Array<{ tanqueId: string; inicioId?: string; finId?: string }>;
}

export interface ConsumeDraftDeps {
  periodOrders(period: DraftPeriod): Promise<PeriodOrder[]>;
  usedOrders(): Promise<Map<string, string>>;
  periodReadings(period: DraftPeriod): Promise<{ tanks: EngineTank[]; movements: ConsumeMovementRecord[]; photoUrlsByMovementId: Record<string, string[]> }>;
  rateBaseline(): Promise<ConsumeRateBaseline>;
  engineData(selection: ConsumeSelection): Promise<ConsumeEngineData>;
  previewAggregates(orders: unknown[]): Promise<DraftAggregates[]>;
  saveConsume(input: unknown): Promise<{ ok: true; consume: { _id?: unknown }; aggregates?: unknown[] } | { ok: false; message: string }>;
  consumeLink(consumeId: string): Promise<string>;
}

const promedioOf = (baseline: ConsumeRateBaseline) =>
  baseline.averageRatePerM3 == null ? null : { glPorM3: Number(baseline.averageRatePerM3.toFixed(4)), muestras: baseline.sampleSize };

const periodOf = (args: { desde?: string; hasta?: string }) => resolveDraftPeriod(args, todayPeruInputDate());

export async function prepareConsume(args: { desde?: string; hasta?: string }, deps: ConsumeDraftDeps) {
  const resolved = periodOf(args);
  if (!resolved.ok) return resolved;
  const { period } = resolved;
  const [orders, usedOn, readings, baseline] = await Promise.all([
    deps.periodOrders(period),
    deps.usedOrders(),
    deps.periodReadings(period),
    deps.rateBaseline(),
  ]);
  const movementsByTank = groupTankMovementsByTank(readings.tanks, readings.movements);
  const tanksWithReadings = readings.tanks.filter((tank) => (movementsByTank[tankMovementKey(tank)] ?? []).length > 0);
  const tanques = tanksWithReadings.map((tank) => ({ id: tankMovementKey(tank), nombre: tank.name, contenido: contentLabelOf(tank.contentType) }));
  return {
    ok: true as const,
    value: {
      periodo: period,
      pedidos: orders.map((row) => orderRowOf({ ...row, usedOn: usedOn.get(String(row.order._id)) })),
      tanques,
      lecturas: tanques.flatMap((tank) => readingRowsOf(tank.id, movementsByTank[tank.id] ?? [], readings.photoUrlsByMovementId)),
      promedio: promedioOf(baseline),
      form: { defaults: { desde: period.desde, hasta: period.hasta, tramos: tanques.map((tank) => ({ tanqueId: tank.id })) } },
    },
  };
}

const refillOf = (tank: ConsumeMovementTankCalculation): number =>
  Number(tank.intervals.reduce((total, interval) => total + interval.refillGallons, 0).toFixed(2));

type ComputedConsume = ReturnType<typeof computeConsume>;

function summaryOf(outcome: ComputedConsume, dispatchCount: number, baseline: ConsumeRateBaseline) {
  const { payload } = outcome;
  const rate = (gallons: number) => (payload.totalCubes > 0 ? Number((gallons / payload.totalCubes).toFixed(4)) : 0);
  return {
    m3: payload.totalCubes,
    m3Despachados: payload.computedM3,
    ...(payload.manualM3 ? { m3Manual: payload.manualM3 } : {}),
    despachos: dispatchCount,
    tanques: outcome.tanks.map((tank) => ({
      tanqueId: tank.tankId,
      nombre: tank.tankName,
      contenido: contentLabelOf(tank.contentType),
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

async function computeDraft(args: ConsumeDraftArgs, period: DraftPeriod, deps: ConsumeDraftDeps, options: { withAggregates?: boolean } = {}) {
  const { selectionByTankKey } = selectionFromTramos(args.tramos);
  const [periodOrders, usedOn, engineData, baseline] = await Promise.all([
    deps.periodOrders(period),
    deps.usedOrders(),
    deps.engineData({ orderIds: args.pedidos, selectionByTankKey }),
    deps.rateBaseline(),
  ]);
  const chosen = periodOrders.filter((row) => args.pedidos.includes(String(row.order._id)));
  const chosenIds = new Set(chosen.map((row) => String(row.order._id)));
  const orders = chosen.map((row) => buildConsumeOrder(row.order)).filter((order): order is NonNullable<typeof order> => Boolean(order));
  const outcome = computeConsume({ ...engineData, selectionByTankKey, orders, manualM3: args.m3Manual, calculationNotes: args.nota });
  const markedIds = new Set(Object.values(selectionByTankKey).flat());
  const currentRate = sampleRatePerM3(outcome.payload);
  const findings = reviewFindingsOf({
    problems: outcome.problems,
    incompleteTanks: outcome.incompleteTanks,
    usedOrders: chosen.flatMap((row) => {
      const usedOnDate = usedOn.get(String(row.order._id));
      return usedOnDate ? [{ etiqueta: orderLabelOf(row.order), usedOn: usedOnDate }] : [];
    }),
    missingOrderIds: args.pedidos.filter((orderId) => !chosenIds.has(orderId)),
    takenReadings: engineData.movements.filter((movement) => markedIds.has(movement._id) && movement.consumedByConsumeId).map(readingLabelOf),
    variancePct: currentRate == null ? null : computeRateVariancePct(currentRate, baseline.averageRatePerM3),
  });
  const summary = summaryOf(outcome, engineData.dispatch.ids.length, baseline);
  const aggregates = options.withAggregates ? await deps.previewAggregates(orders) : [];
  const blocks = reviewBlocksOf({
    aggregates,
    complete: !outcome.problems.some((problem) => problem !== 'no-cubes'),
    ratePerM3: currentRate,
    averageRatePerM3: baseline.averageRatePerM3,
    variancePct: currentRate == null ? null : computeRateVariancePct(currentRate, baseline.averageRatePerM3),
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

export async function reviewConsume(args: ConsumeDraftArgs, deps: ConsumeDraftDeps) {
  const resolved = periodOf(args);
  if (!resolved.ok) return resolved;
  const { findings, summary, blocks, aggregates } = await computeDraft(args, resolved.period, deps, { withAggregates: true });
  const agregados = aggregates.length > 0 ? { agregados: aggregates } : {};
  return { ok: true as const, value: { resumen: summary, avisos: findings.avisos, conflictos: findings.conflictos, blocks, ...agregados } };
}

/** Saves the consume Lila reviewed: same engine, same write path as the screen. */
export async function registerConsume(args: ConsumeDraftArgs, author: { name?: string }, deps: ConsumeDraftDeps) {
  const resolved = periodOf(args);
  if (!resolved.ok) return resolved;
  const { outcome, findings, summary } = await computeDraft(args, resolved.period, deps);
  if (findings.conflictos.length > 0) return { ok: false as const, message: findings.conflictos.join(' ') };
  if (outcome.problems.length > 0) return { ok: false as const, message: findings.avisos.slice(0, outcome.problems.length).join(' ') };
  const input = { ...outcome.payload, createdBy: { ...(author.name ? { name: author.name } : {}), via: 'lila' as const } };
  const saved = await deps.saveConsume(input);
  if (!saved.ok) return { ok: false as const, message: saved.message };
  const consumoId = String(saved.consume._id);
  const agregados = saved.aggregates ? { agregados: saved.aggregates } : {};
  return { ok: true as const, value: { consumoId, resumen: summary, enlace: await deps.consumeLink(consumoId), ...agregados } };
}
