import { readFileSync } from 'fs';
import { join } from 'path';
import type { GoldenCases, GoldenPayCase, GoldenShift } from './casos';
import { closeFixedPeriod } from './fixedClose';
import { payDays } from './payDays';

/** The golden cases through the package itself: the numbers every app must reproduce. */

const golden = JSON.parse(readFileSync(join(__dirname, '..', 'casos.json'), 'utf8')) as GoldenCases;

describe('casos.json', () => {
  it('covers what José asked for: February, leap year, 16-day half-month, a week across months, absences, overtime and the three weekly-rest options', () => {
    const ids = golden.cases.map((goldenCase) => goldenCase.id);
    expect(ids).toEqual(expect.arrayContaining(['mensual-febrero', 'mensual-febrero-bisiesto', 'quincena-16-dias', 'mensual-semana-cruza-mes', 'mensual-falta-febrero', 'mensual-extras', 'jornal-semana-completa', 'jornal-proporcional-con-falta', 'jornal-ninguno']));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('the attendance of a case adds up to its PayDays: worked minutes = regular + overtime, on the day the shift started', () => {
    const minutesOf = (shift: GoldenShift): number => (Date.parse(`${shift.end}:00Z`) - Date.parse(`${shift.start}:00Z`)) / 60_000 - shift.breakMin;
    const withAttendance = golden.cases.filter((goldenCase): goldenCase is GoldenPayCase => goldenCase.fn === 'payDays' && Boolean(goldenCase.attendance));
    expect(withAttendance.length).toBeGreaterThanOrEqual(3);
    for (const goldenCase of withAttendance) {
      for (const day of goldenCase.attendance!.days) {
        const payDay = goldenCase.input.days.find((candidate) => candidate.date === day.date)!;
        expect(day.shifts.every((shift) => shift.start.startsWith(day.date))).toBe(true);
        expect(payDay.regularMin + payDay.overtime25Min + payDay.overtime35Min).toBe(day.shifts.reduce((total, shift) => total + minutesOf(shift), 0));
        expect(payDay.regularMin).toBe(Math.min(day.jornadaMin, payDay.regularMin + payDay.overtime25Min + payDay.overtime35Min));
      }
    }
  });

  it.each(golden.cases.map((goldenCase) => [goldenCase.id, goldenCase] as const))('%s', (_id, goldenCase) => {
    if (goldenCase.fn === 'payDays') {
      const result = payDays(goldenCase.input);
      expect(result.totalCentimos).toBe(goldenCase.expected.totalCentimos);
      expect(result.lines.map(({ concept, centimos, period }) => ({ concept, centimos, period }))).toEqual(goldenCase.expected.lines);
      return;
    }
    const close = closeFixedPeriod(goldenCase.input);
    expect(close?.dueCentimos).toBe(goldenCase.expected.dueCentimos);
    if (goldenCase.expected.periodDays) expect(close?.period.days).toBe(goldenCase.expected.periodDays);
  });
});
