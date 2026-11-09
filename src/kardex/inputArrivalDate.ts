const PERU_TIME_ZONE = 'America/Lima';
const PERU_UTC_OFFSET = '-05:00';
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LEGACY_PERU_DATE_PATTERN =
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?)?$/i;

const normalizeMeridiem = (value?: string): 'am' | 'pm' | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase().replace(/[\s.]/g, '');
  return normalized === 'am' || normalized === 'pm' ? normalized : undefined;
};

const isValidCalendarDate = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): boolean => {
  const candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day &&
    candidate.getUTCHours() === hour &&
    candidate.getUTCMinutes() === minute &&
    candidate.getUTCSeconds() === second
  );
};

const pad = (value: number): string => String(value).padStart(2, '0');

/** A legacy «d/m/yyyy, h:mm a. m.» match as a Lima date; null when it is not a real moment. */
const legacyPeruDate = (match: RegExpMatchArray): Date | null => {
  const [, dayText, monthText, yearText, hourText, minuteText, secondText, meridiemText] = match;
  const year = Number(yearText);
  const firstDatePart = Number(dayText);
  const secondDatePart = Number(monthText);
  const usesMonthFirst = secondDatePart > 12 && firstDatePart <= 12;
  const month = usesMonthFirst ? firstDatePart : secondDatePart;
  const day = usesMonthFirst ? secondDatePart : firstDatePart;
  const minute = Number(minuteText ?? 0);
  const second = Number(secondText ?? 0);
  const hour = hourOf24(Number(hourText ?? 0), normalizeMeridiem(meridiemText));
  if (hour === null || !isValidCalendarDate(year, month, day, hour, minute, second)) return null;
  return new Date(`${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}${PERU_UTC_OFFSET}`);
};

/** The hour on a 24-hour clock; null when a 12-hour clock gives an hour outside 1-12. */
const hourOf24 = (hour: number, meridiem: 'am' | 'pm' | undefined): number | null => {
  if (!meridiem) return hour;
  if (hour < 1 || hour > 12) return null;
  if (meridiem === 'am') return hour === 12 ? 0 : hour;
  return hour === 12 ? hour : hour + 12;
};

export const parseInputArrivalDate = (
  value?: string | Date | null
): Date | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalized = value.trim();
  const legacyMatch = normalized.match(LEGACY_PERU_DATE_PATTERN);
  if (legacyMatch) return legacyPeruDate(legacyMatch);

  if (ISO_DATE_PATTERN.test(normalized)) {
    return new Date(`${normalized}T00:00:00${PERU_UTC_OFFSET}`);
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatArrival = (
  value: string | Date | null | undefined,
  fallback: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions
): string => {
  const parsed = parseInputArrivalDate(value) ?? parseInputArrivalDate(fallback);
  if (!parsed) return '';
  return new Intl.DateTimeFormat('es-PE', { timeZone: PERU_TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric', ...options }).format(parsed);
};

export const formatInputArrivalDate = (
  value?: string | Date | null,
  fallback?: string | Date | null
): string => formatArrival(value, fallback, {});

export const formatInputArrivalDateTime = (
  value?: string | Date | null,
  fallback?: string | Date | null
): string => formatArrival(value, fallback, { hour: '2-digit', minute: '2-digit', hour12: true });

export const buildInputArrivalISOString = (
  dateInput: string,
  timeSource: Date = new Date()
): string => {
  const [year, month, day] = dateInput.split('-').map(Number);
  if (
    !ISO_DATE_PATTERN.test(dateInput) ||
    !isValidCalendarDate(year, month, day, 0, 0, 0)
  ) {
    return timeSource.toISOString();
  }

  const timeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: PERU_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(timeSource);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    timeParts.find((entry) => entry.type === type)?.value ?? '00';

  return new Date(
    `${dateInput}T${part('hour')}:${part('minute')}:${part('second')}${PERU_UTC_OFFSET}`
  ).toISOString();
};
