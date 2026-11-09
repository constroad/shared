import {
  KARDEX_UNASSIGNED_LOCATION_ID,
  applyKardexMovement,
  compareKardexTimeline,
  kardexBalances,
  kardexMatchesLocation,
  kardexSnapshot,
  kardexSnapshotFromGroups,
  roundKardex,
  toKardexNumber,
  type KardexTimelineEntry,
} from './kardexBalance';

const entry = (overrides: KardexTimelineEntry): KardexTimelineEntry => ({ type: 'Ingreso', quantity: 0, value: 0, ...overrides });

describe('toKardexNumber and roundKardex', () => {
  it('reads anything that is not a finite number as zero', () => {
    expect(toKardexNumber('12.5')).toBe(12.5);
    expect(toKardexNumber(undefined)).toBe(0);
    expect(toKardexNumber('abc')).toBe(0);
    expect(toKardexNumber(Infinity)).toBe(0);
  });

  it('keeps six decimals', () => {
    expect(roundKardex(1 / 3)).toBe(0.333333);
  });
});

describe('applyKardexMovement', () => {
  it('adds an Ingreso and takes an Salida, in quantity and in value', () => {
    const after = applyKardexMovement({ quantity: 10, value: 100 }, entry({ type: 'Ingreso', quantity: 5, value: 20 }));

    expect(after).toEqual({ quantity: 15, value: 120 });
    expect(applyKardexMovement(after, entry({ type: 'Salida', quantity: 3, value: 30 }))).toEqual({ quantity: 12, value: 90 });
  });

  it('treats a missing quantity as zero', () => {
    expect(applyKardexMovement({ quantity: 4, value: 0 }, { type: 'Salida' })).toEqual({ quantity: 4, value: 0 });
  });
});

describe('compareKardexTimeline', () => {
  it('orders by date, then creation time, then id', () => {
    const early = entry({ _id: 'b', date: '2026-11-01T10:00:00Z', createdAt: '2026-11-01T10:00:00Z' });
    const sameDayLater = entry({ _id: 'a', date: '2026-11-01T10:00:00Z', createdAt: '2026-11-02T10:00:00Z' });
    const sameInstant = entry({ _id: 'c', date: '2026-11-01T10:00:00Z', createdAt: '2026-11-02T10:00:00Z' });

    expect([sameInstant, sameDayLater, early].sort(compareKardexTimeline).map((item) => item._id)).toEqual(['b', 'a', 'c']);
  });

  it('puts an entry without a date first and does not throw', () => {
    const undated = entry({ _id: 'x' });
    const dated = entry({ _id: 'y', date: '2026-11-01T10:00:00Z' });

    expect([dated, undated].sort(compareKardexTimeline).map((item) => item._id)).toEqual(['x', 'y']);
  });
});

describe('kardexBalances', () => {
  it('runs the balance in timeline order whatever order the entries come in', () => {
    const result = kardexBalances([
      entry({ _id: '2', type: 'Salida', quantity: 4, value: 40, date: '2026-11-02T00:00:00Z' }),
      entry({ _id: '1', type: 'Ingreso', quantity: 10, value: 100, date: '2026-11-01T00:00:00Z' }),
    ]);

    expect(result.rows.map((row) => [row.entry._id, row.balanceQuantity, row.balanceValue])).toEqual([
      ['1', 10, 100],
      ['2', 6, 60],
    ]);
    expect(result.closing).toEqual({ quantity: 6, value: 60 });
  });

  it('starts from an opening balance and rounds each row to six decimals', () => {
    const result = kardexBalances([entry({ _id: '1', quantity: 1 / 3, date: '2026-11-01T00:00:00Z' })], { quantity: 1, value: 0 });

    expect(result.rows[0].balanceQuantity).toBe(1.333333);
  });

  it('is empty and zero without entries', () => {
    expect(kardexBalances([])).toEqual({ rows: [], closing: { quantity: 0, value: 0 } });
  });
});

