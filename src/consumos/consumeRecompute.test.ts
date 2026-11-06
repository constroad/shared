import type { ConsumeMovementRecord } from './consumeMovementFlow';
import {
  CONSUME_NOT_COMPUTABLE_MESSAGE,
  recomputeConsume,
  selectionFromConsume,
  type ConsumeRecomputeDeps,
  toEngineMovement,
} from './consumeRecompute';
import type { ConsumeInput } from './consumeRecompute';

/**
 * José, 30/10/2026: the server no longer trusts the figures the browser sends.
 * It recomputes the consume from the readings and dispatches in the database;
 * when they differ, the server wins and the difference is logged.
 */
const PEN_TANK = { _id: 'tank-pen', name: 'Tanque PEN', tableReference: 'PEN-1', contentType: 'pen' as const };

const reading = (id: string, date: string, levelCentimeter: number, effectiveGallons: number): ConsumeMovementRecord => ({
  _id: id,
  tankId: 'tank-pen',
  tankName: 'Tanque PEN',
  eventType: 'measurement',
  levelCentimeter,
  effectiveGallons,
  date,
});

// A refill reading the browser did not have when it calculated (m3).
const READINGS = [
  reading('m1', '2026-10-20T13:00:00.000Z', 100, 4000),
  reading('m2', '2026-10-21T13:00:00.000Z', 60, 2400),
  reading('m3', '2026-10-22T13:00:00.000Z', 120, 4800),
  reading('m4', '2026-10-23T13:00:00.000Z', 80, 3200),
];

const browserConsume = (overrides: Partial<ConsumeInput> = {}): ConsumeInput => ({
  source: 'tank-movements',
  date: new Date('2026-10-23T15:00:00.000Z'),
  orders: [{ orderId: 'order-1', orderName: 'CARCELI', orderClient: 'CARCELI', tipoMAC: 'MAC-2' }],
  measures: [{ tank: 'PEN-1', tankId: 'tank-pen', initialMeasure: 100, finalMeasure: 80, quantityConsumed: 800, movementIds: ['m1', 'm2', 'm4'] }],
  movementRefs: [],
  dispatchIds: ['d1'],
  computedM3: 150,
  totalCubes: 150,
  quantityPen: 800,
  quantityGasohol: 0,
  quantityPetroleo: 0,
  quantityGas: 0,
  penConsume: 5.3333,
  calculationNotes: 'Semana 43',
  ...overrides,
} as unknown as ConsumeInput);

const depsWith = (overrides: Partial<Awaited<ReturnType<ConsumeRecomputeDeps['loadEngineData']>>> = {}) => {
  const loadEngineData = jest.fn().mockResolvedValue({
    tanks: [PEN_TANK],
    movements: READINGS,
    dispatch: { m3: 160, ids: ['d1', 'd2'] },
    ...overrides,
  });
  const log = jest.fn();
  return { deps: { loadEngineData, log }, loadEngineData, log };
};

describe('selectionFromConsume', () => {
  it('the marked readings by tank, and the order ids', () => {
    expect(selectionFromConsume(browserConsume())).toEqual({
      orderIds: ['order-1'],
      selectionByTankKey: { 'tank-pen': ['m1', 'm2', 'm4'] },
    });
  });
});

describe('recomputeConsume', () => {
  it('the server recomputes from the database: the reading in between and the real m³ win', async () => {
    const { deps, loadEngineData, log } = depsWith();

    const saved = await recomputeConsume({ companyId: 'test', consume: browserConsume() }, deps);

    expect(loadEngineData).toHaveBeenCalledWith('test', { orderIds: ['order-1'], selectionByTankKey: { 'tank-pen': ['m1', 'm2', 'm4'] } });
    expect(saved).toMatchObject({ quantityPen: 3200, totalCubes: 160, computedM3: 160, penConsume: 20, dispatchIds: ['d1', 'd2'], calculationNotes: 'Semana 43' });
    expect(saved.measures?.[0].movementIds).toEqual(['m1', 'm2', 'm3', 'm4']);
    expect(saved.orders).toEqual(browserConsume().orders);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('quantityPen'));
  });

  it('the manual m³ the person typed is kept', async () => {
    const { deps } = depsWith();

    const saved = await recomputeConsume({ companyId: 'test', consume: browserConsume({ manualM3: 200 } as Partial<ConsumeInput>) }, deps);

    expect(saved).toMatchObject({ totalCubes: 200, manualM3: 200, computedM3: 160, penConsume: 16 });
  });

  it('when the figures match, nothing is logged', async () => {
    const { deps, log } = depsWith({ movements: [READINGS[0], READINGS[1]], dispatch: { m3: 150, ids: ['d1'] } });

    await recomputeConsume({ companyId: 'test', consume: browserConsume({ quantityPen: 1600 } as Partial<ConsumeInput>) }, deps);

    expect(log).not.toHaveBeenCalled();
  });

  it('a legacy consume is saved as it came, without reading the database', async () => {
    const { deps, loadEngineData } = depsWith();
    const legacy = browserConsume({ source: 'legacy' } as Partial<ConsumeInput>);

    expect(await recomputeConsume({ companyId: 'test', consume: legacy }, deps)).toBe(legacy);
    expect(loadEngineData).not.toHaveBeenCalled();
  });

  it('if the database leaves no tank with start and end, it is not saved', async () => {
    const { deps } = depsWith({ movements: [READINGS[0]] });

    await expect(recomputeConsume({ companyId: 'test', consume: browserConsume() }, deps)).rejects.toThrow(CONSUME_NOT_COMPUTABLE_MESSAGE);
  });
});

describe('toEngineMovement', () => {
  it('keeps when the reading was registered: it breaks a same-minute tie, as on the screen', () => {
    const movement = toEngineMovement({ _id: 'm1', tankId: 't1', tankName: 'PEN', eventType: 'measurement', levelCentimeter: 25, effectiveGallons: 1000, date: new Date('2026-07-04T20:31:00Z'), createdAt: new Date('2026-07-04T20:31:32.522Z') } as never);

    expect(movement.createdAt).toBe('2026-07-04T20:31:32.522Z');
  });
});
