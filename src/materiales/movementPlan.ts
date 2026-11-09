import { roundKardex } from '../kardex/kardexBalance';
import type { KardexMovementDraft } from '../kardex/kardexMovements';

/**
 * The rules of a stock movement registered by hand (an entry, an exit or an
 * adjustment), as plain objects: the app looks the material up and saves what
 * this decides.
 *
 * Two things a movement typed by a person does NOT carry: money (nobody knows
 * a price, so `value` and `unitCost` go in zero rather than invent a cost that
 * would travel into the inventory valuation) and an author column (the ledger
 * has none, so who registered it goes in the description).
 */

export type MaterialMovementKind = 'ingreso' | 'salida' | 'ajuste';

/** A quantity above this is a typo: one extra zero on a 30 m³ truck would wipe out the plant's stock. */
export const MAX_MOVEMENT_QUANTITY = 100_000;

export type MovementQuantityCheck = { ok: true; quantity: number } | { ok: false; reason: string };

/** The quantity to move, rounded; refused when it is not a positive number or has an extra zero. */
export const checkMovementQuantity = (value: unknown): MovementQuantityCheck => {
  const quantity = roundKardex(Number(value));
  if (!Number.isFinite(quantity) || quantity <= 0) return { ok: false, reason: 'La cantidad tiene que ser un número mayor que cero.' };
  if (quantity > MAX_MOVEMENT_QUANTITY) return { ok: false, reason: `Esa cantidad supera el máximo de ${MAX_MOVEMENT_QUANTITY}: revisa si sobra un cero.` };
  return { ok: true, quantity };
};

/** The ledger's only free text: the note and who registered it. */
export const describeMovement = (note: string | undefined, operator: string | undefined): string => {
  const parts = [note?.trim(), operator?.trim() ? `por ${operator.trim()} (Lila)` : ''].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Movimiento registrado por Lila';
};

export type MovementMaterial = { name?: string; unit?: string; quantity?: number };

export type MaterialMovementPlan =
  | { ok: false; reason: string }
  /** An adjustment is not a ledger line: the app sets the material's counted total (its screen's path). */
  | { ok: true; kind: 'ajuste'; quantity: number }
  | { ok: true; kind: 'ingreso' | 'salida'; movement: Pick<KardexMovementDraft, 'type' | 'quantity' | 'value' | 'unitCost' | 'date' | 'description' | 'source'> };

export type MaterialMovementRequest = { kind: MaterialMovementKind; quantity: number; note?: string; operator?: string };

/** What a movement does to a material: refuse an exit larger than the stock, or build the ledger line. */
export function planMaterialMovement(request: MaterialMovementRequest, material: MovementMaterial, now: Date = new Date()): MaterialMovementPlan {
  const name = String(material.name ?? '');
  const unit = String(material.unit ?? '').trim() || 'm³';
  const stockBefore = roundKardex(Number(material.quantity) || 0);
  if (request.kind === 'salida' && request.quantity > stockBefore) return { ok: false, reason: `No hay tanto: ${name} tiene ${stockBefore} ${unit}.` };
  if (request.kind === 'ajuste') return { ok: true, kind: 'ajuste', quantity: request.quantity };
  return {
    ok: true,
    kind: request.kind,
    movement: {
      type: request.kind === 'ingreso' ? 'Ingreso' : 'Salida',
      quantity: request.quantity,
      value: 0,
      unitCost: 0,
      date: now,
      description: describeMovement(request.note, request.operator),
      source: 'manual',
    },
  };
}