describe('kardexMatchesLocation', () => {
  it('without a location everything matches', () => {
    expect(kardexMatchesLocation(entry({ locationId: 'a' }), undefined)).toBe(true);
  });

  it('a real location matches only itself', () => {
    expect(kardexMatchesLocation(entry({ locationId: 'a' }), 'a')).toBe(true);
    expect(kardexMatchesLocation(entry({ locationId: 'b' }), 'a')).toBe(false);
    expect(kardexMatchesLocation(entry({}), 'a')).toBe(false);
  });

  it('«unassigned» also takes the entries with no location', () => {
    expect(kardexMatchesLocation(entry({}), KARDEX_UNASSIGNED_LOCATION_ID)).toBe(true);
    expect(kardexMatchesLocation(entry({ locationId: '' }), KARDEX_UNASSIGNED_LOCATION_ID)).toBe(true);
    expect(kardexMatchesLocation(entry({ locationId: null }), KARDEX_UNASSIGNED_LOCATION_ID)).toBe(true);
    expect(kardexMatchesLocation(entry({ locationId: 'a' }), KARDEX_UNASSIGNED_LOCATION_ID)).toBe(false);
  });
});

describe('kardexSnapshot', () => {
  const movements = [
    entry({ materialId: 'm1', locationId: 'a', locationName: 'Planta', type: 'Ingreso', quantity: 10, value: 100, date: '2026-11-01T00:00:00Z' }),
    entry({ materialId: 'm1', locationId: 'a', locationName: 'Planta', type: 'Salida', quantity: 4, value: 40, date: '2026-11-02T00:00:00Z' }),
    entry({ materialId: 'm1', locationId: 'b', locationName: 'Cantera', type: 'Ingreso', quantity: 5, value: 0, date: '2026-11-03T00:00:00Z' }),
    entry({ materialId: 'm2', type: 'Ingreso', quantity: 7, value: 0, date: '2026-11-01T00:00:00Z' }),
  ];

  it('adds up each material and lists its locations', () => {
    const snapshot = kardexSnapshot(movements);

    expect(snapshot.asOf).toBeNull();
    const m1 = snapshot.materials.find((material) => material.materialId === 'm1')!;
    expect(m1.quantity).toBe(11);
    expect(m1.locations).toEqual([
      { locationId: 'a', locationName: 'Planta', quantity: 6, value: 60 },
      { locationId: 'b', locationName: 'Cantera', quantity: 5, value: 0 },
    ]);
  });

  it('puts what has no location under «unassigned»', () => {
    const m2 = kardexSnapshot(movements).materials.find((material) => material.materialId === 'm2')!;

    expect(m2.locations).toEqual([{ locationId: KARDEX_UNASSIGNED_LOCATION_ID, locationName: 'Sin ubicación', quantity: 7, value: 0 }]);
  });

  it('reads the balance as of a date, the date included', () => {
    const snapshot = kardexSnapshot(movements, { asOf: new Date('2026-11-02T00:00:00Z') });

    expect(snapshot.asOf).toBe('2026-11-02T00:00:00.000Z');
    expect(snapshot.materials.find((material) => material.materialId === 'm1')!.quantity).toBe(6);
  });

  it('narrows to one location', () => {
    const snapshot = kardexSnapshot(movements, { locationId: 'b' });

    expect(snapshot.locationId).toBe('b');
    expect(snapshot.materials).toHaveLength(1);
    expect(snapshot.materials[0].quantity).toBe(5);
  });

  it('skips a movement with no material', () => {
    expect(kardexSnapshot([entry({ quantity: 3 })]).materials).toEqual([]);
  });
});

describe('kardexSnapshotFromGroups', () => {
  it('builds the same snapshot from groups a database already summed', () => {
    const snapshot = kardexSnapshotFromGroups([
      { materialId: 'm1', locationId: 'a', locationName: 'Planta', quantity: 6, value: 60 },
      { materialId: 'm1', locationId: '', locationName: '', quantity: 1, value: 0 },
    ]);

    expect(snapshot.materials[0]).toEqual({
      materialId: 'm1',
      quantity: 7,
      value: 60,
      locations: [
        { locationId: 'a', locationName: 'Planta', quantity: 6, value: 60 },
        { locationId: KARDEX_UNASSIGNED_LOCATION_ID, locationName: 'Sin ubicación', quantity: 1, value: 0 },
      ],
    });
  });
});
