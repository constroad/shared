/** Calendar dates as `YYYY-MM-DD` strings (Lima). Noon UTC keeps every operation off daylight-saving edges. */

const DAY_MS = 24 * 60 * 60 * 1000;
const MONDAY_OFFSET = 6;
const WEEK_DAYS = 7;

const noonOf = (date: string): number => Date.parse(`${date}T12:00:00Z`);

export const addDaysIso = (date: string, days: number): string => new Date(noonOf(date) + days * DAY_MS).toISOString().slice(0, 10);

/** 0 = Sunday … 6 = Saturday. */
export const dateWeekday = (date: string): number => new Date(noonOf(date)).getUTCDay();

export const mondayOf = (date: string): string => addDaysIso(date, -((dateWeekday(date) + MONDAY_OFFSET) % WEEK_DAYS));
