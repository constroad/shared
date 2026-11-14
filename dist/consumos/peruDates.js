"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPeruDateInputValue = exports.getPeruDateString = void 0;
const PERU_TIME_ZONE = 'America/Lima';
const calendarDay = (moment) => new Intl.DateTimeFormat('en-CA', { day: '2-digit', month: '2-digit', timeZone: PERU_TIME_ZONE, year: 'numeric' }).format(moment);
/** Today in Lima as `YYYY-MM-DD`. */
const getPeruDateString = () => calendarDay(new Date());
exports.getPeruDateString = getPeruDateString;
/** Any date value as the `YYYY-MM-DD` of Lima; an empty or invalid value gives ''. */
const getPeruDateInputValue = (value) => {
    if (value === undefined || value === null || value === '')
        return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()))
        return value.trim();
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : calendarDay(parsed);
};
exports.getPeruDateInputValue = getPeruDateInputValue;
