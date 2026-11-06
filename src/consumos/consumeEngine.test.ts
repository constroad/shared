import type { ConsumeMovementRecord } from './consumeMovementFlow';
import {
  compareReadings,
  computeConsume,
  computeTankCalculations,
  diffConsumeFigures,
  type EngineTank,
} from './consumeEngine';

/**
 * José, 30/10/2026: Wilson registers fuel consumes from Lilachat, and there is
 * ONE engine. The server recomputes what the browser used to send already
 * calculated; the screen, Inframaq through the gateway and Lila save the same.
 */
const PEN_TANK: EngineTank = { _id: 'tank-pen', name: 'Tanque PEN', tableReference: 'PEN-1', contentType: 'pen' };
const OIL_TANK: EngineTank = { _id: 'tank-oil', name: 'Aceite térmico', tableReference: 'AT-1', contentType: 'thermal_oil' };

const reading = (
  id: string,
  date: string,
  levelCentimeter: number,
  effectiveGallons: number,
  extra: Partial<ConsumeMovementRecord> = {}
): ConsumeMovementRecord => ({
  _id: id,
  tankId: 'tank-pen',
  tankName: 'Tanque PEN',
  eventType: 'measurement' as ConsumeMovementRecord['eventType'],
  levelCentimeter,
  effectiveGallons,
  date,
  ...extra,
});

// Start, a drop, a refill in the middle and the end: the real shape of a week.
const WEEK = [
  reading('m1', '2026-10-20T13:00:00.000Z', 100, 4000),
  reading('m2', '2026-10-21T13:00:00.000Z', 60, 2400),
  reading('m3', '2026-10-22T13:00:00.000Z', 120, 4800),
  reading('m4', '2026-10-23T13:00:00.000Z', 80, 3200),
];

const ORDER = { orderId: 'order-1', orderName: 'CARCELI · 20/10/2026 · Chancay', orderClient: 'CARCELI', tipoMAC: 'MAC-2' };

describe('computeTankCalculations', () => {
  it('start and end marked: the readings in between join, and a refill does not subtract consumption', () => {
    const [calculation] = computeTankCalculations({
      tanks: [PEN_TANK],
      movements: WEEK,
      selectionByTankKey: { 'tank-pen': ['m1', 'm4'] },
    });

    expect(calculation.selectedMovements.map((movement) => movement._id)).toEqual(['m1', 'm2', 'm3', 'm4']);
    expect(calculation.consumedGallons).toBe(3200);
    expect(calculation.intervals.map((interval) => interval.intervalType)).toEqual(['consumption', 'refill', 'consumption']);
    expect(calculation.isComplete).toBe(true);
  });

  it('a reading used by another consume is left out; one of the consume being edited stays', () => {
    const movements = [
      WEEK[0],
      { ...WEEK[1], consumedByConsumeId: 'other-consume' },
      { ...WEEK[2], consumedByConsumeId: 'this-consume' },
      WEEK[3],
    ];

    const [calculation] = computeTankCalculations({
      tanks: [PEN_TANK],
      movements,
      selectionByTankKey: { 'tank-pen': ['m1', 'm4'] },
      ignoredConsumeId: 'this-consume',
    });

    expect(calculation.selectedMovements.map((movement) => movement._id)).toEqual(['m1', 'm3', 'm4']);
    expect(calculation.consumedGallons).toBe(1600);
  });

  it('a reading of a shared alias with another tank id is grouped by the tank name', () => {
    const aliasReading = reading('m9', '2026-10-24T13:00:00.000Z', 70, 2800, { tankId: 'alias-of-other-company', tankName: 'TANQUE PEN' });

    const [calculation] = computeTankCalculations({
      tanks: [PEN_TANK],
      movements: [WEEK[3], aliasReading],
      selectionByTankKey: { 'tank-pen': ['m4', 'm9'] },
    });

    expect(calculation.consumedGallons).toBe(400);
  });

  it('a tank with one point is incomplete and an unselected tank does not appear', () => {
    const calculations = computeTankCalculations({
      tanks: [PEN_TANK, OIL_TANK],
      movements: WEEK,
      selectionByTankKey: { 'tank-pen': ['m2'] },
    });

    expect(calculations).toHaveLength(1);
    expect(calculations[0].isComplete).toBe(false);
  });
});

