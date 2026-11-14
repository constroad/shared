/**
 * A ESCUADRA mode (José, 30/09/2026, after the Globofast incident).
 *
 * Patches and holes are cut with a saw: corners at 90°. An orthogonal polygon
 * is DETERMINED by its sides plus the direction of each turn, and the
 * direction comes from the drawing on the photo (perspective distorts the
 * angles, but it does not swap left/right nor break collinearity). So the
 * Globofast hole, (3.30 + 4.10) × 0.65, comes out exact without diagonals.
 *
 * The engine is a closed survey traverse: walk it turning 90°, measure the
 * CLOSURE ERROR, spread it per axis (so it stays orthogonal) and get the area
 * by the shoelace formula. A bad closure signals a mistyped length, or a
 * figure that was not square-cornered.
 */
import { areaEscuadra } from './areaEscuadra';

const p = (x: number, y: number) => ({ x, y });

// A 7.40 × 0.65 rectangle seen from above.
const rectangulo = {
  points: [p(0.2, 0.2), p(0.8, 0.2), p(0.8, 0.4), p(0.2, 0.4)],
  lados: [7.4, 0.65, 7.4, 0.65],
};

// The Globofast strip: the long bottom side has a COLLINEAR break at c
// (3.30 + 4.10); the top one is a single 7.40 stretch.
const franjaGlobofast = {
  points: [p(0.2, 0.2), p(0.2, 0.4), p(0.5, 0.4), p(0.8, 0.4), p(0.8, 0.2)],
  lados: [0.65, 3.3, 4.1, 0.65, 7.4],
};

describe('areaEscuadra — figuras determinadas por sus lados', () => {
  it('un rectángulo: largo × ancho, sin diagonal', () => {
    const r = areaEscuadra(rectangulo);

    expect(r.estado).toBe('medida');
    expect(r.area).toBeCloseTo(4.81, 4);
    expect(r.cierre).toEqual({ distancia: 0, relativo: 0 });
    expect(r.giros).toEqual(['izquierda', 'izquierda', 'izquierda', 'izquierda']);
  });

  it('la franja de Globofast con el quiebre colineal: 4.81, no 9.09', () => {
    const r = areaEscuadra(franjaGlobofast);

    expect(r.estado).toBe('medida');
    expect(r.area).toBeCloseTo(4.81, 4);
    expect(r.giros[2]).toBe('recto');
  });

  it('una L de seis lados', () => {
    // Plan (m): (0,0) (4,0) (4,3) (2,3) (2,1) (0,1). Area 4×1 + 2×2 = 8.
    const r = areaEscuadra({
      points: [p(0.1, 0.1), p(0.5, 0.1), p(0.5, 0.4), p(0.3, 0.4), p(0.3, 0.2), p(0.1, 0.2)],
      lados: [4, 3, 2, 2, 2, 1],
    });

    expect(r.estado).toBe('medida');
    expect(r.area).toBeCloseTo(8, 4);
    // Five turns to the same side and one the other way: the L's inner corner.
    expect(r.giros.filter((g) => g === 'derecha')).toHaveLength(1);
  });

  it('la planta reconstruida arranca en el origen y tiene un vértice por punto', () => {
    const r = areaEscuadra(franjaGlobofast);

    expect(r.planta).toHaveLength(5);
    expect(r.planta?.[0]).toEqual({ x: 0, y: 0 });
  });

  it('el espejo (recorrer al revés) da la misma área', () => {
    const espejo = areaEscuadra({
      points: [...franjaGlobofast.points].reverse(),
      lados: [0.65, 4.1, 3.3, 0.65, 7.4],
    });

    expect(espejo.area).toBeCloseTo(4.81, 4);
  });

  it('la perspectiva no lo confunde: un rectángulo dibujado como trapecio sigue siendo rectángulo', () => {
    // Photo at an angle: the near edge looks wider. The corners are drawn at
    // ~70° and ~110°, but they are four turns to the same side.
    const r = areaEscuadra({
      points: [p(0.3, 0.2), p(0.7, 0.2), p(0.9, 0.8), p(0.1, 0.8)],
      lados: [7.4, 0.65, 7.4, 0.65],
    });

    expect(r.estado).toBe('medida');
    expect(r.area).toBeCloseTo(4.81, 4);
  });

  it('el aspecto de la foto (vertical 9:16) no cambia la clasificación de las esquinas', () => {
    const r = areaEscuadra({ ...rectangulo, aspect: 0.5625 });

    expect(r.area).toBeCloseTo(4.81, 4);
  });
});

