import { MATERIAL_STATUS_LABEL, buildMaterialsStockReport, fillPercent, formatQuantity, formatUnit, isLiquidMaterial, materialStockStatus, needsRestock } from './stockReport';

const AGGREGATES = [
  { name: 'ARENA PRIMARIA', quantity: 650, unit: 'M3', level: 0, reorderPoint: 400 },
  { name: 'ARENA SECUNDARIA', quantity: 200, unit: 'M3', level: 1, reorderPoint: 200 },
  { name: 'GRAVA 6/7', quantity: 521, unit: 'm³', level: 2, reorderPoint: 300 },
];

describe('buildMaterialsStockReport', () => {
  it('leaves the tank liquids out and records what it left out', () => {
    const report = buildMaterialsStockReport([...AGGREGATES, { name: 'PEN', quantity: 0, unit: 'gl', level: 5 }, { name: 'Aceite', quantity: 9, unit: 'gls' }]);

    expect(report.rows.map((row) => row.name)).toEqual(['ARENA PRIMARIA', 'ARENA SECUNDARIA', 'GRAVA 6/7']);
    expect(report.excludedAsLiquid).toEqual(['PEN', 'Aceite']);
  });

  it('adds only the cubic metres and counts the rows that ask for restocking', () => {
    const report = buildMaterialsStockReport(AGGREGATES);

    expect(report.totalCubicMeters).toBe(1371);
    expect(report.restockCount).toBe(1);
  });

  it('orders by level and then by name, and the order does not depend on how they come', () => {
    const shuffled = [AGGREGATES[2], { name: 'Zeta', level: 1 }, AGGREGATES[0], { name: 'Alfa', level: 1 }];

    expect(buildMaterialsStockReport(shuffled).rows.map((row) => row.name)).toEqual(['ARENA PRIMARIA', 'Alfa', 'Zeta', 'GRAVA 6/7']);
  });

  it('two materials with the same name keep their own id and their own place', () => {
    const report = buildMaterialsStockReport([
      { _id: 'b', name: 'Filler mineral', quantity: 580, unit: 'TM', level: 4 },
      { _id: 'a', name: 'Filler mineral', quantity: 4000, unit: 'kg', level: 1 },
    ]);

    expect(report.rows.map((row) => [row.id, row.quantity])).toEqual([['a', 4000], ['b', 580]]);
  });

  it('a nameless material takes no row, a missing quantity is zero and a row without id invents none', () => {
    const report = buildMaterialsStockReport([{ name: '  ', quantity: 5 }, { name: 'Arena', quantity: undefined }]);

    expect(report.rows).toEqual([expect.objectContaining({ name: 'Arena', quantity: 0, unit: 'm³', id: undefined })]);
  });
});

describe('the restock rule', () => {
  it('reaching the minimum asks for restocking; above it does not; with no minimum nobody opines', () => {
    expect(needsRestock({ name: 'a', quantity: 200, reorderPoint: 200 })).toBe(true);
    expect(needsRestock({ name: 'a', quantity: 201, reorderPoint: 200 })).toBe(false);
    expect(needsRestock({ name: 'a', quantity: 0 })).toBe(false);
    expect(materialStockStatus({ name: 'a', quantity: 0 })).toBe('unknown');
    expect(fillPercent({ name: 'a', quantity: 10 })).toBeNull();
  });

  it('the bar and the status never contradict each other', () => {
    expect(materialStockStatus({ name: 'a', quantity: 200, reorderPoint: 200 })).toBe('low');
    expect(materialStockStatus({ name: 'a', quantity: 250, reorderPoint: 200 })).toBe('medium');
    expect(materialStockStatus({ name: 'a', quantity: 301, reorderPoint: 200 })).toBe('healthy');
    expect(fillPercent({ name: 'a', quantity: 200, reorderPoint: 200 })).toBe(50);
    expect(fillPercent({ name: 'a', quantity: 5000, reorderPoint: 200 })).toBe(100);
    expect(MATERIAL_STATUS_LABEL.low).toBe('Reponer');
  });
});

describe('isLiquidMaterial, formatQuantity and formatUnit', () => {
  it('a liquid is told by its level or by its unit, even when the level is missing', () => {
    expect(isLiquidMaterial({ name: 'x', level: 6 })).toBe(true);
    expect(isLiquidMaterial({ name: 'x', unit: ' GLS ' })).toBe(true);
    expect(isLiquidMaterial({ name: 'x', unit: 'm3', level: 2 })).toBe(false);
  });

  it('prints 650 and not 650.00, keeps a decimal, and normalises the cubic unit', () => {
    expect(formatQuantity(650)).toBe('650');
    expect(formatQuantity(12.5)).toBe('12.5');
    expect(formatUnit('M3')).toBe('m³');
    expect(formatUnit('kg')).toBe('kg');
  });
});
