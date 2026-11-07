import { TAP_TOLERANCE_MOUSE_PX, TAP_TOLERANCE_TOUCH_PX, tapBox, tapTolerancePx } from './mapTap';

/**
 * A finger does not aim like a mouse (30/08/2026).
 *
 * With C6, tapping the map went from "looking" to WRITING: one tap paints the
 * street. On a phone, an 8 px box around a 4 px stroke misses often — and
 * missing means either nothing happens or the street next door gets painted.
 */

describe('tapTolerancePx', () => {
  it('el dedo necesita más caja que el mouse', () => {
    expect(tapTolerancePx(true)).toBe(TAP_TOLERANCE_TOUCH_PX);
    expect(tapTolerancePx(false)).toBe(TAP_TOLERANCE_MOUSE_PX);
    expect(TAP_TOLERANCE_TOUCH_PX).toBeGreaterThan(TAP_TOLERANCE_MOUSE_PX);
  });

  it('la caja del dedo se acerca al blanco táctil de 44 px', () => {
    // That is the diameter the system itself recommends for something
    // tappable; the street stroke is not even 8, so the tolerance is the only
    // thing that makes it reachable.
    expect(TAP_TOLERANCE_TOUCH_PX * 2).toBeGreaterThanOrEqual(28);
  });

  it('sin saber qué puntero es, asume mouse: agrandar de más pinta la calle vecina', () => {
    expect(tapTolerancePx(undefined)).toBe(TAP_TOLERANCE_MOUSE_PX);
  });
});

describe('tapBox', () => {
  it('arma la caja centrada en el punto tocado', () => {
    expect(tapBox({ x: 100, y: 50 }, 8)).toEqual([
      [92, 42],
      [108, 58],
    ]);
  });

  it('cerca del borde la caja se sale del lienzo, y está bien: MapLibre la recorta', () => {
    // Returning a clipped box here would give a tap at the edge less reach than
    // one in the centre, right where the hand covers the most.
    expect(tapBox({ x: 2, y: 1 }, 8)).toEqual([
      [-6, -7],
      [10, 9],
    ]);
  });
});