describe('areaEscuadra — cierre', () => {
  it('lados opuestos que no coinciden: se promedian por eje, y el cierre se informa', () => {
    // The width was measured 0.65 at one end and 0.70 at the other: the hole is
    // not perfect. Per-axis adjustment = mean width 0.675, mean length 7.39.
    const r = areaEscuadra({ ...rectangulo, lados: [7.4, 0.65, 7.38, 0.7] });

    expect(r.estado).toBe('medida');
    expect(r.area).toBeCloseTo(0.675 * 7.39, 4);
    expect(r.cierre?.distancia).toBeCloseTo(Math.hypot(0.02, 0.05), 4);
    expect(r.cierre?.relativo).toBeCloseTo(Math.hypot(0.02, 0.05) / 16.13, 4);
  });

  it('un largo mal tipeado (4.70 por 7.40) NO cierra: sin área, con el cierre a la vista', () => {
    const r = areaEscuadra({ ...rectangulo, lados: [7.4, 0.65, 4.7, 0.65] });

    expect(r.estado).toBe('no-cierra');
    expect(r.area).toBeNull();
    expect(r.cierre?.distancia).toBeCloseTo(2.7, 4);
    expect(r.cierre?.relativo).toBeGreaterThan(0.1);
  });

  it('la tolerancia la fija el OTRO eje: 30 cm entre dos largos no cierra (los anchos se inclinarían 27°)', () => {
    // Averaging would give 7.25 × 0.65 = 4.71; the real trapezoid is 4.18: 11 % too much.
    const r = areaEscuadra({ ...rectangulo, lados: [7.4, 0.65, 7.1, 0.65] });

    expect(r.estado).toBe('no-cierra');
  });

  it('…pero 5 cm entre dos anchos sí cierra: los largos se inclinan 0.4° y el promedio es exacto', () => {
    const r = areaEscuadra({ ...rectangulo, lados: [7.4, 0.65, 7.4, 0.7] });

    expect(r.estado).toBe('medida');
    expect(r.area).toBeCloseTo(0.675 * 7.4, 4);
  });

  it('un vértice dudoso en el dibujo (¿esquina o recto?) lo decide el cierre', () => {
    // c drawn 26° off the b–d line: as a corner the polygon does not close
    // (five 90° turns do not add up to one revolution); as straight, it closes exactly.
    const r = areaEscuadra({
      ...franjaGlobofast,
      points: [p(0.2, 0.2), p(0.2, 0.4), p(0.5, 0.33), p(0.8, 0.4), p(0.8, 0.2)],
    });

    expect(r.estado).toBe('medida');
    expect(r.giros[2]).toBe('recto');
    expect(r.area).toBeCloseTo(4.81, 4);
  });
});

describe('areaEscuadra — lo que NO es a escuadra', () => {
  it('un triángulo no tiene esquinas a 90° que cierren', () => {
    const r = areaEscuadra({ points: [p(0.2, 0.2), p(0.8, 0.2), p(0.5, 0.7)], lados: [3, 4, 5] });

    expect(r.estado).toBe('no-ortogonal');
    expect(r.area).toBeNull();
  });

  it('un lazo (giros que no suman una vuelta) no es un polígono a escuadra', () => {
    const r = areaEscuadra({
      points: [p(0.2, 0.2), p(0.8, 0.2), p(0.2, 0.8), p(0.8, 0.8)],
      lados: [6, 8.5, 6, 8.5],
    });

    expect(r.estado).toBe('no-ortogonal');
  });

  it('un quiebre dibujado como esquina clara (67°) no cierra: el usuario lo fuerza a recto', () => {
    const withCorner = {
      ...franjaGlobofast,
      points: [p(0.2, 0.2), p(0.2, 0.4), p(0.5, 0.2), p(0.8, 0.4), p(0.8, 0.2)],
    };

    expect(areaEscuadra(withCorner).estado).toBe('no-ortogonal');
    const forzado = areaEscuadra({ ...withCorner, girosForzados: { 2: 'recto' } });
    expect(forzado.estado).toBe('medida');
    expect(forzado.area).toBeCloseTo(4.81, 4);
  });

  it('sin un lado no hay poligonal', () => {
    const r = areaEscuadra({ ...rectangulo, lados: [7.4, 0.65, null, 0.65] });

    expect(r.estado).toBe('faltan-datos');
    expect(r.area).toBeNull();
    expect(r.cierre).toBeNull();
  });

  it('largos cero o negativos son datos que faltan', () => {
    expect(areaEscuadra({ ...rectangulo, lados: [7.4, 0, 7.4, 0.65] }).estado).toBe('faltan-datos');
  });
});
