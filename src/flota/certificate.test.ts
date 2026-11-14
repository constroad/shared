import { certificateViewOf } from './certificate';

const CONCAVE = {
  _id: 'c1', companyId: 'inframaq-iax', unitId: 'u1', plate: 'ABC-123', shape: 'Concavo' as const, cubicator: 'Darío Quispe', number: 'CUB-2026-0031', accessKey: 'k',
  measuredAt: new Date('2026-11-13T14:42:00Z'), m3: 17.92,
  measures: { totalWidth: '2.4', totalLength: '5.2', totalHeight: '1.5', squareHeight: '0.9', centralConcaveWidth: '1.2', concaveHight: '0.6', leftConcaveWidth: '0.6', rightConcaveWidth: '0.6' },
  previous: { m3: 15.4, at: new Date('2026-10-02T15:00:00Z') },
};
const ISSUER = { name: 'INFRAMAQ S.A.C.', address: 'Lurín, Lima', logoUrl: '' };
const OPTIONS = { issuer: ISSUER, origin: 'https://inframaq.constroad.com/' };

describe('certificateViewOf', () => {
  it('splits a concave hopper in its three parts, which add up to its volume', () => {
    const view = certificateViewOf(CONCAVE, OPTIONS);

    expect(view.parts.map((part) => [part.label, part.m3])).toEqual([['Parte recta', 11.23], ['Fondo plano', 3.74], ['Costados curvos', 2.94]]);
    expect(view.m3).toBe(17.92);
    expect(view.parts[0].formula).toBe('A1 × A2 × A5 = 2.40 × 5.20 × 0.90');
    expect(view.figureUrl).toBe('https://inframaq.constroad.com/img/cubicar/volquete-concavo.png');
  });

  it('lists the five measured and the three deduced measures, with their formula', () => {
    const view = certificateViewOf(CONCAVE, OPTIONS);

    expect(view.measures.map((measure) => [measure.code, measure.meters, measure.formula ?? 'medida'])).toEqual([
      ['A1', 2.4, 'medida'], ['A2', 5.2, 'medida'], ['A3', 1.5, 'medida'], ['A5', 0.9, 'medida'], ['B2', 1.2, 'medida'],
      ['A4', 0.6, 'A3 − A5'], ['B1', 0.6, '(A1 − B2) / 2'], ['B3', 0.6, '(A1 − B2) / 2'],
    ]);
  });

  it('gives the dispatch height for whole m³ below the volume, in cm, as the engine does', () => {
    const view = certificateViewOf(CONCAVE, OPTIONS);

    expect(view.dispatch).toEqual([
      { m3: 11, loadCm: 95, fromTopCm: 55 },
      { m3: 13, loadCm: 111, fromTopCm: 39 },
      { m3: 15, loadCm: 127, fromTopCm: 23 },
      { m3: 17, loadCm: 143, fromTopCm: 7 },
    ]);
  });

  it('a square hopper is one prism', () => {
    const view = certificateViewOf({ ...CONCAVE, shape: 'Cuadrado', m3: 18, measures: { totalWidth: '2.4', totalLength: '5', totalHeight: '1.5' }, previous: undefined }, OPTIONS);

    expect(view.shapeLabel).toBe('Cuadrado');
    expect(view.parts).toEqual([{ label: 'Tolva', formula: 'A1 × A2 × A3 = 2.40 × 5.00 × 1.50', m3: 18 }]);
    expect(view.measures.map((measure) => measure.code)).toEqual(['A1', 'A2', 'A3']);
    expect(view).not.toHaveProperty('previous');
  });

  it('says the volume it replaces and when', () => {
    expect(certificateViewOf(CONCAVE, OPTIONS).previous).toEqual({ m3: 15.4, at: '2026-10-02T15:00:00.000Z' });
  });

  it('names the company that measured, when it is not the one that issues', () => {
    const view = certificateViewOf(CONCAVE, { ...OPTIONS, issuer: { ...ISSUER, name: 'CONSTROAD' }, measuredBy: { companyName: 'INFRAMAQ S.A.C.' } });

    expect(view.issuer.name).toBe('CONSTROAD');
    expect(view.measuredBy).toEqual({ companyName: 'INFRAMAQ S.A.C.' });
  });

  it('says nothing about who measured when the issuer did', () => {
    expect(certificateViewOf(CONCAVE, OPTIONS)).not.toHaveProperty('measuredBy');
  });
});
