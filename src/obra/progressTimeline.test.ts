import { progressDays } from './progressTimeline';
import type { StreetProgressEvent } from './streetProgress';

/**
 * The client report's timeline: the "día 1 / día 2 / día 3" that was drawn by
 * hand on the Civil 3D drawing, and comes for free here because events are
 * dated.
 */

const event = (date: string, over: Partial<StreetProgressEvent> = {}): StreetProgressEvent => ({
  workId: 'p1',
  fromM: 0,
  toM: 50,
  status: 'approved',
  date,
  ...over,
});

describe('progressDays', () => {
  it('sin avance no hay línea de tiempo', () => {
    expect(progressDays([])).toEqual([]);
  });

  it('devuelve los días con trabajo, en orden y sin repetir', () => {
    const days = progressDays([
      event('2026-08-03'),
      event('2026-08-01'),
      event('2026-08-01', { workId: 'p2' }),
    ]);

    expect(days.map((day) => day.date)).toEqual(['2026-08-01', '2026-08-03']);
  });

  it('numera las jornadas: el "día 1 / día 2" del plano', () => {
    const days = progressDays([event('2026-08-03'), event('2026-08-01')]);

    expect(days.map((day) => day.dayNumber)).toEqual([1, 2]);
  });

  it('solo cuenta lo APROBADO: al cliente no se le muestra lo que falta revisar', () => {
    const days = progressDays([event('2026-08-01'), event('2026-08-05', { status: 'pending' })]);

    expect(days.map((day) => day.date)).toEqual(['2026-08-01']);
  });

  it('un día de solo reproceso igual es un día trabajado', () => {
    // It adds no coverage, but a crew was on the street: hiding it would make
    // it look like nothing happened that day.
    const days = progressDays([event('2026-08-02', { rework: true })]);

    expect(days).toHaveLength(1);
  });

  it('ignora eventos sin fecha', () => {
    expect(progressDays([event('2026-08-01'), { ...event('2026-08-02'), date: undefined }])).toHaveLength(1);
  });

  it('ordena por STRING, no por Date', () => {
    // Comparing `YYYY-MM-DD` as text is safe and avoids the one-day shift that
    // building a `Date` from a date-only value causes (portal-pitfalls §1).
    const days = progressDays([event('2026-12-31'), event('2026-01-01'), event('2026-02-10')]);

    expect(days.map((day) => day.date)).toEqual(['2026-01-01', '2026-02-10', '2026-12-31']);
  });
});
