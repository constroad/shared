import { availableForProductionGallons, geometricGallonsAtLevel, tankDocumentToCalculationInput, type TankCalculationSource } from './tankEngine';

/**
 * A tank measure, from the level on the dipstick to what the audit says of it.
 *
 * Whoever registers a measure without the measure screen only has the
 * centimetres, so the conversion happens here with the same engine and rounding
 * as the screen. A tank whose geometry cannot be calculated is refused: a zeroed
 * measure reads as an empty tank.
 */

export type TankMeasureEvent = 'measurement' | 'refill' | 'adjustment';

/** The tank as this builder reads it: what the engine needs, plus which tank it is. */
export type TankForMeasure = TankCalculationSource & { _id?: unknown; name?: string };

export type TankMeasureRequest = {
  eventType: TankMeasureEvent;
  levelCm: number;
  note?: string;
  date?: Date;
};

export type TankMeasureFigures = {
  tankId: string;
  tankName: string;
  eventType: TankMeasureEvent;
  levelCentimeter: number;
  effectiveGallons: number;
  availableGallons: number;
  valveDeadGallons: number;
  date: Date;
  note?: string;
};

export type TankMovementFromLevel = { ok: true; movement: TankMeasureFigures } | { ok: false; reason: string };

/** Two decimals, the same rounding the measure screen persists. */
const roundGallons = (value: number): number => Number(value.toFixed(2));

export function tankMovementFromLevel(tank: TankForMeasure, request: TankMeasureRequest): TankMovementFromLevel {
  const input = tankDocumentToCalculationInput(tank);
  const atLevel = geometricGallonsAtLevel(input, request.levelCm);
  if (!atLevel.ok) return { ok: false, reason: atLevel.message };
  const available = availableForProductionGallons(input, request.levelCm);
  if (!available.ok) return { ok: false, reason: available.message };
  if (!('availableGallons' in available)) return { ok: false, reason: 'No se pudo calcular el disponible del tanque' };

  return {
    ok: true,
    movement: {
      tankId: String(tank._id ?? ''),
      tankName: String(tank.name ?? ''),
      eventType: request.eventType,
      levelCentimeter: request.levelCm,
      effectiveGallons: roundGallons(atLevel.effectiveGallons),
      availableGallons: roundGallons(available.availableGallons),
      valveDeadGallons: roundGallons(available.valveDeadGallons),
      date: request.date ?? new Date(),
      note: request.note,
    },
  };
}

const IDLE_HOURS = 6;
const MILLISECONDS_PER_HOUR = 3_600_000;
const MIN_DROP_CM = 1;
const LARGE_DROP_CM = 10;
const MORNING_END_HOUR = 10;
const NIGHT_START_HOUR = 18;
/** Peru has no daylight saving: its clock is always five hours behind UTC. */
const PERU_UTC_OFFSET_HOURS = 5;

type AuditedReading = { levelCentimeter: number; effectiveGallons: number; date: Date | string };

const timeOf = (reading: AuditedReading): number => new Date(reading.date).getTime();

const peruHourOf = (reading: AuditedReading): number => new Date(timeOf(reading) - PERU_UTC_OFFSET_HOURS * MILLISECONDS_PER_HOUR).getUTCHours();

const isNightToMorning = (start: AuditedReading, end: AuditedReading): boolean => peruHourOf(start) >= NIGHT_START_HOUR && peruHourOf(end) <= MORNING_END_HOUR;

/** Why a measure deserves a second look, against the reading before it. */
export const tankAuditReasons = ({ evidenceCount, movement, previousMovement }: { evidenceCount: number; movement: AuditedReading; previousMovement: AuditedReading }): string[] => {
  const dropCentimeters = Math.abs(movement.levelCentimeter - previousMovement.levelCentimeter);
  const deltaGallons = movement.effectiveGallons - previousMovement.effectiveGallons;
  const gapHours = Math.abs(timeOf(movement) - timeOf(previousMovement)) / MILLISECONDS_PER_HOUR;
  const reasons: string[] = [];

  if (evidenceCount === 0) reasons.push('sin evidencia fotografica');
  if (deltaGallons > 0 && evidenceCount === 0) reasons.push('recarga sin evidencia');
  if (deltaGallons < 0 && dropCentimeters >= LARGE_DROP_CM) reasons.push(`caida grande de ${dropCentimeters.toFixed(1)} cm`);
  if (deltaGallons < 0 && dropCentimeters >= MIN_DROP_CM && gapHours >= IDLE_HOURS && isNightToMorning(previousMovement, movement)) {
    reasons.push('caida entre cierre nocturno y reinicio');
  }
  return reasons;
};

/** The tank as this measure leaves it: its own stock is synced after the measure is saved. */
export function tankAsMeasured<T extends { volumeInStock?: number; levelCentimeter?: number }>(tank: T, measure: { effectiveGallons?: number; levelCentimeter?: number }): T {
  return {
    ...tank,
    ...(Number.isFinite(measure.effectiveGallons) ? { volumeInStock: measure.effectiveGallons } : {}),
    ...(Number.isFinite(measure.levelCentimeter) ? { levelCentimeter: measure.levelCentimeter } : {}),
  };
}
