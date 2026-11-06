import {
  buildPeruDateRange,
  combinePeruInputDateAndTime,
  toPeruCalendarInputDate,
  toPeruInputTime,
} from './tankMovementDates';

describe('toPeruCalendarInputDate', () => {
  it('keeps yyyy-mm-dd values unchanged', () => {
    expect(toPeruCalendarInputDate('2026-06-13')).toBe('2026-06-13');
  });

  it('parses browser toDateString values without shifting the day', () => {
    expect(toPeruCalendarInputDate('Tue Apr 14 2026')).toBe('2026-04-14');
  });
});

describe('buildPeruDateRange', () => {
  it('builds a Lima day range from browser toDateString values', () => {
    const range = buildPeruDateRange('Tue Apr 14 2026', 'Sat Jun 13 2026');

    expect(range.start.toISOString()).toBe('2026-04-14T05:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-06-14T04:59:59.999Z');
  });
});

describe('combinePeruInputDateAndTime', () => {
  it('builds an ISO date from Lima date and time inputs', () => {
    expect(combinePeruInputDateAndTime('2026-06-10', '07:30')).toBe('2026-06-10T12:30:00.000Z');
  });

  it('preserves the calendar day from browser date strings', () => {
    expect(combinePeruInputDateAndTime('Tue Apr 14 2026', '23:59')).toBe('2026-04-15T04:59:00.000Z');
  });

  it('rejects malformed time input', () => {
    expect(() => combinePeruInputDateAndTime('2026-06-10', '24:00')).toThrow('Invalid time');
  });
});

describe('toPeruInputTime', () => {
  it('formats ISO timestamps as Lima time inputs', () => {
    expect(toPeruInputTime('2026-06-10T12:30:00.000Z')).toBe('07:30');
  });

  it('rejects invalid dates', () => {
    expect(() => toPeruInputTime('invalid-date')).toThrow('Invalid date');
  });
});
