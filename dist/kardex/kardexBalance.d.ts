/**
 * The kardex ledger, as pure math: a balance is the sum of its movements in
 * timeline order (date, then creation time, then id). Portal and Inframaq read
 * and write the movements their own way; the balance, the snapshot by
 * material and location, and the order of the timeline are computed here, so
 * both apps give the same number for the same movements.
 */
export declare const KARDEX_UNASSIGNED_LOCATION_ID = "unassigned";
export declare const KARDEX_UNASSIGNED_LOCATION_NAME = "Sin ubicaci\u00F3n";
export type KardexMovementType = 'Ingreso' | 'Salida';
export type KardexBalance = {
    quantity: number;
    value: number;
};
/** What the balance reads of a movement: its direction, quantity and value. */
export type KardexEntry = {
    type?: string;
    quantity?: unknown;
    value?: unknown;
};
type Instant = Date | string | number | null | undefined;
/** What the timeline reads of a movement. `_id` is anything printable (an ObjectId). */
export type KardexTimelineEntry = KardexEntry & {
    _id?: unknown;
    date?: Instant;
    createdAt?: Instant;
    materialId?: unknown;
    locationId?: unknown;
    locationName?: unknown;
};
export type KardexBalanceRow<Entry> = {
    entry: Entry;
    balanceQuantity: number;
    balanceValue: number;
};
export type KardexSnapshotLocation = {
    locationId: string;
    locationName: string;
    quantity: number;
    value: number;
};
export type KardexSnapshotMaterial = {
    materialId: string;
    quantity: number;
    value: number;
    locations: KardexSnapshotLocation[];
};
export type KardexSnapshot = {
    asOf: string | null;
    locationId?: string;
    materials: KardexSnapshotMaterial[];
};
/** One material in one location, already summed (by a database or by `kardexGroups`). */
export type KardexSnapshotGroup = {
    materialId: unknown;
    locationId?: unknown;
    locationName?: unknown;
    quantity: unknown;
    value: unknown;
};
export declare const toKardexNumber: (value: unknown) => number;
export declare const roundKardex: (value: number) => number;
export declare const applyKardexMovement: (balance: KardexBalance, entry: KardexEntry) => KardexBalance;
/** Date, then creation time, then id: the order the balance runs in. */
export declare const compareKardexTimeline: (a: KardexTimelineEntry, b: KardexTimelineEntry) => number;
/** The balance after each movement, in timeline order, and the closing balance. */
export declare const kardexBalances: <Entry extends KardexTimelineEntry>(entries: Entry[], opening?: KardexBalance) => {
    rows: KardexBalanceRow<Entry>[];
    closing: KardexBalance;
};
/** A location filter. «unassigned» also takes the movements that have no location. */
export declare const kardexMatchesLocation: (entry: KardexTimelineEntry, locationId?: string) => boolean;
/** The movements summed by material and location; the location name is the last one in timeline order. */
export declare const kardexGroups: (entries: KardexTimelineEntry[]) => KardexSnapshotGroup[];
export type KardexSnapshotOptions = {
    asOf?: Date;
    locationId?: string;
};
/** The stock by material, and inside each its locations, from groups already summed. */
export declare const kardexSnapshotFromGroups: (groups: KardexSnapshotGroup[], options?: KardexSnapshotOptions) => KardexSnapshot;
/** The stock "as of" a date (the date included), by material and location, from the movements. */
export declare const kardexSnapshot: (entries: KardexTimelineEntry[], options?: KardexSnapshotOptions) => KardexSnapshot;
export {};
