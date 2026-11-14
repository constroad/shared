import type { Discharge } from './discharges';
import type { MapPhoto } from './mapPhotos';
/**
 * The days of a work that was done in several stages (José, 09/11/2026, Globofast): the map offers
 * «Todos» or ONE day of placement, and a unit is numbered inside its day, like «Volquete N.° 1» in the
 * report. The day is the day in Lima: a unit that unloaded at 10 pm belongs to that day, not to the
 * next one in UTC. Pure.
 */
export declare const ALL_DAYS = "all";
export declare const limaDayOf: (value?: string | null) => string | null;
/** The day a unit unloaded: its arrival, or the first point it left when the arrival was not told. */
export declare const dischargeDayOf: (discharge: Discharge) => string | null;
/** The days that have photos or units, once each, newest first. */
export declare const mediaDaysOf: (photos: readonly MapPhoto[], discharges: readonly Discharge[]) => string[];
/** «Todos» keeps everything, even what has no date; a day keeps what happened that day. */
export declare const filterMediaByDay: <Photo extends MapPhoto>(photos: Photo[], discharges: Discharge[], day: string) => {
    photos: Photo[];
    discharges: Discharge[];
};
/** The number of each unit inside its own day, by arrival; every day starts again at 1. */
export declare const unitNumbersOf: (discharges: readonly Discharge[]) => Map<string, number>;
/** «Sáb 07/11». The weekday is read at noon UTC so the time zone cannot move the date. */
export declare const dayLabel: (day: string) => string;
/** `#rrggbb` from hue (0–360), saturation and lightness (0–100). */
export declare const hslToHex: (hue: number, saturation: number, lightness: number) => string;
/** What a color input gives: exactly `#rrggbb`. */
export declare const isHexColor: (value: unknown) => value is string;
/** The automatic color of each day (YYYY-MM-DD); what is not a day has none. */
export declare const dayColorsOf: (days: readonly string[]) => Map<string, string>;
