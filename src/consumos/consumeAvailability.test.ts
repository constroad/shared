import { deriveConsumePeriod, extractUniqueConsumeMovementIds } from './consumeAvailability';

describe('extractUniqueConsumeMovementIds', () => {
  it('joins the refs and the measures, without repeating or keeping empty ids', () => {
    const consume = { movementRefs: [{ movementId: 'a' }, { movementId: '' }], measures: [{ movementIds: ['a', 'b'] }, {}] };
    expect(extractUniqueConsumeMovementIds(consume)).toEqual(['a', 'b']);
  });

  it('gives nothing for a consume with no readings', () => {
    expect(extractUniqueConsumeMovementIds({})).toEqual([]);
  });
});

describe('deriveConsumePeriod', () => {
  it('goes from the first reading to the last', () => {
    const period = deriveConsumePeriod({ date: '2026-11-06', movementRefs: [{ date: '2026-11-03T10:00:00Z' }, { date: '2026-11-01T10:00:00Z' }] });
    expect(period.periodStart.toISOString()).toBe('2026-11-01T10:00:00.000Z');
    expect(period.periodEnd.toISOString()).toBe('2026-11-03T10:00:00.000Z');
  });

  it('falls back to the date of the consume, also over a reading with a broken date', () => {
    const period = deriveConsumePeriod({ date: '2026-11-06T00:00:00Z', movementRefs: [{ date: 'not a date' }] });
    expect(period.periodStart.toISOString()).toBe('2026-11-06T00:00:00.000Z');
    expect(period.periodEnd).toEqual(period.periodStart);
  });
});
