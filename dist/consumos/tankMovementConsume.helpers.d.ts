import type { ConsumeMovementAuditConsume, ConsumeMovementRecord } from './consumeMovementFlow';
/**
 * Selección de lecturas al EDITAR un consumo, agrupada por tanque canónico.
 * Fuente primaria: `measures[].movementIds` (la selección completa, incluido
 * el punto de INICIO). `movementRefs` solo trae el punto FINAL de cada tramo
 * desde el fix de deltas (2026-07-22: editar marcaba solo el fin) — queda
 * como fallback para consumos legacy sin `measures.movementIds`.
 */
export declare const buildEditConsumeSelection: (consume: Pick<ConsumeMovementAuditConsume, "measures" | "movementRefs">, resolveTankKey: (tankId: string) => string) => Record<string, string[]>;
export declare const formatMovementLabel: (movement: ConsumeMovementRecord) => string;
export { buildConsumeOrder, buildConsumePayload, calculateTankConsumption, expandSelectedMovements, formatOrderLabel, } from './consumeEngine';
