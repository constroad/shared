"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.combinePeruInputDateWithCurrentTime = exports.combinePeruInputDateAndTime = exports.buildPeruDateRange = exports.toPeruCalendarInputDate = exports.toPeruInputTime = exports.currentPeruInputTime = exports.toPeruInputDate = exports.formatPeruDate = exports.formatPeruDateTime = exports.shiftPeruInputDate = exports.daysAgoPeruInputDate = exports.todayPeruInputDate = void 0;
const peruDates_1 = require("./peruDates");
const PERU_TIME_ZONE = 'America/Lima';
const PERU_UTC_OFFSET = '-05:00';
const ENGLISH_SHORT_MONTHS = {
    Apr: '04',
    Aug: '08',
    Dec: '12',
    Feb: '02',
    Jan: '01',
    Jul: '07',
    Jun: '06',
    Mar: '03',
    May: '05',
    Nov: '11',
    Oct: '10',
    Sep: '09',
};
const dateTimeFormatter = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    timeZone: PERU_TIME_ZONE,
});
const dateFormatter = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    timeZone: PERU_TIME_ZONE,
    year: '2-digit',
});
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    timeZone: PERU_TIME_ZONE,
});
const TIME_INPUT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const todayPeruInputDate = () => (0, peruDates_1.getPeruDateString)();
exports.todayPeruInputDate = todayPeruInputDate;
const daysAgoPeruInputDate = (days) => (0, exports.shiftPeruInputDate)((0, exports.todayPeruInputDate)(), -days);
exports.daysAgoPeruInputDate = daysAgoPeruInputDate;
const shiftPeruInputDate = (dateInput, days) => {
    const baseDate = new Date(`${dateInput}T00:00:00.000${PERU_UTC_OFFSET}`);
    baseDate.setUTCDate(baseDate.getUTCDate() + days);
    return (0, peruDates_1.getPeruDateInputValue)(baseDate);
};
exports.shiftPeruInputDate = shiftPeruInputDate;
const formatPeruDateTime = (value) => dateTimeFormatter.format(new Date(value));
exports.formatPeruDateTime = formatPeruDateTime;
const formatPeruDate = (value) => dateFormatter.format(new Date(value));
exports.formatPeruDate = formatPeruDate;
const toPeruInputDate = (value) => (0, peruDates_1.getPeruDateInputValue)(value);
exports.toPeruInputDate = toPeruInputDate;
const currentPeruInputTime = () => timeFormatter.format(new Date());
exports.currentPeruInputTime = currentPeruInputTime;
const toPeruInputTime = (value) => {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime()))
        throw new Error('Invalid date');
    return timeFormatter.format(parsedDate);
};
exports.toPeruInputTime = toPeruInputTime;
const toPeruCalendarInputDate = (value) => {
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime()))
            throw new Error('Invalid date');
        return (0, peruDates_1.getPeruDateInputValue)(value);
    }
    const trimmedValue = value.trim();
    const isoDateMatch = trimmedValue.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/);
    if (isoDateMatch)
        return isoDateMatch[1];
    const browserDateMatch = trimmedValue.match(/^[A-Za-z]{3}\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})$/);
    if (browserDateMatch) {
        const [, monthName, dayValue, yearValue] = browserDateMatch;
        const monthValue = ENGLISH_SHORT_MONTHS[monthName];
        if (!monthValue)
            throw new Error('Invalid date');
        return `${yearValue}-${monthValue}-${dayValue.padStart(2, '0')}`;
    }
    const parsedDate = new Date(trimmedValue);
    if (Number.isNaN(parsedDate.getTime()))
        throw new Error('Invalid date');
    return (0, peruDates_1.getPeruDateInputValue)(parsedDate);
};
exports.toPeruCalendarInputDate = toPeruCalendarInputDate;
const buildPeruDateRange = (startDate, endDate) => {
    const startInput = (0, exports.toPeruCalendarInputDate)(startDate);
    const endInput = (0, exports.toPeruCalendarInputDate)(endDate);
    return {
        end: new Date(`${endInput}T23:59:59.999${PERU_UTC_OFFSET}`),
        start: new Date(`${startInput}T00:00:00.000${PERU_UTC_OFFSET}`),
    };
};
exports.buildPeruDateRange = buildPeruDateRange;
const combinePeruInputDateAndTime = (dateInput, timeInput) => {
    const calendarDate = (0, exports.toPeruCalendarInputDate)(dateInput);
    const normalizedTime = timeInput.trim();
    const timeMatch = normalizedTime.match(TIME_INPUT_REGEX);
    if (!timeMatch)
        throw new Error('Invalid time');
    return new Date(`${calendarDate}T${normalizedTime}:00.000${PERU_UTC_OFFSET}`).toISOString();
};
exports.combinePeruInputDateAndTime = combinePeruInputDateAndTime;
const combinePeruInputDateWithCurrentTime = (dateInput) => (0, exports.combinePeruInputDateAndTime)(dateInput, (0, exports.currentPeruInputTime)());
exports.combinePeruInputDateWithCurrentTime = combinePeruInputDateWithCurrentTime;
