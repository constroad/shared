import { addDaysIso, dateWeekday, mondayOf } from './dates';
import { closeFixedPeriod } from './fixedClose';
import { payDays, type PayDay } from './payDays';
import type { Salary } from './salary';

/**
 * A fixed salary paid every week and closed every period
 * (SPEC.md §4): a full month pays EXACTLY the salary, with 28,
 * 29, 30 or 31 days; absences at the treintavo; the close settles the
 * difference with what was advanced.
 */

const SALARY = 300000;
const MONTHLY: Salary[] = [{ kind: 'monthly', amount: 3000, from: '2025-01-01' }];
const SUNDAY = 0;

const workDay = (date: string, absences: readonly string[]): PayDay => {
  const scheduled = dateWeekday(date) !== SUNDAY;
  const worked = scheduled && !absences.includes(date);
  return { date, scheduled, worked, excused: false, regularMin: worked ? 480 : 0, overtime25Min: 0, overtime35Min: 0, restDayMin: 0 };
};

/** What the weekly payments of the weeks touching the month advanced for THAT month. */
const advancedFor = (salaries: Salary[], start: string, end: string, periodKey: string, absences: readonly string[] = []): number => {
  let advanced = 0;
  for (let monday = mondayOf(start); monday <= end; monday = addDaysIso(monday, 7)) {
    const days = Array.from({ length: 7 }, (_, offset) => workDay(addDaysIso(monday, offset), absences));
    advanced += payDays({ days, salaries }).lines.filter((line) => line.period === periodKey).reduce((total, line) => total + line.centimos, 0);
  }
  return advanced;
};

describe('a monthly salary closes at the exact amount, whatever the month’s length', () => {
  it.each([
    ['January (31)', '2026-01-01', '2026-01-31', '2026-01'],
    ['February (28)', '2026-02-01', '2026-02-28', '2026-02'],
    ['February of a leap year (29)', '2028-02-01', '2028-02-29', '2028-02'],
    ['April (30)', '2026-04-01', '2026-04-30', '2026-04'],
  ])('%s: S/ 3 000.00, and the advances plus the settlement add up to it', (_label, start, end, key) => {
    const advanced = advancedFor(MONTHLY, start, end, key);
    const close = closeFixedPeriod({ salaries: MONTHLY, date: start, absences: [], advancedCentimos: advanced });
    expect(close?.period).toMatchObject({ key, start, end });
    expect(close?.dueCentimos).toBe(SALARY);
    expect(advanced + (close?.settlementCentimos ?? NaN)).toBe(SALARY);
    // The advance by calendar day is already almost exact: only rounding is left.
    expect(Math.abs(close?.settlementCentimos ?? NaN)).toBeLessThanOrEqual(3);
  });
});

describe('absences and partial months', () => {
  it('one absence in February: S/ 2 900', () => {
    const absences = ['2026-02-11'];
    const advanced = advancedFor(MONTHLY, '2026-02-01', '2026-02-28', '2026-02', absences);
    const close = closeFixedPeriod({ salaries: MONTHLY, date: '2026-02-11', absences, advancedCentimos: advanced });
    expect(close?.dueCentimos).toBe(290000);
    expect(advanced + (close?.settlementCentimos ?? NaN)).toBe(290000);
  });

  it('an absence outside the period, or outside the employment, is not discounted', () => {
    expect(closeFixedPeriod({ salaries: MONTHLY, date: '2026-02-11', absences: ['2026-03-02'], advancedCentimos: 0 })?.dueCentimos).toBe(SALARY);
    expect(closeFixedPeriod({ salaries: MONTHLY, date: '2026-04-20', absences: ['2026-04-02'], advancedCentimos: 0, employedFrom: '2026-04-16' })?.dueCentimos).toBe(150000);
  });

  it('hired on the 16th of April: the 15 days employed, by calendar day', () => {
    expect(closeFixedPeriod({ salaries: MONTHLY, date: '2026-04-20', absences: [], advancedCentimos: 0, employedFrom: '2026-04-16' })?.dueCentimos).toBe(150000);
  });

  it('left on the 10th of February: 10 days of 28', () => {
    expect(closeFixedPeriod({ salaries: MONTHLY, date: '2026-02-05', absences: [], advancedCentimos: 0, employedTo: '2026-02-10' })?.dueCentimos).toBe(107143);
  });

  it('a raise on the 16th: each day with the salary in force that day', () => {
    const history: Salary[] = [...MONTHLY, { kind: 'monthly', amount: 3600, from: '2026-04-16' }];
    expect(closeFixedPeriod({ salaries: history, date: '2026-04-01', absences: [], advancedCentimos: 0 })?.dueCentimos).toBe(330000);
  });
});

describe('half-month and week', () => {
  const BIWEEKLY: Salary[] = [{ kind: 'biweekly', amount: 1500, from: '2025-01-01' }];

  it('a half-month of 16 days (16–31 January) pays exactly the half-month; so do 15 and 13 days', () => {
    expect(closeFixedPeriod({ salaries: BIWEEKLY, date: '2026-01-20', absences: [], advancedCentimos: 0 })).toMatchObject({ period: { key: '2026-01-Q2', days: 16 }, dueCentimos: 150000 });
    expect(closeFixedPeriod({ salaries: BIWEEKLY, date: '2026-02-05', absences: [], advancedCentimos: 0 })?.dueCentimos).toBe(150000);
    expect(closeFixedPeriod({ salaries: BIWEEKLY, date: '2026-02-20', absences: [], advancedCentimos: 0 })?.dueCentimos).toBe(150000);
  });

  it('the 16-day half-month, paid weekly, adds up to it exactly', () => {
    const advanced = advancedFor(BIWEEKLY, '2026-01-16', '2026-01-31', '2026-01-Q2');
    const close = closeFixedPeriod({ salaries: BIWEEKLY, date: '2026-01-16', absences: [], advancedCentimos: advanced });
    expect(advanced + (close?.settlementCentimos ?? NaN)).toBe(150000);
  });

  it('an absence in a half-month: ÷ 15', () => {
    expect(closeFixedPeriod({ salaries: BIWEEKLY, date: '2026-01-20', absences: ['2026-01-21'], advancedCentimos: 0 })?.dueCentimos).toBe(140000);
  });

  it('a weekly salary: the week is its period, so the advance is the close', () => {
    const WEEKLY: Salary[] = [{ kind: 'weekly', amount: 700, from: '2025-01-01' }];
    const advanced = advancedFor(WEEKLY, '2026-01-26', '2026-02-01', '2026-01-26');
    expect(advanced).toBe(70000);
    expect(closeFixedPeriod({ salaries: WEEKLY, date: '2026-01-28', absences: [], advancedCentimos: advanced })?.settlementCentimos).toBe(0);
  });

  it('a daily wage has no period to close', () => {
    expect(closeFixedPeriod({ salaries: [{ kind: 'daily', amount: 80, from: '2026-01-01' }], date: '2026-01-20', absences: [], advancedCentimos: 0 })).toBeNull();
  });
});
