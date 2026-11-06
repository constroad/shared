import {
  isTankConsumableBy,
  splitTanksByOwnership,
  tankOwnerCompanyId,
} from './tankOwnership';
import type { ConsumeMovementTank } from './consumeMovementFlow';

const buildTank = (input: Partial<ConsumeMovementTank>): ConsumeMovementTank =>
  ({
    _id: 'tank-1',
    name: 'Tanque',
    tableReference: 'T-1',
    contentType: 'petroleum',
    tankShape: 'cylindrical',
    geometry: {},
    cubicCmPerUsGallon: 3785,
    serpentines: [],
    ...input,
  }) as ConsumeMovementTank;

describe('tankOwnerCompanyId', () => {
  it('usa sharedOwnerCompanyId cuando el tanque participa de compartición', () => {
    // Arrange: alias local de constroad sobre un tanque de inframaq.
    const tank = buildTank({ companyId: 'constroad', sharedOwnerCompanyId: 'inframaq-iax' });

    // Act
    const ownerCompanyId = tankOwnerCompanyId(tank);

    // Assert
    expect(ownerCompanyId).toBe('inframaq-iax');
  });

  it('cae al companyId propio cuando el tanque no es compartido', () => {
    const tank = buildTank({ companyId: 'constroad' });

    expect(tankOwnerCompanyId(tank)).toBe('constroad');
  });
});

describe('isTankConsumableBy (tanque compartido = todos consumen)', () => {
  it('el DUEÑO puede consumir su tanque compartido', () => {
    const tank = buildTank({ companyId: 'inframaq-iax', sharedOwnerCompanyId: 'inframaq-iax' });

    expect(isTankConsumableBy(tank, 'inframaq-iax')).toBe(true);
  });

  it('la empresa COMPARTIDA también consume el tanque del dueño', () => {
    // Caso real: INFRAMAQ es dueño de los INFRA*/GRUPO*, pero quien MIDE es
    // constroad (119 medidas en GRUPO WILSON contra 0 del dueño). Con la regla
    // owner-only nadie podía cerrar el consumo: el que medía no podía y el que
    // podía no medía.
    const tank = buildTank({ companyId: 'constroad', sharedOwnerCompanyId: 'inframaq-iax' });

    expect(isTankConsumableBy(tank, 'constroad')).toBe(true);
  });

  it('un tanque propio NO compartido siempre es consumible', () => {
    const tank = buildTank({ companyId: 'constroad' });

    expect(isTankConsumableBy(tank, 'constroad')).toBe(true);
  });

  it('es permisivo mientras la sesión carga (activeCompanyId vacío)', () => {
    // El guard duro es el 409 del server; así no parpadean fuera los propios.
    const tank = buildTank({ companyId: 'constroad', sharedOwnerCompanyId: 'inframaq-iax' });

    expect(isTankConsumableBy(tank, '')).toBe(true);
  });

  it('es permisivo si el payload no trae dueño resoluble (legacy)', () => {
    const tank = buildTank({});

    expect(isTankConsumableBy(tank, 'constroad')).toBe(true);
  });
});

describe('splitTanksByOwnership', () => {
  it('todo tanque accesible es consumible (propio o compartido)', () => {
    // Arrange: caso real constroad — 1 propio + 2 alias de inframaq.
    const tanks = [
      buildTank({ _id: 'own', companyId: 'constroad' }),
      buildTank({ _id: 'infra-1', companyId: 'constroad', sharedOwnerCompanyId: 'inframaq-iax', name: 'INFRA PEN #1' }),
      buildTank({ _id: 'infra-2', companyId: 'constroad', sharedOwnerCompanyId: 'inframaq-iax', name: 'INFRA PEN #2' }),
    ];

    // Act
    const { consumable, foreignOwned } = splitTanksByOwnership(tanks, 'constroad');

    // Assert: los compartidos YA NO se apartan — se puede consumir sobre ellos.
    expect(consumable.map((tank) => tank._id)).toEqual(['own', 'infra-1', 'infra-2']);
    expect(foreignOwned).toHaveLength(0);
  });

  it('para el dueño, todo es consumible y nada queda como ajeno', () => {
    const tanks = [
      buildTank({ _id: 'infra-1', companyId: 'inframaq-iax', sharedOwnerCompanyId: 'inframaq-iax' }),
      buildTank({ _id: 'propio', companyId: 'inframaq-iax' }),
    ];

    const { consumable, foreignOwned } = splitTanksByOwnership(tanks, 'inframaq-iax');

    expect(consumable).toHaveLength(2);
    expect(foreignOwned).toHaveLength(0);
  });
});
