import {
  aggregateByWork,
  coverageMeters,
  mergeIntervals,
  paintSegments,
  progressByWork,
  coveredIntervals,
  type StreetProgressEvent,
} from './streetProgress';

const ev = (over: Record<string, unknown> = {}) => ({
  workId: 'asf',
  fromM: 0,
  toM: 50,
  status: 'approved' as const,
  date: '2026-07-30',
  ...over,
});

describe('mergeIntervals', () => {
  it('fusiona los solapados en uno', () => {
    expect(mergeIntervals([[0, 50], [40, 90]])).toEqual([[0, 90]]);
  });

  it('pega los contiguos (el final de uno es el inicio del otro)', () => {
    expect(mergeIntervals([[0, 50], [50, 80]])).toEqual([[0, 80]]);
  });

  it('deja separados los que tienen hueco real', () => {
    expect(mergeIntervals([[0, 50], [60, 80]])).toEqual([[0, 50], [60, 80]]);
  });

  it('ordena aunque lleguen al revés', () => {
    expect(mergeIntervals([[60, 80], [0, 50]])).toEqual([[0, 50], [60, 80]]);
  });

  it('descarta los degenerados', () => {
    expect(mergeIntervals([[30, 30], [50, 20]])).toEqual([]);
  });
});

describe('coverageMeters', () => {
  it('no cuenta dos veces el tramo repetido', () => {
    // Two overlapping days: 0-50 and 40-90 make 90 m, not 100.
    const total = coverageMeters([ev({ toM: 50 }), ev({ fromM: 40, toM: 90 })]);

    expect(total).toBe(90);
  });
});

describe('progressByWork', () => {
  const scope = { fromM: 0, toM: 100 };

  it('separa lo aprobado de lo que espera aprobación', () => {
    const rows = progressByWork({
      events: [ev({ toM: 40 }), ev({ fromM: 40, toM: 70, status: 'pending' })],
      scope,
      workIds: ['asf'],
    });

    expect(rows[0]).toMatchObject({ workId: 'asf', approvedM: 40, pendingM: 30 });
    expect(rows[0].pct).toBe(40);
  });

  it('el rechazado no cuenta para ningún lado', () => {
    const rows = progressByWork({
      events: [ev({ toM: 40, status: 'rejected' })],
      scope,
      workIds: ['asf'],
    });

    expect(rows[0]).toMatchObject({ approvedM: 0, pendingM: 0, pct: 0 });
  });

  it('el REPROCESO suma metrado pero no infla la cobertura', () => {
    // The same stretch is re-asphalted: 40 m of coverage and 70 m of real work.
    const rows = progressByWork({
      events: [ev({ toM: 40 }), ev({ fromM: 10, toM: 40, rework: true })],
      scope,
      workIds: ['asf'],
    });

    expect(rows[0].approvedM).toBe(40);
    expect(rows[0].pct).toBe(40);
    expect(rows[0].reworkM).toBe(30);
  });

  it('recorta al alcance: lo hecho fuera del tramo contratado no cuenta', () => {
    const rows = progressByWork({
      events: [ev({ fromM: 0, toM: 200 })],
      scope: { fromM: 40, toM: 150 },
      workIds: ['asf'],
    });

    expect(rows[0].approvedM).toBe(110);
    expect(rows[0].pct).toBe(100);
  });

  it('el % se mide contra el largo del ALCANCE, no de la calle entera', () => {
    const rows = progressByWork({
      events: [ev({ fromM: 40, toM: 95 })],
      scope: { fromM: 40, toM: 150 },
      workIds: ['asf'],
    });

    expect(rows[0].pct).toBe(50);
  });

  it('una partida sin eventos aparece en cero, no desaparece', () => {
    const rows = progressByWork({ events: [], scope, workIds: ['base', 'asf'] });

    expect(rows.map((f) => f.workId)).toEqual(['base', 'asf']);
    expect(rows.every((f) => f.pct === 0)).toBe(true);
  });

  it('ignora eventos de otra partida', () => {
    const rows = progressByWork({
      events: [ev({ workId: 'base', toM: 100 })],
      scope,
      workIds: ['asf'],
    });

    expect(rows[0].approvedM).toBe(0);
  });

  it('corta por fecha para reconstruir el avance de un día', () => {
    // The drawing's "día 1 / día 2 / día 3" comes from here.
    const events = [
      ev({ toM: 30, date: '2026-07-28' }),
      ev({ fromM: 30, toM: 60, date: '2026-07-29' }),
      ev({ fromM: 60, toM: 100, date: '2026-07-30' }),
    ];

    expect(progressByWork({ events, scope, workIds: ['asf'], upToDate: '2026-07-29' })[0].approvedM).toBe(60);
    expect(progressByWork({ events, scope, workIds: ['asf'] })[0].approvedM).toBe(100);
  });

  it('un alcance degenerado no divide por cero', () => {
    const rows = progressByWork({
      events: [ev()],
      scope: { fromM: 50, toM: 50 },
      workIds: ['asf'],
    });

    expect(rows[0].pct).toBe(0);
  });
});

