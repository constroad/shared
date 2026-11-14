import { dispatchCm, dispatchReference } from './dispatchHeights';

const SQUARE = { totalWidth: '2', totalLength: '4', totalHeight: '1.5' };

describe('dispatchCm', () => {
  it('answers in centimeters, not meters', () => {
    expect(dispatchCm('Cuadrado', SQUARE, 6)).toEqual({ m3: 6, loadCm: 75, fromTopCm: 75 });
  });

  it('answers nothing for no volume', () => {
    expect(dispatchCm('Cuadrado', SQUARE, 0)).toBeNull();
  });
});

describe('dispatchReference', () => {
  it('lists whole m³ every two from the volume down', () => {
    expect(dispatchReference('Cuadrado', SQUARE, 12).map((row) => row.m3)).toEqual([6, 8, 10, 12]);
  });

  it('leaves out what does not fit a small truck', () => {
    expect(dispatchReference('Cuadrado', { totalWidth: '1', totalLength: '2', totalHeight: '1' }, 2).map((row) => row.m3)).toEqual([2]);
  });
});
