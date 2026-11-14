"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dayColorsOf = exports.isHexColor = exports.hslToHex = exports.dayLabel = exports.unitNumbersOf = exports.filterMediaByDay = exports.mediaDaysOf = exports.dischargeDayOf = exports.limaDayOf = exports.ALL_DAYS = void 0;
/**
 * The days of a work that was done in several stages (José, 09/11/2026, Globofast): the map offers
 * «Todos» or ONE day of placement, and a unit is numbered inside its day, like «Volquete N.° 1» in the
 * report. The day is the day in Lima: a unit that unloaded at 10 pm belongs to that day, not to the
 * next one in UTC. Pure.
 */
exports.ALL_DAYS = 'all';
const NO_DATE_LABEL = 'Sin fecha';
const LIMA = 'America/Lima';
const WEEKDAY_ES = new Intl.DateTimeFormat('es-PE', { weekday: 'short', timeZone: 'UTC' });
/** `en-CA` writes a date as YYYY-MM-DD. */
const LIMA_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: LIMA, year: 'numeric', month: '2-digit', day: '2-digit' });
/** The key of what has no day: it is numbered among its own. */
const NO_DAY = '';
const limaDayOf = (value) => {
    if (!value)
        return null;
    const instant = new Date(value);
    return Number.isNaN(instant.getTime()) ? null : LIMA_DAY.format(instant);
};
exports.limaDayOf = limaDayOf;
const arrivalOf = (discharge) => discharge.arrival_at || discharge.points[0]?.at;
/** The day a unit unloaded: its arrival, or the first point it left when the arrival was not told. */
const dischargeDayOf = (discharge) => (0, exports.limaDayOf)(arrivalOf(discharge));
exports.dischargeDayOf = dischargeDayOf;
/** The days that have photos or units, once each, newest first. */
const mediaDaysOf = (photos, discharges) => {
    const days = new Set();
    photos.forEach((photo) => {
        const day = (0, exports.limaDayOf)(photo.at);
        if (day)
            days.add(day);
    });
    discharges.forEach((discharge) => {
        const day = (0, exports.dischargeDayOf)(discharge);
        if (day)
            days.add(day);
    });
    return Array.from(days).sort().reverse();
};
exports.mediaDaysOf = mediaDaysOf;
/** «Todos» keeps everything, even what has no date; a day keeps what happened that day. */
const filterMediaByDay = (photos, discharges, day) => day === exports.ALL_DAYS
    ? { photos, discharges }
    : { photos: photos.filter((photo) => (0, exports.limaDayOf)(photo.at) === day), discharges: discharges.filter((discharge) => (0, exports.dischargeDayOf)(discharge) === day) };
exports.filterMediaByDay = filterMediaByDay;
/** The number of each unit inside its own day, by arrival; every day starts again at 1. */
const unitNumbersOf = (discharges) => {
    const byDay = new Map();
    discharges.forEach((discharge) => {
        const key = (0, exports.dischargeDayOf)(discharge) ?? NO_DAY;
        byDay.set(key, [...(byDay.get(key) ?? []), discharge]);
    });
    const numbers = new Map();
    byDay.forEach((units) => {
        [...units]
            .sort((left, right) => (arrivalOf(left) ?? '').localeCompare(arrivalOf(right) ?? ''))
            .forEach((unit, index) => numbers.set(unit.dispatch_id, index + 1));
    });
    return numbers;
};
exports.unitNumbersOf = unitNumbersOf;
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
/** «Sáb 07/11». The weekday is read at noon UTC so the time zone cannot move the date. */
const dayLabel = (day) => {
    const [year, month, date] = day.split('-').map(Number);
    if (!year || !month || !date)
        return NO_DATE_LABEL;
    const noon = new Date(Date.UTC(year, month - 1, date, 12));
    return `${capitalize(WEEKDAY_ES.format(noon).replace('.', ''))} ${String(date).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
};
exports.dayLabel = dayLabel;
/**
 * The colors of the days on the map (José, 09/11/2026: «un color distinto por fecha»). Each day takes the next
 * step of the golden angle on the color wheel, in chronological order, so the days are always far apart; and as
 * a newer day only adds a step, the days already on the map keep their color. Red is left out: it already means
 * «off the work».
 */
const GOLDEN_ANGLE_DEG = 137.508;
const RED_GAP_DEG = 25;
const HUE_SPAN_DEG = 360 - 2 * RED_GAP_DEG;
const DAY_SATURATION_PCT = 70;
const DAY_LIGHTNESS_PCT = 45;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HEX_PATTERN = /^#[0-9a-f]{6}$/i;
const HEX_RADIX = 16;
const HEX_DIGITS = 2;
const CHANNEL_MAX = 255;
const SECTORS = 12;
const SECTOR_DEG = 30;
/** `#rrggbb` from hue (0–360), saturation and lightness (0–100). */
const hslToHex = (hue, saturation, lightness) => {
    const sat = saturation / 100;
    const light = lightness / 100;
    const amount = sat * Math.min(light, 1 - light);
    const channel = (offset) => {
        const sector = (offset + hue / SECTOR_DEG) % SECTORS;
        const value = light - amount * Math.max(-1, Math.min(sector - 3, 9 - sector, 1));
        return Math.round(value * CHANNEL_MAX).toString(HEX_RADIX).padStart(HEX_DIGITS, '0');
    };
    return `#${channel(0)}${channel(8)}${channel(4)}`;
};
exports.hslToHex = hslToHex;
/** What a color input gives: exactly `#rrggbb`. */
const isHexColor = (value) => typeof value === 'string' && HEX_PATTERN.test(value);
exports.isHexColor = isHexColor;
/** The automatic color of each day (YYYY-MM-DD); what is not a day has none. */
const dayColorsOf = (days) => {
    const ordered = Array.from(new Set(days.filter((day) => DAY_PATTERN.test(day)))).sort();
    return new Map(ordered.map((day, step) => [day, (0, exports.hslToHex)(RED_GAP_DEG + ((step * GOLDEN_ANGLE_DEG) % HUE_SPAN_DEG), DAY_SATURATION_PCT, DAY_LIGHTNESS_PCT)]));
};
exports.dayColorsOf = dayColorsOf;
