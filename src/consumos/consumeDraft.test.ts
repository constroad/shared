import { registerConsume, reviewConsume, type ConsumeDraftDeps } from './consumeDraft';

const loadPeriodOrders = jest.fn();
const loadUsedOrders = jest.fn();
const loadRateBaseline = jest.fn();
const loadEngineData = jest.fn();
const saveConsume = jest.fn();

const deps = {
  periodOrders: loadPeriodOrders,
  usedOrders: loadUsedOrders,
  periodReadings: jest.fn(),
  rateBaseline: loadRateBaseline,
  engineData: loadEngineData,
  previewAggregates: async () => [],
  saveConsume,
  consumeLink: async (consumeId: string) => `https://constroad.com/public/consume-report/tok?consumeId=${consumeId}`,
} as unknown as ConsumeDraftDeps;

/**
 * José, 30/10/2026: Wilson reviews and registers the consume from Lilachat.
 * Review never writes; register goes through `saveConsume`, the one path.
 */
const reading = (id: string, date: string, levelCentimeter: number, effectiveGallons: number, extra = {}) => ({
  _id: id, tankId: 'tank-pen', tankName: 'Tanque PEN', eventType: 'measurement' as const, levelCentimeter, effectiveGallons, date, ...extra,
});
const ORDER = { _id: 'o1', cliente: 'CARCELI', obra: 'Chancay', design: 'MAC-2', fechaProgramacion: '2026-10-23T15:00:00.000Z' };
const ARGS = {
  desde: '2026-10-20',
  hasta: '2026-10-26',
  pedidos: ['o1'],
  tramos: [{ tanqueId: 'tank-pen', inicioId: 'm1', finId: 'm2' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  loadPeriodOrders.mockResolvedValue([{ order: ORDER, m3: 160, dispatchCount: 4 }]);
  loadUsedOrders.mockResolvedValue(new Map());
  loadRateBaseline.mockResolvedValue({ averageRatePerM3: 20, sampleSize: 10 });
  loadEngineData.mockResolvedValue({
    tanks: [{ _id: 'tank-pen', name: 'Tanque PEN', tableReference: 'PEN-1', contentType: 'pen' }],
    movements: [reading('m1', '2026-10-20T13:00:00.000Z', 100, 4000), reading('m2', '2026-10-23T13:00:00.000Z', 20, 800)],
    dispatch: { m3: 160, ids: ['d1', 'd2', 'd3', 'd4'] },
  });
  saveConsume.mockResolvedValue({ ok: true, consume: { _id: 'c1' } });
});

describe('reviewConsume', () => {
  it('says what would be saved, without writing', async () => {
    const outcome = await reviewConsume(ARGS, deps);

    expect(outcome).toMatchObject({
      ok: true,
      value: {
        resumen: { m3: 160, despachos: 4, totales: { pen: 3200 }, glPorM3: { pen: 20 }, promedio: { glPorM3: 20, muestras: 10 } },
        conflictos: [],
        avisos: [],
      },
    });
    expect(saveConsume).not.toHaveBeenCalled();
  });

  it('a draft with no orders is not an error: the blocks say what is missing', async () => {
    const outcome = await reviewConsume({ ...ARGS, pedidos: [] }, deps);

    expect(outcome).toMatchObject({ ok: true, value: { blocks: [{ type: 'text', tone: 'warn', text: 'Falta elegir al menos un pedido.' }] } });
  });
});

describe('registerConsume', () => {
  it('saves through saveConsume, says who did it, and returns the public link', async () => {
    const outcome = await registerConsume(ARGS, { name: 'Wilson' }, deps);

    expect(saveConsume).toHaveBeenCalledWith(expect.objectContaining({ quantityPen: 3200, totalCubes: 160, createdBy: { name: 'Wilson', via: 'lila' } }));
    expect(outcome).toMatchObject({ ok: true, value: { consumoId: 'c1', enlace: 'https://constroad.com/public/consume-report/tok?consumeId=c1' } });
  });

  it('an order already used, or a draft without a complete tank, is not saved', async () => {
    loadUsedOrders.mockResolvedValueOnce(new Map([['o1', '2026-10-22T20:00:00.000Z']]));
    expect(await registerConsume(ARGS, {}, deps)).toEqual({ ok: false, message: 'El pedido CARCELI · Chancay ya está en el consumo del 22/10.' });

    expect(await registerConsume({ ...ARGS, tramos: [{ tanqueId: 'tank-pen', inicioId: 'm1' }] }, {}, deps)).toEqual({
      ok: false,
      message: 'Falta un tanque con inicio y fin.',
    });
    expect(saveConsume).not.toHaveBeenCalled();
  });

  it('a 409 of the write path comes back as it is', async () => {
    saveConsume.mockResolvedValueOnce({ ok: false, status: 409, message: 'Una o más medidas ya fueron usadas en otro consumo.' });

    expect(await registerConsume(ARGS, {}, deps)).toEqual({ ok: false, message: 'Una o más medidas ya fueron usadas en otro consumo.' });
  });
});
