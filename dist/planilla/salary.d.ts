/**
 * Salary kinds (SPEC.md §3–4). PURE. The same values Portal uses
 * (`SalaryPeriod`). A salary is a HISTORY by date: each day is paid with the
 * one in force that day.
 */
export declare const SALARY_KINDS: readonly ["daily", "hourly", "weekly", "biweekly", "monthly"];
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
export declare const BASE_DAYS: Readonly<Record<FixedSalaryKind, number>>;
/** A daily rate in cents as an exact fraction. */
export interface CentsFraction {
    numerator: number;
    denominator: number;
}
/** The jornada every kind pays against: the hour value is the daily rate ÷ 8 h (José, 23/10/2026). */
export declare const STANDARD_DAY_MIN: number;
export declare const isFixedSalary: (kind: SalaryKind) => kind is FixedSalaryKind;
/** The one with the latest `from` not past the date; with two of the same day, the last loaded (a correction). */
export declare const salaryInForce: (salaries: readonly Salary[], date: string) => Salary | null;
export declare const dailyRateOf: (salary: Salary) => CentsFraction;
/** The period a fixed salary settles: its month, its half-month (1–15, 16–end) or its week (Monday–Sunday). */
export interface SettlementPeriod {
    key: string;
    start: string;
    end: string;
    days: number;
}
export declare const settlementPeriodOf: (kind: FixedSalaryKind, date: string) => SettlementPeriod;
/** Every date from `start` to `end`, both included. */
export declare const datesOf: (start: string, end: string) => string[];
