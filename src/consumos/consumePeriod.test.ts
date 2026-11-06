import { consumePeriodLabel, consumePeriodTime } from './consumePeriod';

/**
 * The list filters by the measured period (`periodEnd`, `createdAt` for legacy
 * consumes), so the date it shows and sorts by is that period, not the day it
 * was registered (Lilachat E2E, 31/10/2026: a July consume registered on 31/10).
 */
describe('consumePeriodLabel', () => {
  it('shows the measured span when it covers more than one day', () => {
    expect(consumePeriodLabel({ date: '2026-10-31T15:00:00.000Z', periodStart: '2026-07-04T19:18:00.000Z', periodEnd: '2026-07-10T20:00:00.000Z' })).toBe('04/07/26 – 10/07/26');
  });

  it('shows one day when the period starts and ends the same Lima day', () => {
    expect(consumePeriodLabel({ date: '2026-10-31T15:00:00.000Z', periodStart: '2026-07-04T13:00:00.000Z', periodEnd: '2026-07-05T03:00:00.000Z' })).toBe('04/07/26');
  });

  it('a legacy consume without period shows when it was registered', () => {
    expect(consumePeriodLabel({ date: '2026-05-22T15:00:00.000Z', createdAt: '2026-05-22T16:00:00.000Z' })).toBe('22/05/26');
    expect(consumePeriodLabel({ date: '2026-05-22T15:00:00.000Z' })).toBe('22/05/26');
  });
});

describe('consumePeriodTime', () => {
  it('sorts by the period end, falling back to createdAt and then the date', () => {
    expect(consumePeriodTime({ date: '2026-10-31T15:00:00.000Z', periodEnd: '2026-07-10T20:00:00.000Z' })).toBe(Date.parse('2026-07-10T20:00:00.000Z'));
    expect(consumePeriodTime({ date: '2026-10-31T15:00:00.000Z', createdAt: '2026-06-25T10:00:00.000Z' })).toBe(Date.parse('2026-06-25T10:00:00.000Z'));
    expect(consumePeriodTime({ date: '2026-06-18T10:00:00.000Z' })).toBe(Date.parse('2026-06-18T10:00:00.000Z'));
  });
});
