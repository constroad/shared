import { CUBICAGE_MEASURE_KEYS, type CubicageMeasureKey, type CubicageMeasures, type TruckShape } from './cubicage';
import { truckShapeOf } from './shape';

/**
 * The copy of a truck's cubicage that a dispatch keeps (José, 14/11/2026). The client report and
 * the dispatch card read this copy, never the live unit: a truck measured again later does not
 * change what was dispatched, and a copy does not wait for the plate homologator. Agreed with
 * Portal; the measure keys are Portal's, typo included (`concaveHight`).
 */

export type DispatchCubicageSource = 'local' | 'sibling';

export interface DispatchCubicage {
  plate: string;
  m3: number;
  shape: TruckShape;
  measures: Partial<Record<CubicageMeasureKey, number>>;
  /** Who measured (the `cubicator`). */
  measuredBy?: string;
  measuredByCompanyId: string;
  /** Frozen: the certificate must not change if the company renames itself. */
  measuredByCompanyName: string;
  /** ISO, from the unit's `cubicageUpdatedAt`. */
  measuredAt?: string;
  certificateNumber?: string;
  source: DispatchCubicageSource;
  provisional?: boolean;
  /** ISO, when the dispatch took the copy. */
  capturedAt: string;
}

/** A unit as each company keeps it: Inframaq's `fleetunits` or Portal's `transports` mapped to this. */
export interface CubicageUnit {
  plate: string;
  m3?: number;
  shape?: string;
  measures?: CubicageMeasures | Partial<Record<CubicageMeasureKey, number | string | null>>;
  cubicator?: string;
  cubicageUpdatedAt?: Date | string;
  pendingCubicageRegularization?: boolean;
  certificateNumber?: string;
}

export interface CubicageCandidate {
  companyId: string;
  companyName: string;
  unit: CubicageUnit;
}

const isMeasured = (unit: CubicageUnit): boolean => Number(unit.m3) > 0 && truckShapeOf(unit.shape) !== '';

const timeOf = (unit: CubicageUnit): number => (unit.cubicageUpdatedAt ? new Date(unit.cubicageUpdatedAt).getTime() : 0);

/** The local unit is enough unless it has no volume or was born provisional from a dispatch. */
export const needsSiblingLookup = (unit: CubicageUnit | null | undefined): boolean => !unit || !isMeasured(unit) || unit.pendingCubicageRegularization === true;

/** The newest measured candidate; on a tie the first one wins, so list the local company first. */
export const newestCubicage = (candidates: CubicageCandidate[]): CubicageCandidate | null =>
  candidates.filter((candidate) => isMeasured(candidate.unit)).reduce<CubicageCandidate | null>((best, candidate) => (!best || timeOf(candidate.unit) > timeOf(best.unit) ? candidate : best), null);

const numericMeasures = (measures: CubicageUnit['measures']): DispatchCubicage['measures'] =>
  Object.fromEntries(
    CUBICAGE_MEASURE_KEYS.flatMap((key) => {
      const value = (measures as Record<string, unknown> | undefined)?.[key];
      const number = Number(value);
      return value === null || value === undefined || value === '' || !Number.isFinite(number) ? [] : [[key, number]];
    }),
  );

const optional = <T>(key: string, value: T | undefined | null | '') => (value === undefined || value === null || value === '' ? {} : { [key]: value });

/** Null when the candidate has no volume or no known shape: nothing worth copying. */
export const dispatchCubicageOf = (candidate: CubicageCandidate, params: { ownCompanyId: string; capturedAt: Date }): DispatchCubicage | null => {
  const { unit } = candidate;
  const shape = truckShapeOf(unit.shape);
  if (!isMeasured(unit) || !shape) return null;
  return {
    plate: unit.plate,
    m3: Number(unit.m3),
    shape,
    measures: numericMeasures(unit.measures),
    ...optional('measuredBy', unit.cubicator),
    measuredByCompanyId: candidate.companyId,
    measuredByCompanyName: candidate.companyName,
    ...optional('measuredAt', unit.cubicageUpdatedAt ? new Date(unit.cubicageUpdatedAt).toISOString() : undefined),
    ...optional('certificateNumber', unit.certificateNumber),
    source: candidate.companyId === params.ownCompanyId ? 'local' : 'sibling',
    ...(unit.pendingCubicageRegularization ? { provisional: true } : {}),
    capturedAt: params.capturedAt.toISOString(),
  };
};

const LIMA_DAY: Intl.DateTimeFormatOptions = { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' };

/** «Medido por INFRAMAQ el 13/11/2026» when another company measured; null when the issuer did. */
export const measuredByLine = (copy: DispatchCubicage, issuerCompanyId: string): string | null => {
  if (copy.measuredByCompanyId === issuerCompanyId) return null;
  const day = copy.measuredAt ? ` el ${new Date(copy.measuredAt).toLocaleDateString('es-PE', LIMA_DAY)}` : '';
  return `Medido por ${copy.measuredByCompanyName}${day}`;
};
