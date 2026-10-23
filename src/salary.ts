import { addDaysIso, mondayOf } from './dates';
import { toCentimos } from './exactCents';

/**
 * Salary kinds (SPEC.md §3–4). PURE. The same values Portal uses
 * (`SalaryPeriod`). A salary is a HISTORY by date: each day is paid with the
 * one in force that day.
 */

export const SALARY_KINDS = ['daily', 'hourly', 'weekly', 'biweekly', 'monthly'] as const;
export type SalaryKind = (typeof SALARY_KINDS)[number];
export type FixedSalaryKind = 'weekly' | 'biweekly' | 'monthly';

export interface Salary {
  kind: SalaryKind;
  /** Soles. */
  amount: number;
  /** Lima calendar date, `YYYY-MM-DD`. */
  from: string;
}

/** The «treintavo»: the days a fixed salary is divided by for its daily rate and its absences. */
export const BASE_DAYS: Readonly<Record<FixedSalaryKind, number>> = { weekly: 7, biweekly: 15, monthly: 30 };

/** A daily rate in cents as an exact fraction. */
export interface CentsFraction {
  numerator: number;
  denominator: number;
}

/** The standard jornada: the hour divisor of every kind but the daily wage. */
export const STANDARD_DAY_MIN = 8 * 60;
const HOURS_PER_DAY = STANDARD_DAY_MIN / 60;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FIRST_HALF_LAST_DAY = 15;

export const isFixedSalary = (kind: SalaryKind): kind is FixedSalaryKind => kind === 'weekly' || kind === 'biweekly' || kind === 'monthly';

/** The one with the latest `from` not past the date; with two of the same day, the last loaded (a correction). */
export const salaryInForce = (salaries: readonly Salary[], date: string): Salary | null => {
  if (!ISO_DATE.test(date)) return null;
  return salaries.reduce<Salary | null>((current, salary) => (salary.from > date ? current : !current || salary.from >= current.from ? salary : current), null);
};

export const dailyRateOf = (salary: Salary): CentsFraction => {
  const cents = toCentimos(salary.amount);
  if (isFixedSalary(salary.kind)) return { numerator: cents, denominator: BASE_DAYS[salary.kind] };
  return { numerator: salary.kind === 'hourly' ? cents * HOURS_PER_DAY : cents, denominator: 1 };
};

/** Minutes the daily rate is divided by for the hour value: 8 h, except a daily wage, over the day’s jornada. */
export const hourDivisorMin = (salary: Salary, jornadaMin: number): number => (salary.kind === 'daily' && jornadaMin > 0 ? jornadaMin : STANDARD_DAY_MIN);

/** The period a fixed salary settles: its month, its half-month (1–15, 16–end) or its week (Monday–Sunday). */
export interface SettlementPeriod {
  key: string;
  start: string;
  end: string;
  days: number;
}

const daysInMonth = (date: string): number => new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).getUTCDate();

export const settlementPeriodOf = (kind: FixedSalaryKind, date: string): SettlementPeriod => {
  const month = date.slice(0, 7);
  const lastDay = daysInMonth(date);
  if (kind === 'weekly') {
    const start = mondayOf(date);
    return { key: start, start, end: addDaysIso(start, 6), days: 7 };
  }
  if (kind === 'monthly') return { key: month, start: `${month}-01`, end: `${month}-${lastDay}`, days: lastDay };
  return Number(date.slice(8, 10)) <= FIRST_HALF_LAST_DAY
    ? { key: `${month}-Q1`, start: `${month}-01`, end: `${month}-${FIRST_HALF_LAST_DAY}`, days: FIRST_HALF_LAST_DAY }
    : { key: `${month}-Q2`, start: `${month}-${FIRST_HALF_LAST_DAY + 1}`, end: `${month}-${lastDay}`, days: lastDay - FIRST_HALF_LAST_DAY };
};

/** Every date from `start` to `end`, both included. */
export const datesOf = (start: string, end: string): string[] => {
  const dates: string[] = [];
  for (let date = start; date <= end; date = addDaysIso(date, 1)) dates.push(date);
  return dates;
};
