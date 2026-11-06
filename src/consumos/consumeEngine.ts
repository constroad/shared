import { formatPeruDate } from './tankMovementDates';
import type {
  ConsumeMovementIntervalType,
  ConsumeMovementOrder,
  ConsumeMovementOrderListItem,
  ConsumeMovementRecord,
  ConsumeMovementTank,
  ConsumeMovementTankCalculation,
} from './consumeMovementFlow';

/**
 * The ONE consume engine (José, 30/10/2026: «un solo motor»). Pure: the admin
 * builder, Inframaq through the gateway and Lila all reach it, and the server
 * recomputes with it what the browser used to send already calculated. The UI
 * modules re-export these functions so the screen keeps calculating the same.
 */

export type EngineTank = Pick<ConsumeMovementTank, '_id' | 'name' | 'tableReference' | 'contentType' | 'sharedTankId'>;

const DECIMALS_GALLONS = 2;
const DECIMALS_RATE = 4;
const round = (value: number, decimals: number): number => Number(value.toFixed(decimals));
const timeOf = (movement: Pick<ConsumeMovementRecord, 'date'>): number => new Date(movement.date).getTime();
const registeredAt = (movement: Pick<ConsumeMovementRecord, 'createdAt'>): number => (movement.createdAt ? new Date(movement.createdAt).getTime() : 0);

/**
 * Chronological order of readings. `date` is saved to the minute, so readings
 * of the same minute tie: the one registered first goes first, then the id, and
 * the order never depends on how the list arrived (Inframaq 7066a5f, 31/10/2026).
 */
export const compareReadings = (
  first: Pick<ConsumeMovementRecord, '_id' | 'date' | 'createdAt'>,
  second: Pick<ConsumeMovementRecord, '_id' | 'date' | 'createdAt'>
): number => timeOf(first) - timeOf(second) || registeredAt(first) - registeredAt(second) || first._id.localeCompare(second._id);
const byDate = compareReadings;

export const tankMovementKey = (tank: Pick<EngineTank, '_id' | 'sharedTankId'>): string => tank.sharedTankId || tank._id;

/** Tank names of the same physical tank may differ in case between companies. */
export const normalizeTankName = (name?: string): string => (name ?? '').trim().toLocaleLowerCase('es');

/**
 * The tank a reading belongs to: by id or shared id, else by name (a reading
 * taken by another company carries its own alias id but the same tank name).
 */
export const resolveTankMovementKey = (
  tanks: Array<Pick<EngineTank, '_id' | 'sharedTankId' | 'name'>>,
  movementTankId: string,
  movementTankName?: string
): string => {
  const directMatch = tanks.find((tank) => tank._id === movementTankId || tank.sharedTankId === movementTankId);
  if (directMatch) return tankMovementKey(directMatch);
  const normalizedName = normalizeTankName(movementTankName);
  const nameMatch = normalizedName ? tanks.find((tank) => normalizeTankName(tank.name) === normalizedName) : undefined;
  return nameMatch ? tankMovementKey(nameMatch) : movementTankId;
};

export const groupTankMovementsByTank = (
  tanks: Array<Pick<EngineTank, '_id' | 'sharedTankId' | 'name'>>,
  movements: ConsumeMovementRecord[]
): Record<string, ConsumeMovementRecord[]> =>
  movements.reduce<Record<string, ConsumeMovementRecord[]>>((groupedMovements, movement) => {
    const movementKey = resolveTankMovementKey(tanks, movement.tankId, movement.tankName);
    groupedMovements[movementKey] = [...(groupedMovements[movementKey] ?? []), movement];
    return groupedMovements;
  }, {});

export const formatOrderLabel = (order: ConsumeMovementOrderListItem): string => {
  const scheduleDate = order.fechaProgramacion ? formatPeruDate(order.fechaProgramacion) : 'Sin fecha';
  return `${order.cliente ?? 'Sin cliente'} · ${scheduleDate} · ${order.obra ?? 'Sin obra'}`;
};

/** An order as a consume stores it; a projected one keeps whose order it is. */
export const buildConsumeOrder = (order: ConsumeMovementOrderListItem): ConsumeMovementOrder | null => {
  if (!order._id) return null;
  const sourceCompanyId = (order as { sourceCompanyId?: string }).sourceCompanyId;
  return {
    orderId: order._id,
    orderName: formatOrderLabel(order),
    orderClient: order.cliente ?? '',
    tipoMAC: order.design || order.tipoMAC || '-',
    ...(sourceCompanyId ? { sourceCompanyId } : {}),
  };
};

/**
 * Expands a selection to the continuous span between the first and the last
 * selected reading, with EVERY reading in between: a refill in the middle is
 * then a refill and not a missed consumption.
 */
