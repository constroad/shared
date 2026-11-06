/**
 * A reading belongs to at most one consume, and an order too (F1
 * CONSUMES-TANK-RECONCILIATION). The rules each app applies to its own data.
 */

export const MOVEMENTS_ALREADY_USED_MESSAGE = 'Una o más medidas ya fueron usadas en otro consumo.';
export const MOVEMENTS_NOT_ACCESSIBLE_MESSAGE = 'Una o más medidas no existen o no pertenecen a esta empresa.';
export const ORDERS_ALREADY_USED_MESSAGE = 'Uno o más pedidos ya fueron usados en otro consumo.';

interface ConsumeMovementIds {
  movementRefs?: Array<{ movementId: string }>;
  measures?: Array<{ movementIds?: string[] }>;
}

export const extractConsumeMovementIds = (consume: ConsumeMovementIds): string[] => [
  ...(consume.movementRefs ?? []).map((movementRef) => movementRef.movementId),
  ...(consume.measures ?? []).flatMap((measure) => measure.movementIds ?? []),
].filter(Boolean);

export const extractUniqueConsumeMovementIds = (consume: ConsumeMovementIds): string[] =>
  Array.from(new Set(extractConsumeMovementIds(consume)));

/**
 * The period really measured: the first and last reading of the consume. With no
 * readings it falls back to the consume's date, never null, so a list can filter
 * by period without another branch.
 */
export const deriveConsumePeriod = (
  consume: { date: Date | string; movementRefs?: Array<{ date: string }> }
): { periodStart: Date; periodEnd: Date } => {
  const times = (consume.movementRefs ?? []).map((movementRef) => new Date(movementRef.date).getTime()).filter(Number.isFinite);
  if (times.length === 0) {
    const fallbackDate = new Date(consume.date);
    return { periodStart: fallbackDate, periodEnd: fallbackDate };
  }
  return { periodStart: new Date(Math.min(...times)), periodEnd: new Date(Math.max(...times)) };
};
