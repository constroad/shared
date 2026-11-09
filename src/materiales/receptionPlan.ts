import { buildInputArrivalISOString } from '../kardex/inputArrivalDate';

/**
 * A material reception (an `Input` in `Pending`) built from what a person
 * picked from lists, and the rules that decide whether it is complete. Portal's
 * zod schema and Inframaq's model must agree on both, so they live here.
 */

/** One reception is one truck: beyond this many cubic metres it is a typo, not a load. */
export const MAX_RECEPTION_M3 = 500;
/** The evidence of a reception: at least one photo of the load, at most six. */
export const MIN_RECEPTION_PHOTOS = 1;
export const MAX_RECEPTION_PHOTOS = 6;

export type ReceptionMaterial = { id: string; name?: string; description?: string; unit?: string; level?: unknown };
export type ReceptionProvider = { id: string; name: string };

export type ReceptionPicks = {
  /** Minted by the caller when the evidence has to hang off it before it exists. */
  inputId: string;
  material: ReceptionMaterial;
  carrier: ReceptionProvider;
  quarry: ReceptionProvider;
  /** The freight driver or the plate. */
  driver: string;
  m3: number;
  /** The Lima day, `YYYY-MM-DD`. */
  day: string;
  locationId?: string;
  notes?: string;
};

export type ReceptionRecord = {
  _id: string;
  materialId: string;
  material: string;
  materialName: string;
  level?: number;
  driver: string;
  m3: number;
  arriveDate: string;
  providerId: string;
  providerName: string;
  vendorProviderId: string;
  vendorProviderName: string;
  chancadora: string;
  locationId?: string;
  notes?: string;
  unit: string;
};

/** The reception as the form would persist it: the material's name plus its description, and the quarry copied where the notice reads it. */
export function receptionFromPicks(picks: ReceptionPicks, now: Date = new Date()): ReceptionRecord {
  const name = String(picks.material.name ?? '').trim();
  const description = String(picks.material.description ?? '').trim();
  return {
    _id: picks.inputId,
    materialId: picks.material.id,
    material: [name, description].filter(Boolean).join(' '),
    materialName: name,
    // Level 0 (sand) is a level: `|| undefined` dropped it and the «in transit» list never showed it.
    level: typeof picks.material.level === 'number' ? picks.material.level : undefined,
    driver: picks.driver,
    m3: picks.m3,
    // The picked day keeps the Lima time of day of `now`, as the form's date picker builds it.
    arriveDate: buildInputArrivalISOString(picks.day, now),
    providerId: picks.carrier.id,
    providerName: picks.carrier.name,
    vendorProviderId: picks.quarry.id,
    vendorProviderName: picks.quarry.name,
    chancadora: picks.quarry.name,
    ...(picks.locationId ? { locationId: picks.locationId } : {}),
    ...(picks.notes ? { notes: picks.notes } : {}),
    unit: String(picks.material.unit ?? '').trim() || 'm³',
  };
}

const MEASURED_STATES = ['banco', 'suelto'];
const REQUIRED_TEXT = ['driver', 'providerId', 'providerName', 'arriveDate'] as const;
const ANY_TEXT = ['materialId', 'material'] as const;
const OPTIONAL_NUMBERS = ['m3', 'level'] as const;

export type ReceptionValidation = { ok: true } | { ok: false; invalidPaths: string[] };

const isNonEmptyText = (value: unknown): boolean => typeof value === 'string' && value.length > 0;
const isNumber = (value: unknown): boolean => typeof value === 'number' && !Number.isNaN(value);
const isPercentage = (value: unknown): boolean => isNumber(value) && (value as number) >= 0 && (value as number) <= 100;

type Reception = Record<string, unknown>;

/** The keys of `keys` whose value fails `isValid`. */
const failing = (reception: Reception, keys: readonly string[], isValid: (value: unknown) => boolean): string[] =>
  keys.filter((key) => !isValid(reception[key]));

/** An optional field may be absent, but a present one must pass. */
const optional = (isValid: (value: unknown) => boolean) => (value: unknown): boolean => value === undefined || isValid(value);

/** The fields a reception cannot be saved without (the form's schema), by path. */
export function validateReceptionFields(reception: Reception): ReceptionValidation {
  const invalidPaths = [
    ...failing(reception, REQUIRED_TEXT, isNonEmptyText),
    ...failing(reception, ANY_TEXT, (value) => typeof value === 'string'),
    ...failing(reception, OPTIONAL_NUMBERS, optional(isNumber)),
    ...failing(reception, ['esponjamientoPct'], optional(isPercentage)),
    ...failing(reception, ['measuredState'], optional((value) => MEASURED_STATES.includes(String(value)))),
  ];
  return invalidPaths.length > 0 ? { ok: false, invalidPaths } : { ok: true };
}
