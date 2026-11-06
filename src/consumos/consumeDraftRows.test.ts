import type { ConsumeMovementRecord } from './consumeMovementFlow';
import {
  contentLabelOf,
  orderRowOf,
  readingRowsOf,
  resolveDraftPeriod,
  reviewBlocksOf,
  reviewFindingsOf,
  selectionFromTramos,
} from './consumeDraftRows';

/**
 * José, 30/10/2026: Wilson registers the consume from Lilachat seeing what he
 * sees today on the screen. These are the rows agentes turns into options.
 */
const reading = (id: string, date: string, levelCentimeter: number, effectiveGallons: number, extra: Partial<ConsumeMovementRecord> = {}): ConsumeMovementRecord => ({
  _id: id,
  tankId: 'tank-pen',
  tankName: 'Tanque PEN',
  eventType: 'measurement',
  levelCentimeter,
  effectiveGallons,
  date,
  ...extra,
});

describe('resolveDraftPeriod', () => {
  const today = '2026-10-30';

  it('without dates, the last 7 days of Lima', () => {
    expect(resolveDraftPeriod({}, today)).toEqual({ ok: true, period: { desde: '2026-10-23', hasta: '2026-10-30' } });
  });

  it('rejects a reversed period, a bad date and more than 31 days', () => {
    expect(resolveDraftPeriod({ desde: '2026-10-25', hasta: '2026-10-20' }, today)).toMatchObject({ ok: false });
    expect(resolveDraftPeriod({ desde: '25/10/2026' }, today)).toMatchObject({ ok: false });
    expect(resolveDraftPeriod({ desde: '2026-08-01', hasta: '2026-10-30' }, today)).toMatchObject({ ok: false });
  });

  it('only one end given: the other is the same day', () => {
    expect(resolveDraftPeriod({ desde: '2026-10-25' }, today)).toEqual({ ok: true, period: { desde: '2026-10-25', hasta: '2026-10-25' } });
  });
});

describe('orderRowOf', () => {
  const order = { _id: 'o1', cliente: 'CARCELI', obra: 'Chancay', design: 'MAC-2', fechaProgramacion: '2026-10-23T15:00:00.000Z' };

  it('client and site as the label; date, mix, m³ and dispatches as the detail', () => {
    expect(orderRowOf({ order, m3: 48.5, dispatchCount: 6 })).toEqual({
      id: 'o1',
      etiqueta: 'CARCELI · Chancay',
      detalle: '23/10 · MAC-2 · 48,5 m³ · 6 despachos',
    });
  });

  it('a projected order says whose it is, and a used one is blocked with its consume date', () => {
    const projected = { ...order, isProjected: true as const, sourceCompanyName: 'CONSTROAD' };

    expect(orderRowOf({ order: projected, m3: 10, dispatchCount: 1 }).detalle).toBe('23/10 · MAC-2 · 10 m³ · 1 despacho · de CONSTROAD');
    expect(orderRowOf({ order, m3: 10, dispatchCount: 1, usedOn: '2026-10-22T20:00:00.000Z' })).toMatchObject({
      bloqueado: true,
      detalle: 'Usado en el consumo del 22/10',
    });
  });
});

describe('readingRowsOf', () => {
  it('in date order, with the step against the previous one, the note, the device and up to 6 photos', () => {
    const rows = readingRowsOf('tank-pen', [
      reading('m2', '2026-10-24T17:00:00.000Z', 100, 2330),
      reading('m1', '2026-10-24T12:30:00.000Z', 120, 2450, { note: 'Antes de producir', deviceName: 'Tablet planta' }),
      reading('m3', '2026-10-25T12:30:00.000Z', 130, 2630, { consumedByConsumeId: 'c9' }),
    ], { m1: Array.from({ length: 8 }, (_, index) => `https://lila/f${index}.jpg`) });

    expect(rows).toEqual([
      {
        id: 'm1',
        tanqueId: 'tank-pen',
        etiqueta: '24/10 07:30 · 120 cm · 2.450 gl',
        detalle: 'Primer punto · Antes de producir · Tablet planta',
        foto: 'https://lila/f0.jpg',
        fotos: ['https://lila/f0.jpg', 'https://lila/f1.jpg', 'https://lila/f2.jpg', 'https://lila/f3.jpg', 'https://lila/f4.jpg', 'https://lila/f5.jpg'],
      },
      { id: 'm2', tanqueId: 'tank-pen', etiqueta: '24/10 12:00 · 100 cm · 2.330 gl', detalle: '−120 gl' },
      { id: 'm3', tanqueId: 'tank-pen', etiqueta: '25/10 07:30 · 130 cm · 2.630 gl', detalle: '+300 gl recarga', bloqueada: true },
    ]);
  });
});

describe('readingRowsOf, same minute', () => {
  it('a tie on the minute goes by when each reading was registered, as the engine orders it', () => {
    const rows = readingRowsOf('tank-pen', [
      reading('b-refill', '2026-07-04T20:31:00.000Z', 162, 6480, { createdAt: '2026-07-04T20:32:05.954Z' }),
      reading('a-measure', '2026-07-04T20:31:00.000Z', 25, 1000, { createdAt: '2026-07-04T20:31:32.522Z' }),
    ], {});

    expect(rows.map((row) => row.id)).toEqual(['a-measure', 'b-refill']);
  });
});

