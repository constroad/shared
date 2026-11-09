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
export declare const MAX_MOVEMENT_QUANTITY = 100000;
export type MovementQuantityCheck = {
    ok: true;
    quantity: number;
} | {
    ok: false;
    reason: string;
};
/** The quantity to move, rounded; refused when it is not a positive number or has an extra zero. */
export declare const checkMovementQuantity: (value: unknown) => MovementQuantityCheck;
/** The ledger's only free text: the note and who registered it. */
export declare const describeMovement: (note: string | undefined, operator: string | undefined) => string;
export type MovementMaterial = {
    name?: string;
    unit?: string;
    quantity?: number;
};
export type MaterialMovementPlan = {
    ok: false;
    reason: string;
}
/** An adjustment is not a ledger line: the app sets the material's counted total (its screen's path). */
 | {
    ok: true;
    kind: 'ajuste';
    quantity: number;
} | {
    ok: true;
    kind: 'ingreso' | 'salida';
    movement: Pick<KardexMovementDraft, 'type' | 'quantity' | 'value' | 'unitCost' | 'date' | 'description' | 'source'>;
};
export type MaterialMovementRequest = {
    kind: MaterialMovementKind;
    quantity: number;
    note?: string;
    operator?: string;
};
/** What a movement does to a material: refuse an exit larger than the stock, or build the ledger line. */
export declare function planMaterialMovement(request: MaterialMovementRequest, material: MovementMaterial, now?: Date): MaterialMovementPlan;
