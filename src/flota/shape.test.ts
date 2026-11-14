import { truckShapeOf } from './shape';

describe('truckShapeOf', () => {
  it.each([
    ['Cuadrado', 'Cuadrado'],
    ['Square', 'Cuadrado'],
    [' cuadrado ', 'Cuadrado'],
    ['Concavo', 'Concavo'],
    ['Cóncavo', 'Concavo'],
    ['Concave', 'Concavo'],
  ])('reads %s', (text, shape) => {
    expect(truckShapeOf(text)).toBe(shape);
  });

  it.each([['Tolva'], [''], [undefined], [null]])('has no shape for %s', (text) => {
    expect(truckShapeOf(text)).toBe('');
  });
});
