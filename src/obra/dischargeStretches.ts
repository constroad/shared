import { projectToLine, type LatLng } from './streetGeometry';
import type { Discharge, DischargePoint } from './discharges';

/**
 * From the runway control report to the work map (Lilachat design o-07): the photos of a unit carry
 * the place they were taken, and their projection on a street is the stretch that unit worked. It
 * is a suggestion: an admin confirms it or corrects it before it becomes progress.
 */
export type StreetAxis = { _id: string; name: string; geometry: LatLng[]; lengthM: number };
export type PlacedUnit =
  | { state: 'placed'; dispatchId: string; streetId: string; fromM: number; toM: number }
  | { state: 'outside'; dispatchId: string; point: LatLng }
  | { state: 'noPlace'; dispatchId: string };
export type SuggestedStretch = {
  streetId: string;
  streetName: string;
  fromM: number;
  toM: number;
  lengthM: number;
  volumeM3: number;
  /** The units behind the stretch: Portal checks they belong to the order and dates it from their photos. */
  dispatchIds: string[];
};
export type DischargeSuggestion = { units: PlacedUnit[]; stretches: SuggestedStretch[] };

/** Farther than this from the axis is not that street: Portal's search radius and a sidewalk. */
export const STREET_REACH_M = 30;
/** A fix worse than this does not tell one stretch from the next. */
export const WORST_PRECISION_M = 30;
const NO_ARRIVAL = '9999';
const VOLUME_ROUNDING = 100;

type StreetFit = { street: StreetAxis; measures: number[]; offsetM: number };
type Placed = Extract<PlacedUnit, { state: 'placed' }>;

const trusted = (point: DischargePoint): boolean => (point.precision_m ?? 0) <= WORST_PRECISION_M;

const fitOn = (street: StreetAxis, points: DischargePoint[]): StreetFit | null => {
  const feet = points
    .map((point) => projectToLine(street.geometry, point))
    .filter((foot): foot is NonNullable<typeof foot> => foot !== null && foot.distanceM <= STREET_REACH_M);
  if (feet.length === 0) return null;
  const offsetM = feet.reduce((total, foot) => total + foot.distanceM, 0);
  return { street, measures: feet.map((foot) => Math.min(foot.measureM, street.lengthM)), offsetM };
};

/** The street that holds the most photos of the unit and, between equals, the closest one. */
const bestFit = (streets: StreetAxis[], points: DischargePoint[]): StreetFit | null => {
  const better = (one: StreetFit, other: StreetFit): number => one.measures.length - other.measures.length || other.offsetM - one.offsetM;
  return streets.reduce<StreetFit | null>((best, street) => {
    const fit = fitOn(street, points);
    return fit && (!best || better(fit, best) > 0) ? fit : best;
  }, null);
};

const placeUnit = (streets: StreetAxis[], unit: Discharge): PlacedUnit => {
  const points = unit.points.filter(trusted);
  const last = points[points.length - 1];
  if (!last) return { state: 'noPlace', dispatchId: unit.dispatch_id };
  const fit = bestFit(streets, points);
  if (!fit) return { state: 'outside', dispatchId: unit.dispatch_id, point: { lat: last.lat, lng: last.lng } };
  return { state: 'placed', dispatchId: unit.dispatch_id, streetId: fit.street._id, fromM: Math.round(Math.min(...fit.measures)), toM: Math.round(Math.max(...fit.measures)) };
};

const stretchOf = (street: StreetAxis, placed: Placed[], volumeOf: (dispatchId: string) => number): SuggestedStretch | null => {
  const onStreet = placed.filter((one) => one.streetId === street._id);
  if (onStreet.length === 0) return null;
  const fromM = Math.min(...onStreet.map((one) => one.fromM));
  const toM = Math.max(...onStreet.map((one) => one.toM));
  const volume = onStreet.reduce((total, one) => total + volumeOf(one.dispatchId), 0);
  return {
    streetId: street._id,
    streetName: street.name,
    fromM,
    toM,
    lengthM: toM - fromM,
    volumeM3: Math.round(volume * VOLUME_ROUNDING) / VOLUME_ROUNDING,
    dispatchIds: onStreet.map((one) => one.dispatchId),
  };
};

/** ISO hours sort as text; a unit without an hour goes last. */
const byArrival = (one: Discharge, other: Discharge): number => {
  const [left, right] = [one.arrival_at ?? NO_ARRIVAL, other.arrival_at ?? NO_ARRIVAL];
  return left === right ? 0 : left < right ? -1 : 1;
};

/** Each unit placed on a street (or outside the work, or without a place) and one stretch per street. */
export const suggestDischarges = (streets: StreetAxis[], discharges: Discharge[]): DischargeSuggestion => {
  const arrived = [...discharges].sort(byArrival);
  const units = arrived.map((unit) => placeUnit(streets, unit));
  const placed = units.filter((one): one is Placed => one.state === 'placed');
  const volumes = new Map(discharges.map((unit) => [unit.dispatch_id, unit.m3 ?? 0]));
  const volumeOf = (dispatchId: string): number => volumes.get(dispatchId) ?? 0;
  return { units, stretches: streets.map((street) => stretchOf(street, placed, volumeOf)).filter((stretch): stretch is SuggestedStretch => stretch !== null) };
};
