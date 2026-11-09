/**
 * The kardex ledger, as pure math: a balance is the sum of its movements in
 * timeline order (date, then creation time, then id). Portal and Inframaq read
 * and write the movements their own way; the balance, the snapshot by
 * material and location, and the order of the timeline are computed here, so
 * both apps give the same number for the same movements.
 */

export const KARDEX_UNASSIGNED_LOCATION_ID = 'unassigned';
export const KARDEX_UNASSIGNED_LOCATION_NAME = 'Sin ubicación';

const KARDEX_DECIMALS = 6;

export type KardexMovementType = 'Ingreso' | 'Salida';
export type KardexBalance = { quantity: number; value: number };

/** What the balance reads of a movement: its direction, quantity and value. */
export type KardexEntry = { type?: string; quantity?: unknown; value?: unknown };

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

export type KardexBalanceRow<Entry> = { entry: Entry; balanceQuantity: number; balanceValue: number };

export type KardexSnapshotLocation = { locationId: string; locationName: string; quantity: number; value: number };
export type KardexSnapshotMaterial = { materialId: string; quantity: number; value: number; locations: KardexSnapshotLocation[] };
export type KardexSnapshot = { asOf: string | null; locationId?: string; materials: KardexSnapshotMaterial[] };

/** One material in one location, already summed (by a database or by `kardexGroups`). */
export type KardexSnapshotGroup = { materialId: unknown; locationId?: unknown; locationName?: unknown; quantity: unknown; value: unknown };

export const toKardexNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const roundKardex = (value: number): number => Number(value.toFixed(KARDEX_DECIMALS));

export const applyKardexMovement = (balance: KardexBalance, entry: KardexEntry): KardexBalance => {
  const quantity = toKardexNumber(entry.quantity);
  const value = toKardexNumber(entry.value);
  return entry.type === 'Ingreso'
    ? { quantity: balance.quantity + quantity, value: balance.value + value }
    : { quantity: balance.quantity - quantity, value: balance.value - value };
};

const instantOf = (value: Instant): number => {
  if (value === null || value === undefined) return 0;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/** Date, then creation time, then id: the order the balance runs in. */
export const compareKardexTimeline = (a: KardexTimelineEntry, b: KardexTimelineEntry): number =>
  instantOf(a.date) - instantOf(b.date) || instantOf(a.createdAt) - instantOf(b.createdAt) || String(a._id ?? '').localeCompare(String(b._id ?? ''));

/** The balance after each movement, in timeline order, and the closing balance. */
export const kardexBalances = <Entry extends KardexTimelineEntry>(
  entries: Entry[],
  opening: KardexBalance = { quantity: 0, value: 0 }
): { rows: KardexBalanceRow<Entry>[]; closing: KardexBalance } => {
  let running = { ...opening };
  const rows = [...entries].sort(compareKardexTimeline).map((entry) => {
    running = applyKardexMovement(running, entry);
    return { entry, balanceQuantity: roundKardex(running.quantity), balanceValue: roundKardex(running.value) };
  });
  return { rows, closing: running };
};

const hasNoLocation = (entry: KardexTimelineEntry) => entry.locationId === undefined || entry.locationId === null || entry.locationId === '';

/** A location filter. «unassigned» also takes the movements that have no location. */
export const kardexMatchesLocation = (entry: KardexTimelineEntry, locationId?: string): boolean => {
  if (!locationId) return true;
  if (locationId === KARDEX_UNASSIGNED_LOCATION_ID && hasNoLocation(entry)) return true;
  return entry.locationId === locationId;
};

const groupKey = (materialId: string, locationId: string) => `${materialId}\u0000${locationId}`;

/** The movements summed by material and location; the location name is the last one in timeline order. */
export const kardexGroups = (entries: KardexTimelineEntry[]): KardexSnapshotGroup[] => {
  const groups = new Map<string, KardexSnapshotGroup & { quantity: number; value: number }>();
  for (const entry of [...entries].sort(compareKardexTimeline)) {
    const materialId = String(entry.materialId ?? '');
    const locationId = hasNoLocation(entry) ? KARDEX_UNASSIGNED_LOCATION_ID : String(entry.locationId);
    const key = groupKey(materialId, locationId);
    const group = groups.get(key) ?? { materialId, locationId, locationName: '', quantity: 0, value: 0 };
    const after = applyKardexMovement({ quantity: group.quantity, value: group.value }, entry);
    groups.set(key, { ...group, locationName: entry.locationName ?? group.locationName, ...after });
  }
  return [...groups.values()];
};

const validDate = (value?: Date) => (value instanceof Date && !Number.isNaN(value.getTime()) ? value : null);

export type KardexSnapshotOptions = { asOf?: Date; locationId?: string };

/** The stock by material, and inside each its locations, from groups already summed. */
export const kardexSnapshotFromGroups = (groups: KardexSnapshotGroup[], options: KardexSnapshotOptions = {}): KardexSnapshot => {
  const byMaterial = new Map<string, KardexSnapshotMaterial>();
  for (const group of groups) {
    const materialId = String(group.materialId ?? '');
    if (!materialId) continue;
    const quantity = roundKardex(toKardexNumber(group.quantity));
    const value = roundKardex(toKardexNumber(group.value));
    const material = byMaterial.get(materialId) ?? { materialId, quantity: 0, value: 0, locations: [] };
    material.quantity = roundKardex(material.quantity + quantity);
    material.value = roundKardex(material.value + value);
    material.locations.push({
      locationId: String(group.locationId || KARDEX_UNASSIGNED_LOCATION_ID),
      locationName: String(group.locationName || KARDEX_UNASSIGNED_LOCATION_NAME),
      quantity,
      value,
    });
    byMaterial.set(materialId, material);
  }
  const asOf = validDate(options.asOf);
  return { asOf: asOf ? asOf.toISOString() : null, locationId: options.locationId || undefined, materials: [...byMaterial.values()] };
};

/** The stock "as of" a date (the date included), by material and location, from the movements. */
export const kardexSnapshot = (entries: KardexTimelineEntry[], options: KardexSnapshotOptions = {}): KardexSnapshot => {
  const asOf = validDate(options.asOf);
  const inRange = entries.filter((entry) => (!asOf || instantOf(entry.date) <= asOf.getTime()) && kardexMatchesLocation(entry, options.locationId));
  return kardexSnapshotFromGroups(kardexGroups(inRange), options);
};
