import {
  hasClientFacingM3,
  resolveClientFacingM3,
  resolveClientFacingTruckM3,
  resolveOrderClientFacingM3,
} from './dispatchClientFacingM3';

// The order aggregate is computed TWICE in Mongo: `m3dispatched` (real, feeds
// money/kardex/consumptions) and `m3dispatchedClientFacing` (with override).
// Client-facing consumers ALWAYS read through this helper.
describe('resolveOrderClientFacingM3', () => {
  it('prefiere el total de cara al cliente', () => {
    expect(resolveOrderClientFacingM3({ m3dispatched: 100, m3dispatchedClientFacing: 105 })).toBe(105);
  });

  it('cae al real si el pedido no trae el total de cliente (payload viejo)', () => {
    expect(resolveOrderClientFacingM3({ m3dispatched: 100 })).toBe(100);
  });

  it('respeta un total de cliente en 0 cuando no hay despachos', () => {
    expect(resolveOrderClientFacingM3({ m3dispatched: 0, m3dispatchedClientFacing: 0 })).toBe(0);
    expect(resolveOrderClientFacingM3({})).toBe(0);
  });
});

describe('hasClientFacingM3', () => {
  it('reconoce un override válido', () => {
    expect(hasClientFacingM3(12.5)).toBe(true);
  });

  it('trata 0 como SIN override (bug histórico: el vale imprimía 0 m³)', () => {
    expect(hasClientFacingM3(0)).toBe(false);
  });

  it('descarta vacíos y valores no finitos', () => {
    expect(hasClientFacingM3(undefined)).toBe(false);
    expect(hasClientFacingM3(null)).toBe(false);
    expect(hasClientFacingM3(Number.NaN)).toBe(false);
    expect(hasClientFacingM3(-5)).toBe(false);
  });
});

describe('resolveClientFacingM3', () => {
  it('usa el override cuando existe', () => {
    expect(resolveClientFacingM3({ placeholders: { m3Dispatched: 14 }, quantity: 15 })).toBe(14);
  });

  it('cae al m³ real cuando el override es 0 (antes devolvía 0)', () => {
    expect(resolveClientFacingM3({ placeholders: { m3Dispatched: 0 }, quantity: 15 })).toBe(15);
  });

  it('cae al m³ real sin override', () => {
    expect(resolveClientFacingM3({ quantity: 15 })).toBe(15);
  });

  it('cae a lo planificado si no hay m³ real', () => {
    expect(resolveClientFacingM3({ planedQuantity: 20 })).toBe(20);
  });

  it('devuelve 0 sin ningún dato', () => {
    expect(resolveClientFacingM3({})).toBe(0);
  });
});

describe('resolveClientFacingTruckM3', () => {
  it('usa el override del cubicaje cuando existe', () => {
    expect(resolveClientFacingTruckM3({ placeholders: { m3Truck: 18 }, transportM3: 25 })).toBe(18);
  });

  it('cae a la capacidad real del catálogo si el override es 0', () => {
    expect(resolveClientFacingTruckM3({ placeholders: { m3Truck: 0 }, transportM3: 25 })).toBe(25);
  });

  it('devuelve undefined si no hay override ni capacidad conocida', () => {
    expect(resolveClientFacingTruckM3({})).toBeUndefined();
  });
});
