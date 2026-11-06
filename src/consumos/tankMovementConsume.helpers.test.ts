import {
  buildConsumePayload,
  buildEditConsumeSelection,
  calculateTankConsumption,
  expandSelectedMovements,
} from './tankMovementConsume.helpers';
import {
  groupTankMovementsByTank,
  resolveTankMovementKey,
} from './consumeEngine';
import type { ConsumeMovementRecord, ConsumeMovementTank } from './consumeMovementFlow';

const tank: ConsumeMovementTank = {
  _id: 'tank-1',
  name: 'PEN #1',
  tableReference: 'PEN#1',
  contentType: 'pen',
  cubicCmPerUsGallon: 1,
  geometry: { lengthCm: 1, maxHeightCm: 200, widthCm: 1 },
  serpentines: [],
  tankShape: 'rectangular',
};

const movement = (
  movementId: string,
  date: string,
  effectiveGallons: number,
  levelCentimeter: number,
  eventType: ConsumeMovementRecord['eventType'] = 'measurement',
  initialEffectiveGallons?: number,
  initialLevelCentimeter?: number
): ConsumeMovementRecord => ({
  _id: movementId,
  tankId: 'tank-1',
  tankName: 'PEN #1',
  eventType,
  initialEffectiveGallons,
  initialLevelCentimeter,
  levelCentimeter,
  effectiveGallons,
  date,
});

describe('calculateTankConsumption', () => {
  it('sums only level drops and treats level increases as refills', () => {
    const calculation = calculateTankConsumption(tank, [
      movement('m1', '2026-06-01T08:00:00.000Z', 800, 80),
      movement('m2', '2026-06-01T10:00:00.000Z', 0, 0),
      movement('m3', '2026-06-01T11:00:00.000Z', 1500, 150, 'refill'),
      movement('m4', '2026-06-01T15:00:00.000Z', 550, 55),
    ]);

    expect(calculation.consumedGallons).toBe(1750);
    expect(calculation.intervals).toHaveLength(3);
    expect(calculation.intervals[0].intervalType).toBe('consumption');
    expect(calculation.intervals[1].intervalType).toBe('refill');
    expect(calculation.intervals[1].refillGallons).toBe(1500);
    expect(calculation.intervals[2].consumedGallons).toBe(950);
    expect(calculation.initialMeasure).toBe(80);
    expect(calculation.finalMeasure).toBe(55);
    expect(calculation.isComplete).toBe(true);
  });

  it('ignora la medida anterior GUARDADA del punto inicial (solo tramos del rango)', () => {
    // Bug 2026-07-22: el delta de llegada del primer punto (vs su lectura
    // previa fuera del rango) se sumaba al consumo y lo duplicaba.
    const calculation = calculateTankConsumption(tank, [
      movement('m1', '2026-06-01T08:00:00.000Z', 2865.5, 100, 'measurement', 4949.07, 173),
      movement('m2', '2026-06-01T10:00:00.000Z', 801.61, 40, 'measurement', 2865.5, 100),
    ]);

    expect(calculation.consumedGallons).toBe(2063.89);
    expect(calculation.intervals).toHaveLength(1);
    expect(calculation.intervals[0].intervalType).toBe('consumption');
    expect(calculation.intervals[0].startLevelCentimeter).toBe(100);
    expect(calculation.intervals[0].endLevelCentimeter).toBe(40);
    expect(calculation.initialMeasure).toBe(100);
    expect(calculation.finalMeasure).toBe(40);
  });

  it('marks a legacy tank with one movement as incomplete', () => {
    const calculation = calculateTankConsumption(tank, [
      movement('m1', '2026-06-01T08:00:00.000Z', 800, 80),
    ]);

    expect(calculation.consumedGallons).toBe(0);
    expect(calculation.intervals).toHaveLength(0);
    expect(calculation.isComplete).toBe(false);
  });

  it('un solo punto marcado NUNCA calcula, aunque tenga medida anterior guardada', () => {
    const calculation = calculateTankConsumption(tank, [
      movement('m1', '2026-06-01T08:00:00.000Z', 650, 65, 'measurement', 900, 90),
    ]);

    expect(calculation.consumedGallons).toBe(0);
    expect(calculation.intervals).toHaveLength(0);
    expect(calculation.isComplete).toBe(false);
  });

  it('los tramos usan SIEMPRE los valores reales del punto anterior del rango', () => {
    const calculation = calculateTankConsumption(tank, [
      movement('m1', '2026-06-01T08:00:00.000Z', 80, 80, 'measurement', undefined, 0),
      movement('m2', '2026-06-01T09:00:00.000Z', 70, 70, 'measurement', 80, 80),
    ]);

    expect(calculation.intervals).toHaveLength(1);
    expect(calculation.intervals[0].startLevelCentimeter).toBe(80);
    expect(calculation.intervals[0].startEffectiveGallons).toBe(80);
    expect(calculation.intervals[0].consumedGallons).toBe(10);
    expect(calculation.initialMeasure).toBe(80);
  });

  it('stores interval audit fields in consume movement references', () => {
    const calculation = calculateTankConsumption(tank, [
      movement('m1', '2026-06-01T08:00:00.000Z', 1500, 150, 'refill', 150, 15),
      movement('m2', '2026-06-01T10:00:00.000Z', 800, 80, 'measurement', 1500, 150),
    ]);

    const payload = buildConsumePayload({
      orders: [{ orderId: 'order-1', orderName: 'Pedido 1', orderClient: 'Cliente', tipoMAC: 'MAC' }],
      tanks: [calculation],
      dispatchIds: [],
      computedM3: 10,
      totalCubes: 10,
      quantityPen: calculation.consumedGallons,
      quantityGasohol: 0,
      quantityPetroleo: 0,
    });

    // Un intervalo (m1→m2): el ref audita el tramo con los valores REALES de m1.
    expect(payload.movementRefs).toHaveLength(1);
    expect(payload.movementRefs[0].movementId).toBe('m2');
    expect(payload.movementRefs[0].initialLevelCentimeter).toBe(150);
    expect(payload.movementRefs[0].consumedGallons).toBe(700);
    // AMBOS puntos quedan atribuidos al consumo (measures.movementIds).
    expect(payload.measures[0].movementIds).toEqual(['m1', 'm2']);
  });
});