describe('paintSegments', () => {
  const line = [
    { lat: -12.0, lng: -76.9 },
    { lat: -12.001, lng: -76.9 },
  ];

  it('devuelve los tramos a pintar con su estado', () => {
    const segs = paintSegments({
      line,
      events: [ev({ toM: 40 }), ev({ fromM: 60, toM: 80, status: 'pending' })],
      workId: 'asf',
      scope: { fromM: 0, toM: 100 },
    });

    expect(segs.map((s) => s.state)).toEqual(['approved', 'pending']);
    expect(segs[0].points.length).toBeGreaterThanOrEqual(2);
  });

  it('lo pendiente NO pisa lo ya aprobado', () => {
    // If they overlap, approved wins: the hatching only covers what it adds.
    const segs = paintSegments({
      line,
      events: [ev({ toM: 50 }), ev({ fromM: 20, toM: 80, status: 'pending' })],
      workId: 'asf',
      scope: { fromM: 0, toM: 100 },
    });

    const pend = segs.find((s) => s.state === 'pending')!;
    expect(pend.fromM).toBe(50);
    expect(pend.toM).toBe(80);
  });

  it('sin eventos no devuelve nada que pintar', () => {
    expect(paintSegments({ line, events: [], workId: 'asf', scope: { fromM: 0, toM: 100 } })).toEqual([]);
  });
});

describe('aggregateByWork', () => {
  const events = [
    { workId: 'p1', fromM: 0, toM: 50, status: 'approved' as const, date: '2026-08-01' },
    { workId: 'p1', fromM: 0, toM: 30, status: 'approved' as const, date: '2026-08-02' },
  ];

  it('suma el avance de la partida sobre todos sus tramos', () => {
    const totals = aggregateByWork({
      scopes: [
        { streetId: 'a', fromM: 0, toM: 100, workIds: ['p1'] },
        { streetId: 'b', fromM: 0, toM: 100, workIds: ['p1'] },
      ],
      eventsByStreet: (streetId) => (streetId === 'a' ? events : []),
    });

    // 50 m out of 200 contracted across both streets.
    expect(totals[0]).toEqual({ workId: 'p1', approvedM: 50, totalM: 200, pct: 25 });
  });

  it('el denominador es el ALCANCE, no la calle entera', () => {
    // If a partida only applies to a 40 m scope, its 40 m are 100 %.
    const totals = aggregateByWork({
      scopes: [{ streetId: 'a', fromM: 0, toM: 40, workIds: ['p1'] }],
      eventsByStreet: () => [
        { workId: 'p1', fromM: 0, toM: 40, status: 'approved' as const },
      ],
    });

    expect(totals[0].pct).toBe(100);
  });

  it('reconstruye el estado a una fecha (el slider del cliente)', () => {
    const totals = aggregateByWork({
      scopes: [{ streetId: 'a', fromM: 0, toM: 100, workIds: ['p1'] }],
      eventsByStreet: () => events,
      upToDate: '2026-08-01',
    });

    // On day 1 only the first 50 m existed (the day 2 event does not count).
    expect(totals[0].approvedM).toBe(50);
  });

  it('una partida sin alcances no aparece', () => {
    expect(aggregateByWork({ scopes: [], eventsByStreet: () => [] })).toEqual([]);
  });
});

describe('coveredIntervals', () => {
  it('devuelve lo aprobado del eje, unido y acotado al alcance, hasta la fecha', () => {
    const events: StreetProgressEvent[] = [
      { workId: 'w1', fromM: 0, toM: 100, status: 'approved', date: '2026-09-01' },
      { workId: 'w1', fromM: 80, toM: 200, status: 'approved', date: '2026-09-05' },
      { workId: 'w1', fromM: 300, toM: 400, status: 'approved', date: '2026-09-20' },
      { workId: 'w2', fromM: 0, toM: 50, status: 'approved', date: '2026-09-01' },
      { workId: 'w1', fromM: 500, toM: 600, status: 'pending', date: '2026-09-01' },
    ];

    expect(
      coveredIntervals({ events, workId: 'w1', scope: { fromM: 0, toM: 1000 }, upToDate: '2026-09-10' })
    ).toEqual([[0, 200]]);
  });
});