export const expandSelectedMovements = (
  sortedMovements: ConsumeMovementRecord[],
  selectedIds: Set<string>
): ConsumeMovementRecord[] => {
  const ordered = [...sortedMovements].sort(byDate);
  const selectedIndexes = ordered
    .map((movement, index) => (selectedIds.has(movement._id) ? index : -1))
    .filter((index) => index >= 0);
  if (selectedIndexes.length < 2) return ordered.filter((movement) => selectedIds.has(movement._id));
  return ordered.slice(selectedIndexes[0], selectedIndexes[selectedIndexes.length - 1] + 1);
};

const intervalTypeOf = (deltaGallons: number): ConsumeMovementIntervalType =>
  deltaGallons < 0 ? 'consumption' : deltaGallons > 0 ? 'refill' : 'flat';

/**
 * A span's consumption = ONLY the steps between consecutive readings of the
 * span (a drop is consumption, a rise a refill). The first reading is the
 * baseline: its stored delta against a reading OUTSIDE the span never counts
 * (bug 22/07/2026 doubled the consumption). One point = incomplete.
 */
export const calculateTankConsumption = (
  tank: EngineTank,
  selectedMovements: ConsumeMovementRecord[]
): ConsumeMovementTankCalculation => {
  const sortedMovements = [...selectedMovements].sort(byDate);
  const intervals = sortedMovements.slice(1).map((movement, index) => {
    const previousMovement = sortedMovements[index];
    const deltaGallons = round(movement.effectiveGallons - previousMovement.effectiveGallons, DECIMALS_GALLONS);
    return {
      startMovement: previousMovement,
      endMovement: movement,
      startLevelCentimeter: previousMovement.levelCentimeter,
      endLevelCentimeter: movement.levelCentimeter,
      startEffectiveGallons: previousMovement.effectiveGallons,
      endEffectiveGallons: movement.effectiveGallons,
      deltaGallons,
      consumedGallons: deltaGallons < 0 ? Math.abs(deltaGallons) : 0,
      refillGallons: deltaGallons > 0 ? deltaGallons : 0,
      intervalType: intervalTypeOf(deltaGallons),
    };
  });
  const consumedGallons = intervals.reduce((total, interval) => total + interval.consumedGallons, 0);
  return {
    tankId: tankMovementKey(tank),
    tankName: tank.name,
    tankReference: tank.tableReference || tank.name,
    contentType: tank.contentType,
    selectedMovements: sortedMovements,
    intervals,
    consumedGallons: round(consumedGallons, DECIMALS_GALLONS),
    initialMeasure: sortedMovements[0]?.levelCentimeter ?? 0,
    finalMeasure: sortedMovements[sortedMovements.length - 1]?.levelCentimeter ?? 0,
    isComplete: intervals.length > 0,
  };
};

export const totalByContentType = (
  calculations: ConsumeMovementTankCalculation[],
  contentTypes: ConsumeMovementTankCalculation['contentType'][]
): number => {
  const contentTypeSet = new Set(contentTypes);
  const total = calculations
    .filter((calculation) => contentTypeSet.has(calculation.contentType))
    .reduce((sum, calculation) => sum + calculation.consumedGallons, 0);
  return round(total, DECIMALS_GALLONS);
};

/**
 * Every tank with a marked reading, over its expanded span. A reading another
 * consume already uses is left out; one of the consume being edited stays.
 */
export const computeTankCalculations = (input: {
  tanks: EngineTank[];
  movements: ConsumeMovementRecord[];
  selectionByTankKey: Record<string, string[]>;
  ignoredConsumeId?: string;
}): ConsumeMovementTankCalculation[] => {
  const movementsByTank = groupTankMovementsByTank(input.tanks, input.movements);
  const isFree = (movement: ConsumeMovementRecord): boolean =>
    !movement.consumedByConsumeId || movement.consumedByConsumeId === input.ignoredConsumeId;
  return input.tanks
    .map((tank) => {
      const movementKey = tankMovementKey(tank);
      const selectedIds = new Set(input.selectionByTankKey[movementKey] ?? []);
      const span = expandSelectedMovements(movementsByTank[movementKey] ?? [], selectedIds).filter(isFree);
      return calculateTankConsumption(tank, span);
    })
    .filter((calculation) => calculation.selectedMovements.length > 0);
};

export interface ConsumeCalculation {
  orders: ConsumeMovementOrder[];
  tanks: ConsumeMovementTankCalculation[];
  dispatchIds: string[];
  computedM3: number;
  manualM3?: number;
  totalCubes: number;
  quantityPen: number;
  quantityGasohol: number;
  quantityPetroleo: number;
  calculationNotes?: string;
}