describe('contentLabelOf', () => {
  it('PEN, Gasohol or Petróleo (thermal oil counts as petroleum)', () => {
    expect(['pen', 'gasohol', 'petroleum', 'thermal_oil'].map((content) => contentLabelOf(content as 'pen'))).toEqual(['PEN', 'Gasohol', 'Petróleo', 'Petróleo']);
  });
});

describe('selectionFromTramos', () => {
  it('a row without start nor end is ignored; one with a single point is kept and flagged', () => {
    expect(selectionFromTramos([
      { tanqueId: 'tank-pen', inicioId: 'm1', finId: 'm4' },
      { tanqueId: 'tank-oil' },
      { tanqueId: 'tank-gas', inicioId: 'g1' },
    ])).toEqual({
      selectionByTankKey: { 'tank-pen': ['m1', 'm4'], 'tank-gas': ['g1'] },
      singlePointTankIds: ['tank-gas'],
    });
  });
});

describe('reviewFindingsOf', () => {
  it('conflicts are what blocks saving; warnings are what to look at', () => {
    const findings = reviewFindingsOf({
      problems: ['no-cubes'],
      incompleteTanks: ['Tanque Gasohol'],
      usedOrders: [{ etiqueta: 'CARCELI · Chancay', usedOn: '2026-10-22T20:00:00.000Z' }],
      missingOrderIds: ['o9'],
      takenReadings: ['24/10 07:30 · 120 cm · 2.450 gl'],
      variancePct: 22.4,
    });

    expect(findings.conflictos).toEqual([
      'El pedido CARCELI · Chancay ya está en el consumo del 22/10.',
      'Un pedido elegido no está en el periodo: o9.',
      'La lectura 24/10 07:30 · 120 cm · 2.450 gl ya está en otro consumo.',
    ]);
    expect(findings.avisos).toEqual([
      'No hay m³: elige pedidos con despachos o escribe los m³.',
      'Tanque Gasohol tiene un solo punto: marca el inicio y el fin.',
      'El gl/m³ se desvía +22,4 % del promedio (umbral ±15 %).',
    ]);
  });
});

describe('reviewBlocksOf', () => {
  it('shows what the consume takes from each client, and nothing while no client has a count', () => {
    const base = { complete: true, ratePerM3: null, averageRatePerM3: null, variancePct: null, tanks: [], m3: 10, m3Despachados: 10, m3Manual: undefined, despachos: 1, fuels: [], conflictos: [], avisos: [] } as never;
    const aggregates = [{ client: 'Globofast', materials: [{ name: 'ARENA', quantity: 40 }, { name: 'GRAVA', quantity: 20 }] }];

    const withStock = reviewBlocksOf({ ...(base as object), aggregates } as never);

    expect(JSON.stringify(withStock)).toContain('Agregados · Globofast');
    expect(JSON.stringify(reviewBlocksOf(base))).not.toContain('Agregados');
  });

  const complete = {
    complete: true,
    ratePerM3: 8.66,
    averageRatePerM3: 7.4,
    variancePct: 17,
    tanks: [{ nombre: 'PEN-1', gl: 1520, inicioCm: 120, finCm: 48, recargaGl: 300 }],
    m3: 212,
    m3Despachados: 205,
    m3Manual: 212,
    despachos: 6,
    fuels: [{ label: 'PEN', gl: 1520, glPorM3: 7.17 }, { label: 'Gasohol', gl: 0, glPorM3: 0 }],
    conflictos: [],
    avisos: ['El gl/m³ se desvía +17 % del promedio (umbral ±15 %).'],
  };

  it('the rate against the average, a row per tank plus the m³, the fuels and each warning', () => {
    expect(reviewBlocksOf(complete)).toEqual([
      { type: 'metric', value: '8,66', unit: 'gl/m³', label: 'gl/m³ · promedio 7,4 (+17 %)', tone: 'warn' },
      {
        type: 'rows',
        rows: [
          { label: 'PEN-1', value: '1.520 gl', sub: '120 → 48 cm · +300 gl recarga' },
          { label: 'm³', value: '212 m³', sub: 'manual · despachados 205' },
        ],
      },
      { type: 'chips', items: [{ label: 'PEN', sub: '1.520 gl · 7,17 gl/m³' }] },
      { type: 'text', text: 'El gl/m³ se desvía +17 % del promedio (umbral ±15 %).', tone: 'warn' },
    ]);
  });

  it('an incomplete draft only says what is missing; never more than 8 blocks', () => {
    expect(reviewBlocksOf({ ...complete, complete: false, avisos: ['Falta elegir al menos un pedido.'] })).toEqual([
      { type: 'text', text: 'Falta elegir al menos un pedido.', tone: 'warn' },
    ]);
    expect(reviewBlocksOf({ ...complete, avisos: Array.from({ length: 12 }, (_, index) => `aviso ${index}`) })).toHaveLength(8);
  });
});
