import { getPeruDateInputValue, getPeruDateString } from './peruDates';

describe('getPeruDateInputValue', () => {
  it('keeps a calendar day as it comes', () => {
    expect(getPeruDateInputValue(' 2026-11-06 ')).toBe('2026-11-06');
  });

  it('reads an instant on the Lima calendar, not the UTC one', () => {
    expect(getPeruDateInputValue('2026-11-07T03:00:00.000Z')).toBe('2026-11-06');
    expect(getPeruDateInputValue(new Date('2026-11-07T05:00:00.000Z'))).toBe('2026-11-07');
  });

  it('gives an empty value for nothing or for what is not a date', () => {
    expect(getPeruDateInputValue(null)).toBe('');
    expect(getPeruDateInputValue(undefined)).toBe('');
    expect(getPeruDateInputValue('')).toBe('');
    expect(getPeruDateInputValue('not a date')).toBe('');
  });
});

describe('getPeruDateString', () => {
  afterEach(() => jest.useRealTimers());

  it('is today in Lima, also when UTC is already tomorrow', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-07T03:00:00.000Z'));
    expect(getPeruDateString()).toBe('2026-11-06');
  });
});