describe('buildEditConsumeSelection', () => {
  const resolveTankKey = (tankId: string) => (tankId === 'alias-1' ? 'owner-1' : tankId);

  it('marca TODOS los puntos desde measures.movementIds (bug: solo se marcaba el fin)', () => {
    // Desde el fix de deltas, movementRefs solo trae el punto FINAL del tramo;
    // el INICIO vive únicamente en measures.movementIds.
    const selection = buildEditConsumeSelection(
      {
        measures: [{
          tank: 'INFRA PEN #2',
          tankId: 'tank-1',
          initialMeasure: 100,
          finalMeasure: 40,
          movementIds: ['m-inicio', 'm-fin'],
        }],
        movementRefs: [{
          movementId: 'm-fin',
          tankId: 'tank-1',
          tankName: 'INFRA PEN #2',
          eventType: 'measurement',
          levelCentimeter: 40,
          effectiveGallons: 801.61,
          date: '2026-07-22',
          role: 'selected',
        }],
      },
      resolveTankKey
    );

    expect(selection).toEqual({ 'tank-1': ['m-inicio', 'm-fin'] });
  });

  it('cae a movementRefs en consumos legacy sin measures.movementIds y resuelve alias', () => {
    const selection = buildEditConsumeSelection(
      {
        measures: [{ tank: 'PEN #1', initialMeasure: 0, finalMeasure: 0 }],
        movementRefs: [{
          movementId: 'm-legacy',
          tankId: 'alias-1',
          tankName: 'PEN #1',
          eventType: 'measurement',
          levelCentimeter: 80,
          effectiveGallons: 800,
          date: '2026-06-01',
          role: 'selected',
        }],
      },
      resolveTankKey
    );

    expect(selection).toEqual({ 'owner-1': ['m-legacy'] });
  });
});

