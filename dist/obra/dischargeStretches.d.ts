import { type LatLng } from './streetGeometry';
import type { Discharge } from './discharges';
/**
 * From the runway control report to the work map (Lilachat design o-07): the photos of a unit carry
 * the place they were taken, and their projection on a street is the stretch that unit worked. It
 * is a suggestion: an admin confirms it or corrects it before it becomes progress.
 */
export type StreetAxis = {
    _id: string;
    name: string;
    geometry: LatLng[];
    lengthM: number;
};
export type PlacedUnit = {
    state: 'placed';
    dispatchId: string;
    streetId: string;
    fromM: number;
    toM: number;
} | {
    state: 'outside';
    dispatchId: string;
    point: LatLng;
} | {
    state: 'noPlace';
    dispatchId: string;
};
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
export type DischargeSuggestion = {
    units: PlacedUnit[];
    stretches: SuggestedStretch[];
};
/** Farther than this from the axis is not that street: Portal's search radius and a sidewalk. */
export declare const STREET_REACH_M = 30;
/** A fix worse than this does not tell one stretch from the next. */
export declare const WORST_PRECISION_M = 30;
/** Each unit placed on a street (or outside the work, or without a place) and one stretch per street. */
export declare const suggestDischarges: (streets: StreetAxis[], discharges: Discharge[]) => DischargeSuggestion;
