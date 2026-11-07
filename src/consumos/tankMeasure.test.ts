import { availableForProductionGallons, geometricGallonsAtLevel, tankDocumentToCalculationInput, type TankCalculationSource } from './tankEngine';
import { tankAsMeasured, tankAuditReasons, tankMovementFromLevel } from './tankMeasure';

const tank = {
  _id: 'tank-1',
  name: 'Tanque PEN 1',
  tankShape: 'vertical_cylinder',
  geometry: { heightCm: 200, diameterCm: 150 },
  cubicCmPerUsGallon: 3785.41,
  valveHeightFromBottomCm: 10,
  serpentines: [],
  gallonsPerProductionM3: 25,
} as unknown as TankCalculationSource & { _id: string; name: string };

describe('tankMovementFromLevel', () => {
  it('builds the measure from the level with the tank engine', () => {
    const built = tankMovementFromLevel(tank, { eventType: 'measurement', levelCm: 120, note: 'wincha' });

    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const input = tankDocumentToCalculationInput(tank);
    const atLevel = geometricGallonsAtLevel(input, 120);
    const available = availableForProductionGallons(input, 120);
    if (!atLevel.ok || !available.ok || !('availableGallons' in available)) throw new Error('engine refused the fixture');
    expect(built.movement.effectiveGallons).toBe(Number(atLevel.effectiveGallons.toFixed(2)));
    expect(built.movement.availableGallons).toBe(Number(available.availableGallons.toFixed(2)));
    expect(built.movement.valveDeadGallons).toBe(Number(available.valveDeadGallons.toFixed(2)));
    expect(built.movement).toMatchObject({ tankId: 'tank-1', tankName: 'Tanque PEN 1', eventType: 'measurement', levelCentimeter: 120, note: 'wincha' });
  });

  it('keeps the date it is given', () => {
    const date = new Date('2026-11-06T12:00:00.000Z');
    const built = tankMovementFromLevel(tank, { eventType: 'refill', levelCm: 50, date });

    expect(built.ok && built.movement.date).toEqual(date);
  });

  it('refuses a level above the tank height with the engine message', () => {
    const built = tankMovementFromLevel(tank, { eventType: 'measurement', levelCm: 320, note: 'x' });

    expect(built.ok).toBe(false);
    expect(!built.ok && built.reason).toContain('altura máxima');
  });

  it('refuses a negative level', () => {
    expect(tankMovementFromLevel(tank, { eventType: 'refill', levelCm: -1 }).ok).toBe(false);
  });

  it('refuses a tank with no geometry instead of persisting zeros', () => {
    const broken = { ...tank, geometry: {} } as typeof tank;

    expect(tankMovementFromLevel(broken, { eventType: 'measurement', levelCm: 10 }).ok).toBe(false);
  });
});

describe('tankAuditReasons', () => {
  const reading = (levelCentimeter: number, effectiveGallons: number, date: string) => ({ levelCentimeter, effectiveGallons, date: new Date(date) });
  const noon = '2026-11-06T17:00:00.000Z';
  const hourLater = '2026-11-06T18:00:00.000Z';

  it('says nothing about a small drop with its photo', () => {
    expect(tankAuditReasons({ evidenceCount: 1, movement: reading(99, 95, hourLater), previousMovement: reading(100, 100, noon) })).toEqual([]);
  });

  it('flags a measure with no photo', () => {
    expect(tankAuditReasons({ evidenceCount: 0, movement: reading(99, 95, hourLater), previousMovement: reading(100, 100, noon) })).toEqual(['sin evidencia fotografica']);
  });

  it('flags a refill with no photo twice over', () => {
    expect(tankAuditReasons({ evidenceCount: 0, movement: reading(120, 130, hourLater), previousMovement: reading(100, 100, noon) })).toEqual(['sin evidencia fotografica', 'recarga sin evidencia']);
  });

  it('flags a large drop from ten centimetres', () => {
    expect(tankAuditReasons({ evidenceCount: 1, movement: reading(90, 80, hourLater), previousMovement: reading(100, 100, noon) })).toEqual(['caida grande de 10.0 cm']);
  });

  it('flags a drop between the night close and the morning, in Lima hours', () => {
    const closing = '2026-11-06T23:30:00.000Z'; // 18:30 in Lima
    const morning = '2026-11-07T12:00:00.000Z'; // 07:00 in Lima

    expect(tankAuditReasons({ evidenceCount: 1, movement: reading(98, 95, morning), previousMovement: reading(100, 100, closing) })).toEqual(['caida entre cierre nocturno y reinicio']);
  });

  it('does not flag the same gap by day', () => {
    const start = '2026-11-06T13:00:00.000Z'; // 08:00 in Lima
    const end = '2026-11-06T20:00:00.000Z'; // 15:00 in Lima

    expect(tankAuditReasons({ evidenceCount: 1, movement: reading(98, 95, end), previousMovement: reading(100, 100, start) })).toEqual([]);
  });
});

describe('tankAsMeasured', () => {
  it('leaves the tank as the measure left it', () => {
    expect(tankAsMeasured({ name: 'x', volumeInStock: 10, levelCentimeter: 37 }, { effectiveGallons: 17.37, levelCentimeter: 28 })).toEqual({ name: 'x', volumeInStock: 17.37, levelCentimeter: 28 });
  });

  it('keeps what the measure does not say', () => {
    expect(tankAsMeasured({ volumeInStock: 10, levelCentimeter: 37 }, {})).toEqual({ volumeInStock: 10, levelCentimeter: 37 });
  });
});
