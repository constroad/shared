import type {
  ConsumeMovementAuditConsume,
  ConsumeMovementRecord,
} from './consumeMovementFlow';
import { formatPeruDate, formatPeruDateTime } from './tankMovementDates';

/**
 * Selección de lecturas al EDITAR un consumo, agrupada por tanque canónico.
 * Fuente primaria: `measures[].movementIds` (la selección completa, incluido
 * el punto de INICIO). `movementRefs` solo trae el punto FINAL de cada tramo
 * desde el fix de deltas (2026-07-22: editar marcaba solo el fin) — queda
 * como fallback para consumos legacy sin `measures.movementIds`.
 */
export const buildEditConsumeSelection = (
  consume: Pick<ConsumeMovementAuditConsume, 'measures' | 'movementRefs'>,
  resolveTankKey: (tankId: string) => string
): Record<string, string[]> => {
  const selectionEntries = [
    ...(consume.measures ?? []).flatMap((measure) =>
      (measure.movementIds ?? []).map((movementId) => ({
        tankId: measure.tankId || '',
        movementId,
      }))
    ),
    ...(consume.movementRefs ?? []).map((movementRef) => ({
      tankId: movementRef.tankId,
      movementId: movementRef.movementId,
    })),
  ].filter((entry) => entry.movementId && entry.tankId);

  return selectionEntries.reduce<Record<string, string[]>>((selectionByTank, entry) => {
    const movementKey = resolveTankKey(entry.tankId);
    const currentIds = selectionByTank[movementKey] ?? [];
    if (currentIds.includes(entry.movementId)) return selectionByTank;
    return { ...selectionByTank, [movementKey]: [...currentIds, entry.movementId] };
  }, {});
};

export const formatMovementLabel = (movement: ConsumeMovementRecord): string => {
  const date = formatPeruDateTime(movement.date);
  const createdAtLabel = formatCreatedAtLabel(movement);
  return `${date}${createdAtLabel} · ${movement.eventType} · ${movement.levelCentimeter} cm · ${movement.effectiveGallons.toFixed(2)} gl`;
};

const formatCreatedAtLabel = (movement: ConsumeMovementRecord): string => {
  if (!movement.createdAt) return '';
  const movementDate = formatPeruDate(movement.date);
  const createdAtDate = formatPeruDate(movement.createdAt);
  return movementDate === createdAtDate ? '' : ` (registrado ${createdAtDate})`;
};

// The calculation lives in the server's single engine (José, 30/10/2026).
export {
  buildConsumeOrder,
  buildConsumePayload,
  calculateTankConsumption,
  expandSelectedMovements,
  formatOrderLabel,
} from './consumeEngine';
