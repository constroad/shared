import { dailyRateOf, datesOf, isFixedSalary, salaryInForce, settlementPeriodOf, type Salary } from './salary';

/**
 * Salary kinds (SPEC.md §3–4): the history by date, the daily
 * rate of each kind (the «treintavo» for fixed salaries), the hour divisor
 * and the settlement period of a fixed salary.
 */

const monthly = (amount: number, from = '2026-01-01'): Salary => ({ kind: 'monthly', amount, from });

describe('salaryInForce', () => {
  it('the one with the latest «from» that does not pass the date; the last loaded wins a tie', () => {
    const history: Salary[] = [monthly(3000), monthly(3600, '2026-04-16'), { kind: 'monthly', amount: 3500, from: '2026-04-16' }];
    expect(salaryInForce(history, '2026-04-15')?.amount).toBe(3000);
    expect(salaryInForce(history, '2026-04-16')?.amount).toBe(3500);
  });

  it('before any salary, or with a malformed date: none', () => {
    expect(salaryInForce([monthly(3000)], '2025-12-31')).toBeNull();
    expect(salaryInForce([monthly(3000)], '16/04/2026')).toBeNull();
  });
});

describe('daily rate', () => {
  it('fixed salaries by the treintavo: month ÷ 30, half-month ÷ 15, week ÷ 7', () => {
    expect(dailyRateOf(monthly(3000))).toEqual({ numerator: 300000, denominator: 30 });
    expect(dailyRateOf({ kind: 'biweekly', amount: 1500, from: '2026-01-01' })).toEqual({ numerator: 150000, denominator: 15 });
    expect(dailyRateOf({ kind: 'weekly', amount: 700, from: '2026-01-01' })).toEqual({ numerator: 70000, denominator: 7 });
  });

  it('a daily wage is itself; by the hour, 8 hours', () => {
    expect(dailyRateOf({ kind: 'daily', amount: 80, from: '2026-01-01' })).toEqual({ numerator: 8000, denominator: 1 });
    expect(dailyRateOf({ kind: 'hourly', amount: 12.5, from: '2026-01-01' })).toEqual({ numerator: 10000, denominator: 1 });
  });

  it('only weekly, biweekly and monthly are fixed', () => {
    expect(['daily', 'hourly', 'weekly', 'biweekly', 'monthly'].map((kind) => isFixedSalary(kind as Salary['kind']))).toEqual([false, false, true, true, true]);
  });
});

describe('settlementPeriodOf', () => {
  it('the month, with its real length (2028 is a leap year)', () => {
    expect(settlementPeriodOf('monthly', '2026-01-20')).toEqual({ key: '2026-01', start: '2026-01-01', end: '2026-01-31', days: 31 });
    expect(settlementPeriodOf('monthly', '2026-02-20').days).toBe(28);
    expect(settlementPeriodOf('monthly', '2028-02-29')).toEqual({ key: '2028-02', start: '2028-02-01', end: '2028-02-29', days: 29 });
    expect(settlementPeriodOf('monthly', '2026-04-30').days).toBe(30);
  });

  it('the half-month: 1–15 and 16 to the end of the month', () => {
    expect(settlementPeriodOf('biweekly', '2026-01-15')).toEqual({ key: '2026-01-Q1', start: '2026-01-01', end: '2026-01-15', days: 15 });
    expect(settlementPeriodOf('biweekly', '2026-01-16')).toEqual({ key: '2026-01-Q2', start: '2026-01-16', end: '2026-01-31', days: 16 });
    expect(settlementPeriodOf('biweekly', '2026-02-28').days).toBe(13);
  });

  it('the week, Monday to Sunday', () => {
    expect(settlementPeriodOf('weekly', '2026-02-01')).toEqual({ key: '2026-01-26', start: '2026-01-26', end: '2026-02-01', days: 7 });
  });
});

describe('helpers', () => {
  it('the dates of a range, both ends included', () => {
    expect(datesOf('2026-02-27', '2026-03-02')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
    expect(datesOf('2026-03-02', '2026-03-01')).toEqual([]);
  });

});
