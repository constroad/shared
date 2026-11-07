import { suggestDischarges, type StreetAxis } from './dischargeStretches';
import type { Discharge, DischargePoint } from './discharges';

/** From the runway control photos to the stretch each unit worked (Lilachat design o-07). */
const METERS_PER_DEGREE = 111_195;
const START = { lat: -12.05, lng: -77.03 };
const north = (meters: number, sideM = 0) => ({
  lat: START.lat + meters / METERS_PER_DEGREE,
  lng: START.lng + sideM / (METERS_PER_DEGREE * Math.cos((START.lat * Math.PI) / 180)),
});
const streets: StreetAxis[] = [
  { _id: 'pinos', name: 'Jr. Los Pinos', geometry: [north(0), north(320)], lengthM: 320 },
  { _id: 'incas', name: 'Av. Los Incas', geometry: [north(150, -200), north(150, 200)], lengthM: 400 },
];
const unit = (id: string, plate: string, m3: number | undefined, ...places: Array<{ lat: number; lng: number }>): Discharge => ({
  dispatch_id: id,
  plate,
  ...(m3 === undefined ? {} : { m3 }),
  arrival_at: `2026-11-06T12:0${id.slice(-1)}:00.000Z`,
  points: places.map((place, index): DischargePoint => ({ kind: index === 0 ? 'ingreso' : 'vacia', ...place, at: '2026-11-06T12:30:00.000Z' })),
});

describe('suggestDischarges', () => {
  it('places a unit on the stretch between its first and last photo', () => {
    // Act
    const { units } = suggestDischarges(streets, [unit('d1', 'QAP-101', 7.5, north(120), north(144))]);

    // Assert
    expect(units[0]).toEqual({ state: 'placed', dispatchId: 'd1', streetId: 'pinos', fromM: 120, toM: 144 });
  });

  it('accepts a photo from the sidewalk and keeps the street where most photos fall', () => {
    // Act
    const sidewalk = suggestDischarges(streets, [unit('d1', 'QAP-101', 8, north(60, 9))]);
    const corner = suggestDischarges(streets, [unit('d1', 'QAP-101', 8, north(150, 2), north(150, 40), north(150, 70))]);

    // Assert
    expect(sidewalk.units[0].state).toBe('placed');
    expect(corner.units[0]).toMatchObject({ state: 'placed', streetId: 'incas' });
  });

  it('marks a unit far from every street as outside and keeps where it was; no place or a shaky GPS is noPlace', () => {
    // Arrange
    const far = north(40, 180);
    const shaky: Discharge = { ...unit('d3', 'QAP-103', 7), points: [{ kind: 'vacia', ...north(100), precision_m: 80, at: '2026-11-06T12:30:00.000Z' }] };

    // Act
    const { units, stretches } = suggestDischarges(streets, [unit('d1', 'QAP-101', 7, far), unit('d2', 'QAP-102', 7), shaky]);

    // Assert
    expect(units).toEqual([
      { state: 'outside', dispatchId: 'd1', point: far },
      { state: 'noPlace', dispatchId: 'd2' },
      { state: 'noPlace', dispatchId: 'd3' },
    ]);
    expect(stretches).toEqual([]);
  });

  it('sums one stretch per street from the units placed on it, with their volume and dispatches', () => {
    // Act
    const { stretches } = suggestDischarges(streets, [
      unit('d1', 'QAP-101', 7.5, north(120), north(144)),
      unit('d2', 'QAP-104', undefined, north(144), north(170)),
      unit('d3', 'QAP-102', 8, north(220), north(240)),
      unit('d4', 'QAP-103', 7, north(40, 180)),
    ]);

    // Assert
    expect(stretches).toEqual([{ streetId: 'pinos', streetName: 'Jr. Los Pinos', fromM: 120, toM: 240, lengthM: 120, volumeM3: 15.5, dispatchIds: ['d1', 'd2', 'd3'] }]);
  });

  it('lists the units in the order they arrived, the ones without an hour last', () => {
    // Arrange
    const late = unit('d3', 'QAP-102', 8, north(10));
    const early = unit('d1', 'QAP-101', 8, north(20));
    const unknown: Discharge = { dispatch_id: 'd2', plate: 'QAP-104', m3: 8, points: [{ kind: 'vacia', ...north(30), at: '2026-11-06T12:30:00.000Z' }] };

    // Act
    const { units } = suggestDischarges(streets, [unknown, late, early]);

    // Assert
    expect(units.map((one) => one.dispatchId)).toEqual(['d1', 'd3', 'd2']);
  });

  it('a street that cannot be drawn places nothing', () => {
    // Act
    const { units } = suggestDischarges([{ _id: 'x', name: 'Sin trazo', geometry: [north(0)], lengthM: 0 }], [unit('d1', 'QAP-101', 7, north(0))]);

    // Assert
    expect(units[0].state).toBe('outside');
  });
});