describe('expandSelectedMovements', () => {
  const m1 = movement('m1', '2026-06-01T08:00:00.000Z', 800, 80);
  const m2 = movement('m2', '2026-06-01T10:00:00.000Z', 0, 0);
  const m3 = movement('m3', '2026-06-01T11:00:00.000Z', 1500, 150, 'refill');
  const m4 = movement('m4', '2026-06-01T15:00:00.000Z', 550, 55);
  const all = [m1, m2, m3, m4];

  it('includes intermediate readings (incl. refills) when only endpoints are selected', () => {
    const expanded = expandSelectedMovements(all, new Set(['m1', 'm4']));
    expect(expanded.map((movementItem) => movementItem._id)).toEqual(['m1', 'm2', 'm3', 'm4']);

    // El consumo real considera la recarga intermedia, no solo m1 -> m4.
    const calculation = calculateTankConsumption(tank, expanded);
    expect(calculation.consumedGallons).toBe(1750);
  });

  it('returns just the selected reading when fewer than two are selected', () => {
    expect(expandSelectedMovements(all, new Set(['m3'])).map((movementItem) => movementItem._id)).toEqual(['m3']);
    expect(expandSelectedMovements(all, new Set()).map((movementItem) => movementItem._id)).toEqual([]);
  });

  it('does not include readings outside the selected span', () => {
    const expanded = expandSelectedMovements(all, new Set(['m2', 'm3']));
    expect(expanded.map((movementItem) => movementItem._id)).toEqual(['m2', 'm3']);
  });
});

describe('shared tank movement grouping', () => {
  const sharedTank: ConsumeMovementTank = {
    ...tank,
    _id: 'local-alias',
    sharedTankId: 'owner-tank',
  };
  const ownerMovement = {
    ...movement('owner-movement', '2026-06-25T16:29:00.000Z', 1007.19, 136.8, 'refill'),
    tankId: 'owner-tank',
  };
  const aliasMovement = {
    ...movement('alias-movement', '2026-06-27T17:54:00.000Z', 721.52, 98),
    tankId: 'local-alias',
  };

  it('resolves owner and local alias IDs to one canonical key', () => {
    expect(resolveTankMovementKey([sharedTank], 'owner-tank')).toBe('owner-tank');
    expect(resolveTankMovementKey([sharedTank], 'local-alias')).toBe('owner-tank');
  });

  it('shows owner and local alias readings in the same tank history', () => {
    expect(
      groupTankMovementsByTank([sharedTank], [ownerMovement, aliasMovement])
    ).toEqual({
      'owner-tank': [ownerMovement, aliasMovement],
    });
  });

  it('preserves an unknown tank key without dropping its readings', () => {
    expect(resolveTankMovementKey([sharedTank], 'unrelated-tank')).toBe('unrelated-tank');
  });

  it('groups cross-company alias readings by tank name into the local shared tank', () => {
    const constroadTank: ConsumeMovementTank = {
      ...tank,
      _id: 'constroad-alias',
      name: 'GRUPO PENTA',
      sharedTankId: 'owner-tank',
    };
    const globofastMovement = {
      ...movement('globofast-movement', '2026-07-25T11:30:00.000Z', 22, 14.58),
      tankId: 'globofast-alias',
      tankName: 'GRUPO PENTA',
    };

    expect(
      resolveTankMovementKey([constroadTank], 'globofast-alias', 'GRUPO PENTA')
    ).toBe('owner-tank');
    expect(
      groupTankMovementsByTank([constroadTank], [globofastMovement])
    ).toEqual({
      'owner-tank': [globofastMovement],
    });
  });

  // Caso real Inframaq CUMMINS (2026-08-21): Globofast midió con tankName
  // "Cummins Prod." y el dueño lista el tanque como "CUMMINS PROD.". El match
  // exacto dejaba las lecturas huérfanas → "0 puntos" en Nuevo consumo.
  it('groups cross-company readings when tank names differ only by letter case', () => {
    const inframaqOwner: ConsumeMovementTank = {
      ...tank,
      _id: '6a889cfb69935c61dcfff62c',
      name: 'CUMMINS PROD.',
      sharedTankId: '6a889cfb69935c61dcfff62c',
      sharedOwnerCompanyId: 'inframaq-iax',
    };
    const globofastMovement = {
      ...movement('cummins-globe', '2026-08-21T12:21:00.000Z', 74.44, 13),
      tankId: '6a889d1069935c61dcfff67b',
      tankName: 'Cummins Prod.',
    };

    expect(
      resolveTankMovementKey([inframaqOwner], globofastMovement.tankId, globofastMovement.tankName)
    ).toBe('6a889cfb69935c61dcfff62c');
    expect(groupTankMovementsByTank([inframaqOwner], [globofastMovement])).toEqual({
      '6a889cfb69935c61dcfff62c': [globofastMovement],
    });
  });
});
