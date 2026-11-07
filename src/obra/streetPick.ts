import { lengthOfLine, projectToLine, sliceLine, type LatLng } from './streetGeometry';
import type { BasemapStreet } from './basemapStreet';

/**
 * The street the engineer tapped and the stretch of work on it (José 07/11: easy and fluid for a
 * field engineer). The basemap gives the whole street, blocks long; instead of typing «Hasta»,
 * the engineer taps where the work starts and ends ON that street. The cut follows the street's
 * own axis, so it never leaves the real road and needs no routing service.
 *
 * PURE: Portal and Lilachat draw from here.
 */
export type StreetPick = { name: string; axis: LatLng[]; fromM: number | null; toM: number | null };
export type PickStep = 'start' | 'end' | 'done';
export type PickTap = { kind: 'marked'; pick: StreetPick } | { kind: 'other_street' };

/** Farther than this from the picked axis, a tap means another street (half a block). */
export const PICK_SWITCH_M = 30;

export function pickStreet(street: BasemapStreet): StreetPick | null {
  return street.line.length >= 2 ? { name: street.name, axis: street.line, fromM: null, toM: null } : null;
}

/** A tap on the picked street marks the start, then the end; a third starts again. Off it: another street. */
export function tapOnPick(pick: StreetPick, tap: LatLng): PickTap {
  const projected = projectToLine(pick.axis, tap);
  if (!projected || projected.distanceM > PICK_SWITCH_M) return { kind: 'other_street' };
  const at = Math.round(projected.measureM);
  if (pick.fromM === null || pick.toM !== null) return { kind: 'marked', pick: { ...pick, fromM: at, toM: null } };
  return { kind: 'marked', pick: { ...pick, fromM: Math.min(pick.fromM, at), toM: Math.max(pick.fromM, at) } };
}

/** What is marked, in meters along the street, and what the next tap does. Unmarked = the whole street. */
export function pickedRange(pick: StreetPick): { fromM: number; toM: number; step: PickStep } {
  const total = Math.round(lengthOfLine(pick.axis));
  if (pick.fromM === null) return { fromM: 0, toM: total, step: 'start' };
  if (pick.toM === null) return { fromM: pick.fromM, toM: total, step: 'end' };
  return { fromM: pick.fromM, toM: pick.toM, step: 'done' };
}

/** The line that is saved: the stretch between the two taps, or the whole street. */
export function pickedLine(pick: StreetPick): LatLng[] {
  const { fromM, toM, step } = pickedRange(pick);
  return step === 'done' ? sliceLine(pick.axis, fromM, toM) : pick.axis;
}
