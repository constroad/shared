import { readFileSync } from 'fs';
import { join } from 'path';
import type { GoldenCases } from './casos';
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
