import { type LatLng } from './streetGeometry';
import type { BasemapStreet } from './basemapStreet';
/**
 * The street the engineer tapped and the stretch of work on it (José 07/11: easy and fluid for a
 * field engineer). The basemap gives the whole street, blocks long; instead of typing «Hasta»,
 * the engineer taps where the work starts and ends ON that street. The cut follows the street's
 * own axis, so it never leaves the real road and needs no routing service.
 *
 * PURE: Portal and Lilachat draw from here.
 */
export type StreetPick = {
    name: string;
    axis: LatLng[];
    fromM: number | null;
    toM: number | null;
};
export type PickStep = 'start' | 'end' | 'done';
export type PickTap = {
    kind: 'marked';
    pick: StreetPick;
} | {
    kind: 'other_street';
};
/** Farther than this from the picked axis, a tap means another street (half a block). */
export declare const PICK_SWITCH_M = 30;
export declare function pickStreet(street: BasemapStreet): StreetPick | null;
/** A tap on the picked street marks the start, then the end; a third starts again. Off it: another street. */
export declare function tapOnPick(pick: StreetPick, tap: LatLng): PickTap;
/** What is marked, in meters along the street, and what the next tap does. Unmarked = the whole street. */
export declare function pickedRange(pick: StreetPick): {
    fromM: number;
    toM: number;
    step: PickStep;
};
/** The line that is saved: the stretch between the two taps, or the whole street. */
export declare function pickedLine(pick: StreetPick): LatLng[];
