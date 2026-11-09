import { parseInputArrivalDate } from './inputArrivalDate';
import { roundKardex, toKardexNumber, type KardexBalance } from './kardexBalance';

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

const ingressDescription = (input: KardexInputLike): string => {
  const sale = input.vendorProviderName ? `, venta ${input.vendorProviderName}` : '';
  const arrival = input.arriveDate ? `, ${input.arriveDate instanceof Date ? input.arriveDate.toISOString() : input.arriveDate}` : '';
  return `Ingreso: ${input.material}, transporte ${input.providerName}${sale}, ${input.driver} ${input.m3}m3${arrival}`;
};

/**
 * The Ingreso that accepts a reception, or null when there is nothing to enter
 * (no quantity, or it already entered). The movement is dated by its arrival,
 * then by its creation, then by `now`.
 */
export const inputIngressMovement = (input: KardexInputLike, now: Date = new Date()): KardexIngressMovement | null => {
  if (!input.m3 || input.status === 'Completed') return null;
  return {
    purchaseId: input._id,
    purchaseOrderId: input.purchaseOrderId,
    purchaseOrderNumber: input.purchaseOrderNumber,
    materialId: String(input.materialId ?? ''),
    locationId: input.locationId,
    locationName: input.locationName,
    providerId: input.providerId,
    providerName: input.providerName,
    vendorProviderId: input.vendorProviderId,
    vendorProviderName: input.vendorProviderName,
    type: 'Ingreso',
    source: 'input',
    quantity: input.m3,
    value: 0,
    unitCost: 0,
    date: parseInputArrivalDate(input.arriveDate) ?? parseInputArrivalDate(input.createdAt) ?? now,
    description: ingressDescription(input),
  };
};

/** The average value of one unit of what is in stock; zero when nothing is. */
export const kardexUnitValue = (balance: KardexBalance): number => (balance.quantity > 0 ? balance.value / balance.quantity : 0);

export type KardexTransferParams = {
  materialId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: unknown;
  date?: string | Date;
  description?: string;
};

export type KardexTransferResult = { ok: true; movements: [KardexMovementDraft, KardexMovementDraft] } | { ok: false; error: string };

/** A move between locations: a Salida at the origin and an Ingreso at the destination, at the same value. */
export const kardexTransfer = (params: KardexTransferParams, fromBalance: KardexBalance): KardexTransferResult => {
  const quantity = roundKardex(toKardexNumber(params.quantity));
  if (quantity <= 0) return { ok: false, error: 'Cantidad inválida' };
  if (params.fromLocationId === params.toLocationId) return { ok: false, error: 'El origen y el destino deben ser distintos' };
  if (fromBalance.quantity < quantity) return { ok: false, error: 'Stock insuficiente en la ubicación de origen' };

  const unitValue = kardexUnitValue(fromBalance);
  const shared = {
    materialId: params.materialId,
    quantity,
    value: roundKardex(unitValue * quantity),
    unitCost: roundKardex(unitValue),
    date: params.date ? new Date(params.date) : new Date(),
    description: params.description || 'Reubicación de inventario',
    source: 'transfer' as const,
  };
  return {
    ok: true,
    movements: [
      { ...shared, type: 'Salida', locationId: params.fromLocationId },
      { ...shared, type: 'Ingreso', locationId: params.toLocationId },
    ],
  };
};

export type KardexCount = { materialId: string; locationId?: string; countedQuantity: unknown };

/** The adjustment that makes the stock equal a physical count, or null when it already does. */
export const kardexRecountAdjustment = (
  count: KardexCount,
  current: KardexBalance,
  options: { date?: Date; description?: string } = {}
): KardexMovementDraft | null => {
  const delta = roundKardex(roundKardex(toKardexNumber(count.countedQuantity)) - current.quantity);
  if (delta === 0) return null;
  const unitValue = kardexUnitValue(current);
  return {
    materialId: count.materialId,
    type: delta > 0 ? 'Ingreso' : 'Salida',
    quantity: Math.abs(delta),
    value: roundKardex(Math.abs(delta) * unitValue),
    unitCost: roundKardex(unitValue),
    locationId: count.locationId || undefined,
    date: options.date ?? new Date(),
    description: options.description || 'Ajuste por conteo físico',
    source: 'adjustment',
  };
};

/** What an order takes out of one material: its share of the total, to two decimals. */
export const orderExitQuantity = (total: number, percentage: number): number => Number((total * (percentage / 100)).toFixed(2));
