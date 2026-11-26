import { type KardexBalance } from './kardexBalance';
/**
 * The movements a kardex writes, built as plain objects: a reception entering,
 * a transfer between locations, a count adjusting the stock, an order taking
 * material out. The app saves them; what they say is decided here.
 */
export type KardexSource = 'input' | 'order' | 'transfer' | 'adjustment' | 'opening' | 'manual';
export type KardexMovementDraft = {
    materialId: string;
    type: 'Ingreso' | 'Salida';
    quantity: number;
    value: number;
    unitCost: number;
    date: Date;
    description: string;
    source: KardexSource;
    locationId?: string;
    locationName?: string;
};
/** What the kardex reads of a reception (an `Input`). */
export type KardexInputLike = {
    _id: unknown;
    materialId?: string;
    material?: string;
    locationId?: string;
    locationName?: string;
    providerId?: string;
    providerName?: string;
    vendorProviderId?: string;
    vendorProviderName?: string;
    purchaseOrderId?: string;
    purchaseOrderNumber?: string | number;
    driver?: string;
    m3?: number;
    arriveDate?: string | Date | null;
    createdAt?: string | Date | null;
    status?: string;
};
export type KardexIngressMovement = KardexMovementDraft & {
    purchaseId: unknown;
    purchaseOrderId?: string;
    purchaseOrderNumber?: string | number;
    providerId?: string;
    providerName?: string;
    vendorProviderId?: string;
    vendorProviderName?: string;
};
/**
 * The Ingreso that accepts a reception, or null when there is nothing to enter
 * (no quantity, or it already entered). The movement is dated by its arrival,
 * then by its creation, then by `now`.
 */
export declare const inputIngressMovement: (input: KardexInputLike, now?: Date) => KardexIngressMovement | null;
/** The average value of one unit of what is in stock; zero when nothing is. */
export declare const kardexUnitValue: (balance: KardexBalance) => number;
export type KardexTransferParams = {
    materialId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: unknown;
    date?: string | Date;
    description?: string;
};
export type KardexTransferResult = {
    ok: true;
    movements: [KardexMovementDraft, KardexMovementDraft];
} | {
    ok: false;
    error: string;
};
/** A move between locations: a Salida at the origin and an Ingreso at the destination, at the same value. */
export declare const kardexTransfer: (params: KardexTransferParams, fromBalance: KardexBalance) => KardexTransferResult;
export type KardexCount = {
    materialId: string;
    locationId?: string;
    countedQuantity: unknown;
};
/** The adjustment that makes the stock equal a physical count, or null when it already does. */
export declare const kardexRecountAdjustment: (count: KardexCount, current: KardexBalance, options?: {
    date?: Date;
    description?: string;
}) => KardexMovementDraft | null;
/** What an order takes out of one material: its share of the total, to two decimals. */
export declare const orderExitQuantity: (total: number, percentage: number) => number;
