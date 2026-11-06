const PERU_TIME_ZONE = 'America/Lima';

const calendarDay = (moment: Date): string =>
  new Intl.DateTimeFormat('en-CA', { day: '2-digit', month: '2-digit', timeZone: PERU_TIME_ZONE, year: 'numeric' }).format(moment);

/** Today in Lima as `YYYY-MM-DD`. */
export const getPeruDateString = (): string => calendarDay(new Date());

/** Any date value as the `YYYY-MM-DD` of Lima; an empty or invalid value gives ''. */
export const getPeruDateInputValue = (value?: string | number | Date | null): string => {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim();
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : calendarDay(parsed);
};