const intervalReferences = (tank: ConsumeMovementTankCalculation) =>
  tank.intervals.map((interval) => ({
    movementId: interval.endMovement._id,
    tankId: interval.endMovement.tankId,
    tankName: interval.endMovement.tankName,
    eventType: interval.endMovement.eventType,
    initialLevelCentimeter: interval.startLevelCentimeter,
    initialEffectiveGallons: round(interval.startEffectiveGallons, DECIMALS_GALLONS),
    levelCentimeter: interval.endLevelCentimeter,
    effectiveGallons: round(interval.endEffectiveGallons, DECIMALS_GALLONS),
    deltaGallons: interval.deltaGallons,
    consumedGallons: interval.consumedGallons,
    refillGallons: interval.refillGallons,
    intervalType: interval.intervalType,
    date: interval.endMovement.date,
    role: 'selected' as const,
  }));

/** The document a consume is saved as. */
export const buildConsumePayload = (calculation: ConsumeCalculation) => {
  const { totalCubes } = calculation;
  const rate = (value: number): number => (totalCubes > 0 ? round(value / totalCubes, DECIMALS_RATE) : 0);
  return {
    source: 'tank-movements' as const,
    date: new Date(),
    orders: calculation.orders,
    measures: calculation.tanks.map((tank) => ({
      tank: tank.tankReference,
      tankId: tank.tankId,
      initialMeasure: tank.initialMeasure,
      finalMeasure: tank.finalMeasure,
      quantityConsumed: tank.consumedGallons,
      movementIds: tank.selectedMovements.map((movement) => movement._id),
    })),
    movementRefs: calculation.tanks.flatMap(intervalReferences),
    dispatchIds: calculation.dispatchIds,
    computedM3: calculation.computedM3,
    manualM3: calculation.manualM3,
    calculationNotes: calculation.calculationNotes,
    quantityPen: calculation.quantityPen,
    quantityGasohol: calculation.quantityGasohol,
    quantityPetroleo: calculation.quantityPetroleo,
    quantityGas: 0,
    penConsume: rate(calculation.quantityPen),
    fakePenConsume: rate(calculation.quantityPen),
    gasoholConsume: rate(calculation.quantityGasohol),
    petroleoConsume: rate(calculation.quantityPetroleo),
    gasConsume: 0,
    totalCubes,
  };
};

export type ConsumeProblem = 'no-orders' | 'no-complete-tank' | 'no-cubes';

export interface ConsumeEngineInput {
  tanks: EngineTank[];
  movements: ConsumeMovementRecord[];
  selectionByTankKey: Record<string, string[]>;
  ignoredConsumeId?: string;
  orders: ConsumeMovementOrder[];
  dispatch: { m3: number; ids: string[] };
  manualM3?: number;
  calculationNotes?: string;
}

/** What would be saved, from the readings and dispatches as they are now. */
export const computeConsume = (input: ConsumeEngineInput) => {
  const calculations = computeTankCalculations(input);
  const complete = calculations.filter((calculation) => calculation.isComplete);
  const computedM3 = round(input.dispatch.m3, DECIMALS_GALLONS);
  const manualM3 = input.manualM3 && input.manualM3 > 0 ? input.manualM3 : undefined;
  const totalCubes = manualM3 ?? computedM3;
  const problems: ConsumeProblem[] = [
    ...(input.orders.length === 0 ? ['no-orders' as const] : []),
    ...(complete.length === 0 ? ['no-complete-tank' as const] : []),
    ...(totalCubes <= 0 ? ['no-cubes' as const] : []),
  ];
  const payload = buildConsumePayload({
    orders: input.orders,
    tanks: complete,
    dispatchIds: input.dispatch.ids,
    computedM3,
    manualM3,
    totalCubes,
    quantityPen: totalByContentType(complete, ['pen']),
    quantityGasohol: totalByContentType(complete, ['gasohol']),
    quantityPetroleo: totalByContentType(complete, ['petroleum', 'thermal_oil']),
    calculationNotes: input.calculationNotes?.trim() || undefined,
  });
  return {
    payload,
    tanks: complete,
    incompleteTanks: calculations.filter((calculation) => !calculation.isComplete).map((calculation) => calculation.tankName),
    problems,
  };
};

const COMPARED_FIGURES = ['quantityPen', 'quantityGasohol', 'quantityPetroleo', 'totalCubes'] as const;
type ComparedFigure = (typeof COMPARED_FIGURES)[number];
const FIGURE_TOLERANCE = 0.01;

/** Where the browser's figures differ from the server's (the server wins). */
export const diffConsumeFigures = (
  browser: Partial<Record<ComparedFigure, number>>,
  server: Record<ComparedFigure, number>
): Array<{ field: ComparedFigure; browser: number; server: number }> =>
  COMPARED_FIGURES.flatMap((field) => {
    const browserValue = Number(browser[field] ?? 0);
    return Math.abs(browserValue - server[field]) > FIGURE_TOLERANCE ? [{ field, browser: browserValue, server: server[field] }] : [];
  });
