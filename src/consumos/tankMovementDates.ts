import { getPeruDateInputValue, getPeruDateString } from './peruDates';

const PERU_TIME_ZONE = 'America/Lima';
const PERU_UTC_OFFSET = '-05:00';
const ENGLISH_SHORT_MONTHS: Record<string, string> = {
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

export const todayPeruInputDate = (): string => getPeruDateString();

export const daysAgoPeruInputDate = (days: number): string =>
  shiftPeruInputDate(todayPeruInputDate(), -days);

export const shiftPeruInputDate = (dateInput: string, days: number): string => {
  const baseDate = new Date(`${dateInput}T00:00:00.000${PERU_UTC_OFFSET}`);
  baseDate.setUTCDate(baseDate.getUTCDate() + days);
  return getPeruDateInputValue(baseDate);
};

export const formatPeruDateTime = (value: string | Date): string =>
  dateTimeFormatter.format(new Date(value));

export const formatPeruDate = (value: string | Date): string =>
  dateFormatter.format(new Date(value));

export const toPeruInputDate = (value: string | Date): string =>
  getPeruDateInputValue(value);

export const currentPeruInputTime = (): string =>
  timeFormatter.format(new Date());

export const toPeruInputTime = (value: string | Date): string => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) throw new Error('Invalid date');
  return timeFormatter.format(parsedDate);
};

export const toPeruCalendarInputDate = (value: string | Date): string => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error('Invalid date');
    return getPeruDateInputValue(value);
  }

  const trimmedValue = value.trim();
  const isoDateMatch = trimmedValue.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/);
  if (isoDateMatch) return isoDateMatch[1];

  const browserDateMatch = trimmedValue.match(/^[A-Za-z]{3}\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})$/);
  if (browserDateMatch) {
    const [, monthName, dayValue, yearValue] = browserDateMatch;
    const monthValue = ENGLISH_SHORT_MONTHS[monthName];
    if (!monthValue) throw new Error('Invalid date');
    return `${yearValue}-${monthValue}-${dayValue.padStart(2, '0')}`;
  }

  const parsedDate = new Date(trimmedValue);
  if (Number.isNaN(parsedDate.getTime())) throw new Error('Invalid date');
  return getPeruDateInputValue(parsedDate);
};

export const buildPeruDateRange = (startDate: string | Date, endDate: string | Date) => {
  const startInput = toPeruCalendarInputDate(startDate);
  const endInput = toPeruCalendarInputDate(endDate);

  return {
    end: new Date(`${endInput}T23:59:59.999${PERU_UTC_OFFSET}`),
    start: new Date(`${startInput}T00:00:00.000${PERU_UTC_OFFSET}`),
  };
};

export const combinePeruInputDateAndTime = (dateInput: string, timeInput: string): string => {
  const calendarDate = toPeruCalendarInputDate(dateInput);
  const normalizedTime = timeInput.trim();
  const timeMatch = normalizedTime.match(TIME_INPUT_REGEX);
  if (!timeMatch) throw new Error('Invalid time');
  return new Date(`${calendarDate}T${normalizedTime}:00.000${PERU_UTC_OFFSET}`).toISOString();
};

export const combinePeruInputDateWithCurrentTime = (dateInput: string): string =>
  combinePeruInputDateAndTime(dateInput, currentPeruInputTime());
