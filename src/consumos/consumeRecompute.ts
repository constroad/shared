import type { ConsumeMovementRecord } from './consumeMovementFlow';
import { computeConsume, diffConsumeFigures, type EngineTank } from './consumeEngine';

/**
 * The server recomputes every consume with the single engine (José,
 * 30/10/2026): the browser's figures are never saved as they come. The marked
 * readings and the orders are the person's choice; gallons, m³ and rates come
 * from the readings and dispatches each app reads from its own database.
 */

/** The consume fields the recompute reads; each app's model has more. */
export interface ConsumeInput {
  source?: string;
  orders?: Array<{ orderId: string; orderName: string; orderClient: string; tipoMAC: string; sourceCompanyId?: string }>;
  measures?: Array<{ tankId?: string; movementIds?: string[] }>;
  manualM3?: number;
  calculationNotes?: string;
}

/** A reading as a repository returns it. */
export interface ConsumeSpanRow {
  _id: unknown;
  tankId: string;
  tankName: string;
  eventType: ConsumeMovementRecord['eventType'];
  levelCentimeter: number;
  effectiveGallons: number;
  date: Date | string;
  createdAt?: Date | string;
  consumedByConsumeId?: string;
}

export const CONSUME_NOT_COMPUTABLE_MESSAGE =
  'Con las lecturas guardadas, el consumo no tiene un tanque con inicio y fin, o no tiene m³. Vuelve a cargar la pantalla.';

export interface ConsumeSelection {
  orderIds: string[];
  selectionByTankKey: Record<string, string[]>;
}

export interface ConsumeEngineData {
  tanks: EngineTank[];
  movements: ConsumeMovementRecord[];
  dispatch: { m3: number; ids: string[] };
}

export interface ConsumeRecomputeDeps {
  loadEngineData(companyId: string, selection: ConsumeSelection): Promise<ConsumeEngineData>;
  log(message: string): void;
}

/** What the person chose: the marked readings by tank and the orders. Pure. */
export const selectionFromConsume = (consume: Pick<ConsumeInput, 'orders' | 'measures'>): ConsumeSelection => ({
  orderIds: Array.from(new Set((consume.orders ?? []).map((order) => order.orderId).filter(Boolean))),
  selectionByTankKey: (consume.measures ?? []).reduce<Record<string, string[]>>((selection, measure) => {
    if (!measure.tankId) return selection;
    const current = selection[measure.tankId] ?? [];
    return { ...selection, [measure.tankId]: Array.from(new Set([...current, ...(measure.movementIds ?? [])])) };
  }, {}),
});

export const toEngineTank = (tank: { _id?: unknown; name: string; tableReference: string; contentType: EngineTank['contentType']; sharedTankId?: string }): EngineTank => ({
  _id: String(tank._id),
  name: tank.name,
  tableReference: tank.tableReference,
  contentType: tank.contentType,
  ...(tank.sharedTankId ? { sharedTankId: tank.sharedTankId } : {}),
});

export const toEngineMovement = (row: ConsumeSpanRow): ConsumeMovementRecord => ({
  _id: String(row._id),
  tankId: row.tankId,
  tankName: row.tankName,
  eventType: row.eventType,
  levelCentimeter: row.levelCentimeter,
  effectiveGallons: row.effectiveGallons,
  date: new Date(row.date).toISOString(),
  ...(row.createdAt ? { createdAt: new Date(row.createdAt).toISOString() } : {}),
  ...(row.consumedByConsumeId ? { consumedByConsumeId: row.consumedByConsumeId, isConsumed: true } : {}),
});

/**
 * The consume as it is saved: recomputed by the engine over the database. A
 * legacy consume (typed by hand, no readings) is saved as it came.
 */
export async function recomputeConsume<T extends ConsumeInput>(
  params: { companyId: string; consume: T; ignoredConsumeId?: string },
  deps: ConsumeRecomputeDeps
): Promise<T> {
  const { companyId, consume, ignoredConsumeId } = params;
  if (consume.source !== 'tank-movements') return consume;
  const selection = selectionFromConsume(consume);
  const engineData = await deps.loadEngineData(companyId, selection);
  const outcome = computeConsume({
    ...engineData,
    selectionByTankKey: selection.selectionByTankKey,
    ignoredConsumeId,
    orders: consume.orders ?? [],
    manualM3: consume.manualM3,
    calculationNotes: consume.calculationNotes,
  });
  if (outcome.problems.includes('no-complete-tank') || outcome.problems.includes('no-cubes')) {
    throw new Error(CONSUME_NOT_COMPUTABLE_MESSAGE);
  }
  const differences = diffConsumeFigures(consume as Parameters<typeof diffConsumeFigures>[0], {
    quantityPen: outcome.payload.quantityPen,
    quantityGasohol: outcome.payload.quantityGasohol,
    quantityPetroleo: outcome.payload.quantityPetroleo,
    totalCubes: outcome.payload.totalCubes,
  });
  if (differences.length > 0) {
    deps.log(`[consume] ${companyId}: the server recomputed figures that differ from the browser's ${JSON.stringify(differences)}`);
  }
  const { date: _computedAt, orders: _orders, ...figures } = outcome.payload;
  return { ...consume, ...figures } as unknown as T;
}
