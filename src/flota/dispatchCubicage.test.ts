import { dispatchCubicageOf, measuredByLine, needsSiblingLookup, newestCubicage, type CubicageCandidate } from './dispatchCubicage';

const CAPTURED = new Date('2026-11-14T16:00:00.000Z');
const MEASURED = { plate: 'B4X-836', m3: 18.72, shape: 'Square', cubicator: 'Ana', measures: { totalWidth: '2.4', totalLength: '5.2', totalHeight: 1.5, squareHeight: null }, cubicageUpdatedAt: '2026-11-13T15:00:00.000Z' };
const constroad = (unit: Partial<CubicageCandidate['unit']> = {}): CubicageCandidate => ({ companyId: 'constroad', companyName: 'CONSTROAD', unit: { ...MEASURED, ...unit } });
const inframaq = (unit: Partial<CubicageCandidate['unit']> = {}): CubicageCandidate => ({ companyId: 'inframaq-iax', companyName: 'INFRAMAQ S.A.C.', unit: { ...MEASURED, ...unit } });

describe('needsSiblingLookup', () => {
  it('looks elsewhere when the unit is missing, has no volume, no shape or is provisional', () => {
    // Arrange / Act / Assert
    expect(needsSiblingLookup(undefined)).toBe(true);
    expect(needsSiblingLookup({ plate: 'X', m3: 0, shape: 'Cuadrado' })).toBe(true);
    expect(needsSiblingLookup({ plate: 'X', m3: 10, shape: 'Tolva' })).toBe(true);
    expect(needsSiblingLookup({ ...MEASURED, pendingCubicageRegularization: true })).toBe(true);
  });

  it('keeps the local unit when it is measured', () => {
    // Arrange / Act / Assert
    expect(needsSiblingLookup(MEASURED)).toBe(false);
  });
});

describe('newestCubicage', () => {
  it('takes the newest measured candidate', () => {
    // Arrange
    const newer = inframaq({ m3: 20, cubicageUpdatedAt: '2026-11-14T10:00:00.000Z' });

    // Act / Assert
    expect(newestCubicage([constroad(), newer])).toBe(newer);
  });

  it('keeps the first one on a tie, so the local company wins', () => {
    // Arrange
    const local = constroad();

    // Act / Assert
    expect(newestCubicage([local, inframaq()])).toBe(local);
  });

  it('lets a dated measure beat an undated one, and never takes an unmeasured candidate', () => {
    // Arrange
    const dated = inframaq();

    // Act / Assert
    expect(newestCubicage([constroad({ cubicageUpdatedAt: undefined }), dated])).toBe(dated);
    expect(newestCubicage([constroad({ m3: 0, cubicageUpdatedAt: '2027-01-01T00:00:00.000Z' }), dated])).toBe(dated);
    expect(newestCubicage([constroad({ m3: undefined })])).toBeNull();
    expect(newestCubicage([])).toBeNull();
  });
});

describe('dispatchCubicageOf', () => {
  it('copies the cubicage with numeric measures and who measured', () => {
    // Arrange / Act
    const copy = dispatchCubicageOf(inframaq({ certificateNumber: 'CUB-2026-0007' }), { ownCompanyId: 'constroad', capturedAt: CAPTURED });

    // Assert
    expect(copy).toEqual({
      plate: 'B4X-836',
      m3: 18.72,
      shape: 'Cuadrado',
      measures: { totalWidth: 2.4, totalLength: 5.2, totalHeight: 1.5 },
      measuredBy: 'Ana',
      measuredByCompanyId: 'inframaq-iax',
      measuredByCompanyName: 'INFRAMAQ S.A.C.',
      measuredAt: '2026-11-13T15:00:00.000Z',
      certificateNumber: 'CUB-2026-0007',
      source: 'sibling',
      capturedAt: CAPTURED.toISOString(),
    });
  });

  it('marks the copy local and provisional when it is', () => {
    // Arrange / Act
    const copy = dispatchCubicageOf(constroad({ pendingCubicageRegularization: true, cubicageUpdatedAt: undefined, cubicator: '' }), { ownCompanyId: 'constroad', capturedAt: CAPTURED });

    // Assert
    expect(copy).toMatchObject({ source: 'local', provisional: true });
    expect(copy).not.toHaveProperty('measuredAt');
    expect(copy).not.toHaveProperty('measuredBy');
  });

  it('copies nothing from a unit without volume or shape', () => {
    // Arrange / Act / Assert
    expect(dispatchCubicageOf(constroad({ m3: 0 }), { ownCompanyId: 'constroad', capturedAt: CAPTURED })).toBeNull();
    expect(dispatchCubicageOf(constroad({ shape: '' }), { ownCompanyId: 'constroad', capturedAt: CAPTURED })).toBeNull();
  });
});

describe('measuredByLine', () => {
  const copy = dispatchCubicageOf(inframaq(), { ownCompanyId: 'constroad', capturedAt: CAPTURED });

  it('names the company that measured and the day, in Lima', () => {
    // Arrange / Act / Assert
    expect(copy && measuredByLine(copy, 'constroad')).toBe('Medido por INFRAMAQ S.A.C. el 13/11/2026');
  });

  it('says nothing when the issuer measured', () => {
    // Arrange / Act / Assert
    expect(copy && measuredByLine(copy, 'inframaq-iax')).toBeNull();
  });

  it('leaves out the day when the measure has none', () => {
    // Arrange
    const undated = dispatchCubicageOf(inframaq({ cubicageUpdatedAt: undefined }), { ownCompanyId: 'constroad', capturedAt: CAPTURED });

    // Act / Assert
    expect(undated && measuredByLine(undated, 'constroad')).toBe('Medido por INFRAMAQ S.A.C.');
  });
});
