import { addDaysIso, dateWeekday } from './dates';
import { payDays, type PayDay, type PayLine } from './payDays';
import type { Salary } from './salary';

/**
 * The canonical pay of a range of days (SPEC.md §3–6): the base
 * by salary kind, the weekly rest by the company’s policy, the overtime with
 * the hour value of each kind and the rest day worked with its surcharge.
 */

const SUNDAY = 0;
const day = (date: string, over: Partial<PayDay> = {}): PayDay => {
  const scheduled = dateWeekday(date) !== SUNDAY;
  return { date, scheduled, worked: scheduled, excused: false, regularMin: scheduled ? 480 : 0, overtime25Min: 0, overtime35Min: 0, restDayMin: 0, ...over };
};
/** Monday to Sunday; `over` by the offset from Monday. */
const week = (monday: string, over: Record<number, Partial<PayDay>> = {}): PayDay[] => Array.from({ length: 7 }, (_, offset) => day(addDaysIso(monday, offset), over[offset]));
const lineOf = (lines: PayLine[], concept: PayLine['concept']): PayLine | undefined => lines.find((line) => line.concept === concept);

const JORNAL: Salary[] = [{ kind: 'daily', amount: 80, from: '2026-01-01' }];
const MONTHLY: Salary[] = [{ kind: 'monthly', amount: 3000, from: '2025-01-01' }];
const MONDAY = '2026-10-19';
const WEDNESDAY = 2;

describe('daily wage: the days worked plus the weekly rest, by policy', () => {
  it('a full week: 6 days, and the rest with «semana_completa» and «proporcional»; nothing with «ninguno»', () => {
    const full = week(MONDAY);
    expect(payDays({ days: full, salaries: JORNAL }).lines.map((line) => [line.concept, line.centimos])).toEqual([['dias', 48000], ['descanso_semanal', 8000]]);
    expect(lineOf(payDays({ days: full, salaries: JORNAL, policy: { weeklyRest: 'proporcional' } }).lines, 'descanso_semanal')?.centimos).toBe(8000);
    expect(payDays({ days: full, salaries: JORNAL, policy: { weeklyRest: 'ninguno' } }).totalCentimos).toBe(48000);
  });

  it('an absence: no rest with «semana_completa», 5/6 of a jornal with «proporcional»', () => {
    const missing = week(MONDAY, { [WEDNESDAY]: { worked: false, regularMin: 0 } });
    const complete = payDays({ days: missing, salaries: JORNAL });
    expect(complete).toMatchObject({ totalCentimos: 40000, absences: ['2026-10-21'] });
    expect(lineOf(complete.lines, 'descanso_semanal')).toBeUndefined();
    expect(lineOf(payDays({ days: missing, salaries: JORNAL, policy: { weeklyRest: 'proporcional' } }).lines, 'descanso_semanal')).toMatchObject({ centimos: 6667, quantity: 0.8333 });
  });

  it('a paid leave or holiday is not an absence and counts for the rest, but is not a day worked', () => {
    const result = payDays({ days: week(MONDAY, { [WEDNESDAY]: { worked: false, excused: true, regularMin: 0 } }), salaries: JORNAL });
    expect(result).toMatchObject({ totalCentimos: 48000, absences: [] });
    expect(lineOf(result.lines, 'dias')?.quantity).toBe(5);
  });

  it('a week still running (fewer than 7 days) does not earn the rest yet', () => {
    expect(lineOf(payDays({ days: week(MONDAY).slice(0, 6), salaries: JORNAL }).lines, 'descanso_semanal')).toBeUndefined();
  });

  describe('8 h every day, Saturday too (José, 23/10/2026), whatever the app’s own jornada', () => {
    const SATURDAY = '2026-10-24';
    // The app’s schedule gives Saturday 5 h: what it sends as overtime past 5 h is re-split at 8 h.
    it('8 h on Saturday: a full jornal, no overtime', () => {
      const result = payDays({ days: [day(SATURDAY, { regularMin: 300, overtime25Min: 120, overtime35Min: 60 })], salaries: JORNAL });
      expect(result.lines).toEqual([{ concept: 'dias', quantity: 1, minutes: null, centimos: 8000, period: null, note: null }]);
    });

    it('5 h: in proportion, 5/8 of the jornal', () => {
      expect(payDays({ days: [day(SATURDAY, { regularMin: 300 })], salaries: JORNAL }).totalCentimos).toBe(5000);
    });

    it('9 h: the jornal and 1 h at +25 % over jornal ÷ 8', () => {
      const result = payDays({ days: [day(SATURDAY, { regularMin: 300, overtime25Min: 120, overtime35Min: 120 })], salaries: JORNAL });
      expect(lineOf(result.lines, 'dias')?.centimos).toBe(8000);
      expect(lineOf(result.lines, 'extra_25')).toMatchObject({ minutes: 60, centimos: 1250 });
      expect(lineOf(result.lines, 'extra_35')).toBeUndefined();
    });

    it('11 h: 2 h at +25 % and 1 h at +35 %', () => {
      const result = payDays({ days: [day(MONDAY, { regularMin: 480, overtime25Min: 120, overtime35Min: 60 })], salaries: JORNAL });
      expect(lineOf(result.lines, 'extra_25')).toMatchObject({ minutes: 120, centimos: 2500 });
      expect(lineOf(result.lines, 'extra_35')).toMatchObject({ minutes: 60, centimos: 1350 });
    });

    it('a rejected overtime comes as 0 and is not paid', () => {
      expect(payDays({ days: [day(MONDAY, { regularMin: 480 })], salaries: JORNAL }).totalCentimos).toBe(8000);
    });
  });
});

