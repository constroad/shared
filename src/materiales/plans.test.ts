import { MAX_MOVEMENT_QUANTITY, checkMovementQuantity, describeMovement, planMaterialMovement } from './movementPlan';
import { receptionFromPicks, validateReceptionFields } from './receptionPlan';

const NOW = new Date('2026-11-09T12:00:00Z');

describe('checkMovementQuantity', () => {
  it('rounds a good quantity and refuses zero, negatives, text and a typo of an extra zero', () => {
    expect(checkMovementQuantity(30.1234567)).toEqual({ ok: true, quantity: 30.123457 });
    for (const bad of [0, -5, 'abc', undefined]) expect(checkMovementQuantity(bad)).toEqual({ ok: false, reason: 'La cantidad tiene que ser un número mayor que cero.' });
    expect(checkMovementQuantity(MAX_MOVEMENT_QUANTITY + 1)).toMatchObject({ ok: false, reason: expect.stringContaining('revisa si sobra un cero') });
    expect(checkMovementQuantity(MAX_MOVEMENT_QUANTITY)).toMatchObject({ ok: true });
  });
});

describe('planMaterialMovement', () => {
  const material = { name: 'Arena gruesa', unit: 'm3', quantity: 120 };

  it('builds the ledger line of an entry or an exit, with no money and no invented cost', () => {
    expect(planMaterialMovement({ kind: 'ingreso', quantity: 30, note: 'volquete', operator: 'Ana' }, material, NOW)).toEqual({
      ok: true,
      kind: 'ingreso',
      movement: { type: 'Ingreso', quantity: 30, value: 0, unitCost: 0, date: NOW, description: 'volquete · por Ana (Lila)', source: 'manual' },
    });
    expect(planMaterialMovement({ kind: 'salida', quantity: 20 }, material, NOW)).toMatchObject({ ok: true, movement: { type: 'Salida', description: 'Movimiento registrado por Lila' } });
  });

  it('refuses an exit larger than the stock, naming what there is', () => {
    expect(planMaterialMovement({ kind: 'salida', quantity: 121 }, material, NOW)).toEqual({ ok: false, reason: 'No hay tanto: Arena gruesa tiene 120 m3.' });
    expect(planMaterialMovement({ kind: 'salida', quantity: 5 }, { name: 'X' }, NOW)).toEqual({ ok: false, reason: 'No hay tanto: X tiene 0 m³.' });
  });

  it('an adjustment is not a ledger line: it carries the counted total', () => {
    expect(planMaterialMovement({ kind: 'ajuste', quantity: 90 }, material, NOW)).toEqual({ ok: true, kind: 'ajuste', quantity: 90 });
  });

  it('describes with the note, the operator, both or neither', () => {
    expect(describeMovement('  nota ', undefined)).toBe('nota');
    expect(describeMovement(undefined, ' Luis ')).toBe('por Luis (Lila)');
    expect(describeMovement(undefined, undefined)).toBe('Movimiento registrado por Lila');
  });
});

describe('receptionFromPicks', () => {
  const picks = {
    inputId: 'in1',
    material: { id: 'm1', name: 'Arena', description: 'gruesa lavada', unit: 'M3', level: 0 },
    carrier: { id: 'p1', name: 'Transportes' },
    quarry: { id: 'p2', name: 'Cantera Sur' },
    driver: 'ABC-123',
    m3: 18,
    day: '2026-11-07',
  };

  it('builds the record the form persists, with level 0 kept and the quarry copied where the notice reads it', () => {
    expect(receptionFromPicks({ ...picks, locationId: 'loc', notes: 'ok' }, new Date('2026-11-09T15:10:20Z'))).toEqual({
      _id: 'in1',
      materialId: 'm1',
      material: 'Arena gruesa lavada',
      materialName: 'Arena',
      level: 0,
      driver: 'ABC-123',
      m3: 18,
      arriveDate: '2026-11-07T15:10:20.000Z',
      providerId: 'p1',
      providerName: 'Transportes',
      vendorProviderId: 'p2',
      vendorProviderName: 'Cantera Sur',
      chancadora: 'Cantera Sur',
      locationId: 'loc',
      notes: 'ok',
      unit: 'M3',
    });
  });

  it('leaves out the location and notes it was not given, and defaults the unit', () => {
    const record = receptionFromPicks({ ...picks, material: { id: 'm1', name: 'Arena' } });

    expect(record).not.toHaveProperty('locationId');
    expect(record).not.toHaveProperty('notes');
    expect(record).toMatchObject({ unit: 'm³', level: undefined, material: 'Arena' });
  });
});

describe('validateReceptionFields', () => {
  const good = { driver: 'ABC', providerId: 'p', providerName: 'T', arriveDate: '2026-11-07', materialId: 'm', material: 'Arena', m3: 5 };

  it('accepts a complete reception', () => {
    expect(validateReceptionFields(good)).toEqual({ ok: true });
  });

  it('names every missing or wrong field', () => {
    expect(validateReceptionFields({ ...good, driver: '', providerId: '', arriveDate: undefined })).toEqual({ ok: false, invalidPaths: ['driver', 'providerId', 'arriveDate'] });
    expect(validateReceptionFields({ ...good, m3: 'x', level: NaN, esponjamientoPct: 101, measuredState: 'mojado' })).toEqual({ ok: false, invalidPaths: ['m3', 'level', 'esponjamientoPct', 'measuredState'] });
    expect(validateReceptionFields({ ...good, materialId: undefined })).toEqual({ ok: false, invalidPaths: ['materialId'] });
  });

  it('the optional numbers may be absent', () => {
    expect(validateReceptionFields({ ...good, m3: undefined, esponjamientoPct: 0, measuredState: 'banco' })).toEqual({ ok: true });
  });
});
