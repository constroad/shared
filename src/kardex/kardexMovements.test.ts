import { inputIngressMovement, kardexRecountAdjustment, kardexTransfer, kardexUnitValue, orderExitQuantity } from './kardexMovements';

const input = {
  _id: 'in1',
  materialId: 'm1',
  material: 'Arena',
  locationId: 'loc',
  locationName: 'Planta',
  providerId: 'p1',
  providerName: 'Transportes SAC',
  vendorProviderId: 'p2',
  vendorProviderName: 'Cantera Sur',
  driver: 'Luis',
  m3: 20,
  arriveDate: '07/11/2026, 9:22 a. m.',
  status: 'Pending',
};

describe('inputIngressMovement', () => {
  it('turns a reception into the Ingreso that enters the kardex', () => {
    const result = inputIngressMovement(input);

    expect(result).toMatchObject({
      purchaseId: 'in1',
      materialId: 'm1',
      locationId: 'loc',
      type: 'Ingreso',
      source: 'input',
      quantity: 20,
      value: 0,
      unitCost: 0,
    });
    expect(result!.date.toISOString()).toBe('2026-11-07T14:22:00.000Z');
    expect(result!.description).toBe('Ingreso: Arena, transporte Transportes SAC, venta Cantera Sur, Luis 20m3, 07/11/2026, 9:22 a. m.');
  });

  it('leaves the sale out of the description when there is no quarry', () => {
    const result = inputIngressMovement({ ...input, vendorProviderName: undefined });

    expect(result!.description).toBe('Ingreso: Arena, transporte Transportes SAC, Luis 20m3, 07/11/2026, 9:22 a. m.');
  });

  it('enters nothing without quantity or when it already entered', () => {
    expect(inputIngressMovement({ ...input, m3: 0 })).toBeNull();
    expect(inputIngressMovement({ ...input, m3: undefined })).toBeNull();
    expect(inputIngressMovement({ ...input, status: 'Completed' })).toBeNull();
  });

  it('falls back to the creation time, then to now, when the arrival date does not parse', () => {
    const created = inputIngressMovement({ ...input, arriveDate: 'nope', createdAt: '2026-11-01T10:00:00Z' });
    expect(created!.date.toISOString()).toBe('2026-11-01T10:00:00.000Z');

    const now = new Date('2026-11-09T12:00:00Z');
    expect(inputIngressMovement({ ...input, arriveDate: undefined }, now)!.date).toEqual(now);
  });
});

describe('kardexUnitValue', () => {
  it('is the average value per unit, or zero with no stock', () => {
    expect(kardexUnitValue({ quantity: 4, value: 100 })).toBe(25);
    expect(kardexUnitValue({ quantity: 0, value: 100 })).toBe(0);
    expect(kardexUnitValue({ quantity: -2, value: 100 })).toBe(0);
  });
});

describe('kardexTransfer', () => {
  const params = { materialId: 'm1', fromLocationId: 'a', toLocationId: 'b', quantity: 5, date: '2026-11-05T00:00:00Z' };

  it('takes from the origin and enters at the destination at the same value', () => {
    const result = kardexTransfer(params, { quantity: 10, value: 200 });

    expect(result).toEqual({
      ok: true,
      movements: [
        expect.objectContaining({ type: 'Salida', locationId: 'a', quantity: 5, value: 100, unitCost: 20, source: 'transfer', description: 'Reubicación de inventario' }),
        expect.objectContaining({ type: 'Ingreso', locationId: 'b', quantity: 5, value: 100, unitCost: 20, source: 'transfer' }),
      ],
    });
  });

  it('refuses a quantity that is not positive, the same place, or not enough stock', () => {
    expect(kardexTransfer({ ...params, quantity: 0 }, { quantity: 10, value: 0 })).toEqual({ ok: false, error: 'Cantidad inválida' });
    expect(kardexTransfer({ ...params, toLocationId: 'a' }, { quantity: 10, value: 0 })).toEqual({ ok: false, error: 'El origen y el destino deben ser distintos' });
    expect(kardexTransfer(params, { quantity: 4, value: 0 })).toEqual({ ok: false, error: 'Stock insuficiente en la ubicación de origen' });
  });

  it('keeps the description it was given', () => {
    const result = kardexTransfer({ ...params, description: 'A la obra' }, { quantity: 10, value: 0 });

    expect(result.ok && result.movements[0].description).toBe('A la obra');
  });
});

describe('kardexRecountAdjustment', () => {
  const count = { materialId: 'm1', locationId: 'a', countedQuantity: 12 };

  it('enters the surplus the count found', () => {
    expect(kardexRecountAdjustment(count, { quantity: 10, value: 100 })).toMatchObject({ type: 'Ingreso', quantity: 2, value: 20, unitCost: 10, source: 'adjustment', description: 'Ajuste por conteo físico' });
  });

  it('takes out what the count did not find', () => {
    expect(kardexRecountAdjustment({ ...count, countedQuantity: 7 }, { quantity: 10, value: 100 })).toMatchObject({ type: 'Salida', quantity: 3, value: 30 });
  });

  it('does nothing when the count matches', () => {
    expect(kardexRecountAdjustment({ ...count, countedQuantity: 10 }, { quantity: 10, value: 100 })).toBeNull();
  });

  it('values the adjustment at zero when there was no stock', () => {
    expect(kardexRecountAdjustment(count, { quantity: 0, value: 0 })).toMatchObject({ type: 'Ingreso', quantity: 12, value: 0, unitCost: 0 });
  });
});

describe('orderExitQuantity', () => {
  it('is the share of the total a material takes, to two decimals', () => {
    expect(orderExitQuantity(10, 33.333)).toBe(3.33);
    expect(orderExitQuantity(8, 50)).toBe(4);
  });
});
