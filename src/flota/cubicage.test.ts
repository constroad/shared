import { cubicageM3, deriveConcaveMeasures, dispatchHeight, measureFieldsOf, measuresOf, plateKeyOf } from './cubicage';

const SQUARE = { totalWidth: '2', totalLength: '4', totalHeight: '1.5' };
const CONCAVE = { totalWidth: '2.4', totalLength: '5', totalHeight: '1.5', squareHeight: '1', centralConcaveWidth: '1' };

describe('plateKeyOf', () => {
  it('reads the same plate however it was typed', () => {
    expect(['B4X 836', 'b4x-836', ' B4X836 '].map(plateKeyOf)).toEqual(['B4X836', 'B4X836', 'B4X836']);
  });

  it('has no key for a missing plate', () => {
    expect(plateKeyOf(undefined)).toBe('');
  });
});

describe('deriveConcaveMeasures', () => {
  it('deduces what is not measured', () => {
    expect(deriveConcaveMeasures(CONCAVE)).toEqual({ concaveHight: '0.5', leftConcaveWidth: '0.7', rightConcaveWidth: '0.7' });
  });

  it('never gives a negative measure', () => {
    expect(deriveConcaveMeasures({ totalWidth: '1', totalHeight: '1', squareHeight: '2', centralConcaveWidth: '3' })).toEqual({ concaveHight: '0', leftConcaveWidth: '0', rightConcaveWidth: '0' });
  });

  it('reads a measure that is not a number as zero', () => {
    expect(deriveConcaveMeasures({ totalHeight: 'x', squareHeight: '1' }).concaveHight).toBe('0');
  });
});

describe('measuresOf', () => {
  it('overrides a typed deduced measure on a concave truck', () => {
    expect(measuresOf('Concavo', { ...CONCAVE, concaveHight: '9' }).concaveHight).toBe('0.5');
  });

  it('keeps only the three measures of a square truck', () => {
    expect(measuresOf('Cuadrado', { ...SQUARE, concaveHight: '9' })).toEqual(SQUARE);
  });
});

describe('cubicageM3', () => {
  it('multiplies the three sides of a square truck', () => {
    expect(cubicageM3('Cuadrado', SQUARE)).toBeCloseTo(12);
  });

  it('adds the straight part, the flat bottom and the curved sides of a concave truck', () => {
    expect(cubicageM3('Concavo', CONCAVE)).toBeCloseTo(12 + 2.5 + (0.5 * 0.7 * Math.PI * 5) / 2);
  });

  it('is zero without measures', () => {
    expect(cubicageM3('Cuadrado', {})).toBe(0);
  });
});

describe('dispatchHeight', () => {
  it('gives the load height of a square truck, and what stays free above', () => {
    const height = dispatchHeight('Cuadrado', SQUARE, 6);

    expect(height?.loadHeight).toBeCloseTo(0.75);
    expect(height?.fromTop).toBeCloseTo(0.75);
  });

  it('fills the curved part of a concave truck first', () => {
    const curved = 2.5 + (0.5 * 0.7 * Math.PI * 5) / 2;

    const height = dispatchHeight('Concavo', CONCAVE, curved + 6);

    expect(height?.loadHeight).toBeCloseTo(0.5 + 0.5);
    expect(height?.fromTop).toBeCloseTo(0.5);
  });

  it('has no answer for a truck not measured, or a volume that is not one', () => {
    expect(dispatchHeight('Cuadrado', {}, 6)).toBeNull();
    expect(dispatchHeight('Cuadrado', SQUARE, 0)).toBeNull();
    expect(dispatchHeight('Concavo', CONCAVE, Number.NaN)).toBeNull();
  });
});

describe('measureFieldsOf', () => {
  it('marks what a concave truck deduces', () => {
    const fields = measureFieldsOf('Concavo');

    expect(fields).toHaveLength(8);
    expect(fields.filter((field) => field.hint).map((field) => field.key)).toEqual(['concaveHight', 'leftConcaveWidth', 'rightConcaveWidth']);
  });

  it('asks three measures of a square truck', () => {
    expect(measureFieldsOf('Cuadrado').map((field) => field.key)).toEqual(['totalWidth', 'totalLength', 'totalHeight']);
  });
});
