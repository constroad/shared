import type { Discharge } from './discharges';
import type { MapPhoto } from './mapPhotos';
import { ALL_DAYS, dayColorsOf, dayLabel, dischargeDayOf, filterMediaByDay, hslToHex, isHexColor, limaDayOf, mediaDaysOf, unitNumbersOf } from './mediaDays';

/**
 * A work done in several days (José, 09/11/2026, Globofast): the map offers «Todos» or ONE day of placement,
 * and a unit is numbered inside its day, like «Volquete N.° 1» in the report. The day is the day in Lima:
 * a unit that unloaded at 10 pm is of that day, not of the next one in UTC.
 */
const photo = (id: string, at: string): MapPhoto => ({ id, lat: -12, lng: -77, at, kind: 'photo', url: `/files/${id}.jpg`, thumbnailUrl: `/files/${id}-t.jpg` });
const discharge = (id: string, plate: string, arrivalAt?: string, pointAt?: string): Discharge => ({
  dispatch_id: id,
  plate,
  ...(arrivalAt ? { arrival_at: arrivalAt } : {}),
  points: pointAt ? [{ kind: 'vacia', lat: -12, lng: -77, at: pointAt }] : [],
});

const NOV_7_3PM = '2026-11-07T20:00:00.000Z';
const NOV_7_10PM = '2026-11-08T03:00:00.000Z';
const NOV_8_1AM = '2026-11-08T06:00:00.000Z';
const NOV_8_2PM = '2026-11-08T19:00:00.000Z';

describe('limaDayOf', () => {
  it('is the day in Lima: ten at night is still that day, though UTC says the next one', () => {
    expect(limaDayOf(NOV_7_3PM)).toBe('2026-11-07');
    expect(limaDayOf(NOV_7_10PM)).toBe('2026-11-07');
    expect(limaDayOf(NOV_8_1AM)).toBe('2026-11-08');
  });

  it('is null for what is not a date', () => {
    expect(limaDayOf('')).toBeNull();
    expect(limaDayOf('no es fecha')).toBeNull();
    expect(limaDayOf(undefined)).toBeNull();
  });
});

describe('dischargeDayOf', () => {
  it('takes the arrival, then the first point it left, and has none without either', () => {
    expect(dischargeDayOf(discharge('d1', 'A', NOV_8_2PM, NOV_7_3PM))).toBe('2026-11-08');
    expect(dischargeDayOf(discharge('d2', 'B', undefined, NOV_7_3PM))).toBe('2026-11-07');
    expect(dischargeDayOf(discharge('d3', 'C'))).toBeNull();
  });
});

describe('mediaDaysOf', () => {
  it('lists the days of the photos and the units, once each, newest first', () => {
    const days = mediaDaysOf([photo('p1', NOV_7_3PM), photo('p2', NOV_7_10PM)], [discharge('d1', 'A', NOV_8_2PM)]);

    expect(days).toEqual(['2026-11-08', '2026-11-07']);
  });

  it('has no days when nothing carries a date', () => {
    expect(mediaDaysOf([], [discharge('d1', 'A')])).toEqual([]);
  });
});

describe('filterMediaByDay', () => {
  const photos = [photo('p1', NOV_7_3PM), photo('p2', NOV_8_2PM)];
  const discharges = [discharge('d1', 'A', NOV_7_3PM), discharge('d2', 'B', NOV_8_2PM), discharge('d3', 'C')];

  it('«Todos» keeps everything, even what has no date', () => {
    expect(filterMediaByDay(photos, discharges, ALL_DAYS)).toEqual({ photos, discharges });
  });

  it('a day keeps only what happened that day', () => {
    const only = filterMediaByDay(photos, discharges, '2026-11-08');

    expect(only.photos.map((one) => one.id)).toEqual(['p2']);
    expect(only.discharges.map((one) => one.plate)).toEqual(['B']);
  });
});