describe('monthly: the weekly advance by calendar day, overtime over jornal ÷ 8', () => {
  it('a week that crosses from January to February: each day with the value of its month', () => {
    const result = payDays({ days: week('2026-01-26'), salaries: MONTHLY });
    expect(result.lines.filter((line) => line.concept === 'sueldo')).toEqual([
      { concept: 'sueldo', quantity: 6, minutes: null, centimos: 58065, period: '2026-01', note: null },
      { concept: 'sueldo', quantity: 1, minutes: null, centimos: 10714, period: '2026-02', note: null },
    ]);
    expect(result.totalCentimos).toBe(68779);
  });

  it('an absence is discounted at the treintavo, in its period; the fixed salary has no weekly-rest line', () => {
    const result = payDays({ days: week('2026-02-09', { [WEDNESDAY]: { worked: false, regularMin: 0 } }), salaries: MONTHLY });
    expect(lineOf(result.lines, 'faltas')).toEqual({ concept: 'faltas', quantity: 1, minutes: null, centimos: -10000, period: '2026-02', note: null });
    expect(lineOf(result.lines, 'descanso_semanal')).toBeUndefined();
  });

  it('overtime as it comes in the day: jornal (3 000 ÷ 30) ÷ 8 × 1.25 and × 1.35', () => {
    const result = payDays({ days: [day('2026-02-10', { overtime25Min: 120, overtime35Min: 60 })], salaries: MONTHLY });
    expect(lineOf(result.lines, 'extra_25')).toMatchObject({ minutes: 120, centimos: 3125 });
    expect(lineOf(result.lines, 'extra_35')).toMatchObject({ minutes: 60, centimos: 1688 });
  });
});

describe('by the hour', () => {
  const HOURLY: Salary[] = [{ kind: 'hourly', amount: 12.5, from: '2026-01-01' }];

  it('the minutes inside the jornada × the hourly amount; overtime over it; the rest is 8 hours', () => {
    const result = payDays({ days: week(MONDAY, { 0: { overtime25Min: 60 } }), salaries: HOURLY });
    expect(lineOf(result.lines, 'horas')).toMatchObject({ minutes: 2880, centimos: 60000 });
    expect(lineOf(result.lines, 'extra_25')?.centimos).toBe(1563);
    expect(lineOf(result.lines, 'descanso_semanal')?.centimos).toBe(10000);
  });
});

describe('rest day worked and edges', () => {
  it('hour value (jornal ÷ 8) × hours, without surcharge by default (note «recargo por verificar»); the company can set one', () => {
    const sunday = [day('2026-10-25', { worked: true, restDayMin: 240 })];
    expect(lineOf(payDays({ days: sunday, salaries: JORNAL }).lines, 'descanso_trabajado')).toMatchObject({ minutes: 240, centimos: 4000, note: 'recargo por verificar' });
    expect(lineOf(payDays({ days: sunday, salaries: JORNAL, policy: { restDayWorkedPercent: 200 } }).lines, 'descanso_trabajado')).toMatchObject({ centimos: 8000, note: null });
  });

  it('without a salary in force on any day: no total', () => {
    expect(payDays({ days: week('2025-12-01'), salaries: JORNAL })).toEqual({ mode: 'no_salary', lines: [], totalCentimos: null, absences: [], estimated: true });
  });

  it('a day without a salary in force is not paid; the others are', () => {
    const result = payDays({ days: week('2025-12-29'), salaries: JORNAL });
    expect(lineOf(result.lines, 'dias')).toMatchObject({ quantity: 3, centimos: 24000 });
  });
});