describe('computeConsume', () => {
  const oilWeek = [
    reading('o1', '2026-10-20T13:00:00.000Z', 50, 500, { tankId: 'tank-oil', tankName: 'Aceite térmico' }),
    reading('o2', '2026-10-23T13:00:00.000Z', 40, 400, { tankId: 'tank-oil', tankName: 'Aceite térmico' }),
  ];

  it('totals by content and gl/m³ over the dispatched m³; thermal oil counts as petroleum', () => {
    const outcome = computeConsume({
      tanks: [PEN_TANK, OIL_TANK],
      movements: [...WEEK, ...oilWeek],
      selectionByTankKey: { 'tank-pen': ['m1', 'm4'], 'tank-oil': ['o1', 'o2'] },
      orders: [ORDER],
      dispatch: { m3: 160, ids: ['d1', 'd2'] },
    });

    expect(outcome.payload).toMatchObject({
      source: 'tank-movements',
      quantityPen: 3200,
      quantityPetroleo: 100,
      quantityGasohol: 0,
      totalCubes: 160,
      computedM3: 160,
      penConsume: 20,
      petroleoConsume: 0.625,
      dispatchIds: ['d1', 'd2'],
    });
    expect(outcome.payload.measures.map((measure) => measure.movementIds)).toEqual([['m1', 'm2', 'm3', 'm4'], ['o1', 'o2']]);
    expect(outcome.incompleteTanks).toEqual([]);
  });

  it('the manual m³ replaces the dispatched ones', () => {
    const outcome = computeConsume({
      tanks: [PEN_TANK],
      movements: WEEK,
      selectionByTankKey: { 'tank-pen': ['m1', 'm4'] },
      orders: [ORDER],
      dispatch: { m3: 160, ids: [] },
      manualM3: 200,
      calculationNotes: 'Recarga del martes',
    });

    expect(outcome.payload).toMatchObject({ totalCubes: 200, computedM3: 160, manualM3: 200, penConsume: 16, calculationNotes: 'Recarga del martes' });
  });

  it('says why it cannot be saved: no order, no complete tank, no m³', () => {
    const outcome = computeConsume({
      tanks: [PEN_TANK],
      movements: WEEK,
      selectionByTankKey: { 'tank-pen': ['m1'] },
      orders: [],
      dispatch: { m3: 0, ids: [] },
    });

    expect(outcome.problems).toEqual(['no-orders', 'no-complete-tank', 'no-cubes']);
    expect(outcome.incompleteTanks).toEqual(['Tanque PEN']);
  });
});

describe('diffConsumeFigures', () => {
  it('lists the figures where the browser and the server disagree, rounding noise aside', () => {
    const server = { quantityPen: 3200, quantityGasohol: 0, quantityPetroleo: 100, totalCubes: 160 };

    expect(diffConsumeFigures({ ...server, quantityPen: 3200.004 }, server)).toEqual([]);
    expect(diffConsumeFigures({ ...server, quantityPen: 1600, totalCubes: 150 }, server)).toEqual([
      { field: 'quantityPen', browser: 1600, server: 3200 },
      { field: 'totalCubes', browser: 150, server: 160 },
    ]);
  });
});

// The form saves the time to the minute: two readings of the same minute tie on
// `date`. The API hands them newest first, so a date-only sort kept them
// reversed and the shown step changed (Inframaq 7066a5f, TEST PEN #1 04/07/2026).
describe('compareReadings', () => {
  const sameMinute = '2026-07-04T20:31:00.000Z';
  const measured = reading('a-measure', sameMinute, 25, 1000, { createdAt: '2026-07-04T20:31:32.522Z' });
  const refilled = reading('b-refill', sameMinute, 162, 6480, { createdAt: '2026-07-04T20:32:05.954Z' });

  it('breaks a same-minute tie by when each reading was registered', () => {
    expect([refilled, measured].sort(compareReadings).map((movement) => movement._id)).toEqual(['a-measure', 'b-refill']);
  });

  it('then by id, so the order never depends on how the list arrived', () => {
    const first = reading('m-1', sameMinute, 10, 400);
    const second = reading('m-2', sameMinute, 20, 800);
    expect([second, first].sort(compareReadings).map((movement) => movement._id)).toEqual(['m-1', 'm-2']);
  });

  it('the calculation reads the tie the same way whatever the input order', () => {
    const start = reading('start', '2026-07-04T19:00:00.000Z', 30, 1200);
    const newestFirst = computeTankCalculations({ tanks: [PEN_TANK], movements: [refilled, measured, start], selectionByTankKey: { 'tank-pen': ['start', 'b-refill'] } });
    const oldestFirst = computeTankCalculations({ tanks: [PEN_TANK], movements: [start, measured, refilled], selectionByTankKey: { 'tank-pen': ['start', 'b-refill'] } });
    expect(newestFirst[0].selectedMovements.map((movement) => movement._id)).toEqual(['start', 'a-measure', 'b-refill']);
    expect(newestFirst[0].consumedGallons).toBe(oldestFirst[0].consumedGallons);
  });
});