describe('unitNumbersOf', () => {
  it('numbers each unit by its arrival inside its own day, starting again every day', () => {
    const numbers = unitNumbersOf([
      discharge('late', 'C9R-753', '2026-11-07T22:00:00.000Z'),
      discharge('first', 'T2T-809', '2026-11-07T14:00:00.000Z'),
      discharge('next', 'AZJ-910', NOV_8_2PM),
    ]);

    expect(numbers.get('first')).toBe(1);
    expect(numbers.get('late')).toBe(2);
    expect(numbers.get('next')).toBe(1);
  });

  it('a unit with no date is numbered among the others with no date, after the dated ones of no day', () => {
    const numbers = unitNumbersOf([discharge('a', 'A'), discharge('b', 'B')]);

    expect([numbers.get('a'), numbers.get('b')]).toEqual([1, 2]);
  });
});

describe('dayLabel', () => {
  it('says the weekday and the day and month, without shifting the date by the time zone', () => {
    expect(dayLabel('2026-11-07')).toBe('Sáb 07/11');
    expect(dayLabel('2026-11-09')).toBe('Lun 09/11');
  });

  it('shows what it was given when it is not a day', () => {
    expect(dayLabel('')).toBe('Sin fecha');
  });
});

/**
 * Each day of placement has its own color on the map (José, 09/11/2026: «un color distinto por fecha»).
 * It is derived from the date, so it is the same on every reload and in every session, and the days
 * next to each other look different. Red is left out: it already means «off the work».
 */
const hueOf = (hex: string): number => {
  const [red, green, blue] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const max = Math.max(red, green, blue);
  const delta = max - Math.min(red, green, blue);
  if (delta === 0) return 0;
  const sector = max === red ? ((green - blue) / delta) % 6 : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
  return (sector * 60 + 360) % 360;
};
const hueGap = (left: number, right: number): number => Math.min(Math.abs(left - right), 360 - Math.abs(left - right));

describe('hslToHex', () => {
  it('writes a color as #rrggbb', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
    expect(hslToHex(120, 100, 50)).toBe('#00ff00');
    expect(hslToHex(240, 100, 50)).toBe('#0000ff');
    expect(hslToHex(0, 0, 100)).toBe('#ffffff');
  });
});

describe('isHexColor', () => {
  it('accepts only #rrggbb, which is what a color input gives', () => {
    expect(isHexColor('#1a2B3c')).toBe(true);
    expect(isHexColor('#fff')).toBe(false);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor('')).toBe(false);
    expect(isHexColor(undefined)).toBe(false);
  });
});

describe('dayColorsOf', () => {
  const DAYS = ['2026-10-16', '2026-10-17', '2026-10-19', '2026-10-20', '2026-11-09'];

  it('gives each day a color, the same ones whatever the order the days come in', () => {
    const colors = dayColorsOf(DAYS);

    expect([...colors.keys()].sort()).toEqual(DAYS);
    expect([...colors.values()].every(isHexColor)).toBe(true);
    expect(dayColorsOf([...DAYS].reverse())).toEqual(colors);
  });

  it('gives the days colors that can be told apart, even when their dates are far apart', () => {
    const hues = [...dayColorsOf(DAYS).values()].map(hueOf);

    for (let first = 0; first < hues.length; first += 1) {
      for (let second = first + 1; second < hues.length; second += 1) {
        expect(hueGap(hues[first], hues[second])).toBeGreaterThanOrEqual(30);
      }
    }
  });

  it('a newer day does not repaint the days already on the map', () => {
    const before = dayColorsOf(DAYS);
    const after = dayColorsOf([...DAYS, '2026-11-10']);

    DAYS.forEach((day) => expect(after.get(day)).toBe(before.get(day)));
    expect(after.get('2026-11-10')).toBeDefined();
  });

  it('never lands on red, which means «off the work»', () => {
    const many = Array.from({ length: 40 }, (_, offset) => new Date(Date.UTC(2026, 9, 1 + offset)).toISOString().slice(0, 10));

    [...dayColorsOf(many).values()].forEach((color) => expect(hueGap(hueOf(color), 0)).toBeGreaterThanOrEqual(20));
  });

  it('has no color for what is not a day, and none for no days', () => {
    expect([...dayColorsOf(['', 'Sin fecha', '2026-11-07']).keys()]).toEqual(['2026-11-07']);
    expect(dayColorsOf([]).size).toBe(0);
  });
});
