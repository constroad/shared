import { maxAreaFromSides, areaByTriangulation, diagonalesNecesarias } from './areaMedida';

/**
 * Area from the lengths MEASURED with a tape, without the photo in between.
 *
 * **Why (José, 01/09/2026):**
 * «el cálculo que haces cuando coloco las medidas es recontra impreciso».
 * It was, by construction. The current method derives a
 * SINGLE average scale (meters per pixel) and applies it to the whole photo.
 * That only holds if the surface is parallel to the sensor; patches are
 * photographed at an angle to the pavement, and in perspective the near edge has
 * far more pixels per meter than the far one. A single scale cannot fix that.
 *
 * **And a homography is not enough either.** A homography is determined by 4
 * correspondences, so with 4 corners on the photo it fits ANY quadrilateral on
 * the floor: it adds no new constraint. The root problem is geometric, not one
 * of projection: **four sides do not determine a quadrilateral** (it is hinged,
 * like scissors; a triangle is determined by its three sides). One datum is
 * missing, and that datum is the DIAGONAL.
 *
 * With the diagonal the quadrilateral splits into two triangles and the area
 * comes from Heron: exact, with no perspective, no camera. One more tape reading.
 */

describe('diagonalesNecesarias', () => {
  it('un triángulo no necesita ninguna: tres lados ya lo determinan', () => {
    expect(diagonalesNecesarias(3)).toBe(0);
  });

  it('un cuadrilátero necesita una', () => {
    expect(diagonalesNecesarias(4)).toBe(1);
  });

  it('cada lado nuevo pide una diagonal más', () => {
    expect(diagonalesNecesarias(5)).toBe(2);
    expect(diagonalesNecesarias(6)).toBe(3);
  });

  it('menos de tres puntos no es un polígono', () => {
    expect(diagonalesNecesarias(2)).toBeNull();
    expect(diagonalesNecesarias(0)).toBeNull();
  });
});

describe('areaByTriangulation', () => {
  it('triángulo 3-4-5: área 6', () => {
    expect(areaByTriangulation([3, 4, 5], [])).toEqual({ estado: 'medida', area: 6 });
  });

  it('cuadrado de 2 m con su diagonal', () => {
    // Sides 2,2,2,2 and diagonal 2√2 → 4 m². Without the diagonal, the same four
    // sides could be a flattened rhombus with almost zero area.
    const r = areaByTriangulation([2, 2, 2, 2], [Math.sqrt(8)]);

    expect(r.estado).toBe('medida');
    expect(r.area).toBeCloseTo(4, 6);
  });

  it('el mismo cuadrilátero con otra diagonal da otra área', () => {
    // THIS is the proof that the datum was missing: same four sides, two
    // different legitimate areas. No method that only looks at the sides and the
    // photo can choose between them.
    const rombo = areaByTriangulation([2, 2, 2, 2], [2]);

    expect(rombo.area).toBeCloseTo(3.4641, 3);
    expect(rombo.area).not.toBeCloseTo(4, 2);
  });

  it('un bacheo trapezoidal real', () => {
    // Trapezoid with bases 3.20 and 2.40, sides 1.80 and 1.85, diagonal 3.60.
    const r = areaByTriangulation([3.2, 1.8, 2.4, 1.85], [3.6]);

    expect(r.estado).toBe('medida');
    expect(r.area).toBeGreaterThan(4);
    expect(r.area).toBeLessThan(6);
  });

  // **Measurements that do not close.** If the tape gave impossible numbers, the
  // area does not exist: say so, do not return a plausible number. It is exactly
  // the failure mode we came from.
  it('lados que violan la desigualdad triangular se reportan, no se inventan', () => {
    const r = areaByTriangulation([1, 1, 10], []);

    expect(r.estado).toBe('incoherente');
    expect(r.area).toBeNull();
  });

  it('una diagonal imposible también se reporta', () => {
    const r = areaByTriangulation([2, 2, 2, 2], [99]);

    expect(r.estado).toBe('incoherente');
    expect(r.area).toBeNull();
  });

  it('sin todos los lados no se calcula: no se rellena lo que falta', () => {
    expect(areaByTriangulation([3, 4, null], []).estado).toBe('faltan-datos');
    expect(areaByTriangulation([2, 2, 2, 2], [null]).estado).toBe('faltan-datos');
    expect(areaByTriangulation([2, 2, 2, 2], []).estado).toBe('faltan-datos');
  });

  it('un lado en cero o negativo no es una medición', () => {
    expect(areaByTriangulation([3, 4, 0], []).estado).toBe('faltan-datos');
    expect(areaByTriangulation([3, 4, -5], []).estado).toBe('faltan-datos');
  });

  it('menos de tres lados no tiene área', () => {
    expect(areaByTriangulation([3, 4], []).estado).toBe('faltan-datos');
  });

  it('un pentágono con sus dos diagonales', () => {
    // Fan from vertex 0: two 3-4-5 right triangles plus one more.
    const r = areaByTriangulation([3, 4, 4, 3, 6], [5, 5]);

    expect(r.estado).toBe('medida');
    expect(r.area).toBeGreaterThan(0);
  });
});

describe('maxAreaFromSides — el techo geométrico', () => {
  const brahmagupta = (lados: number[]) => {
    const s = lados.reduce((a, b) => a + b, 0) / 2;
    return Math.sqrt(lados.reduce((acc, l) => acc * (s - l), 1));
  };

  it('en un triángulo el techo ES el área (tres lados ya la determinan)', () => {
    expect(maxAreaFromSides([3, 4, 5])).toBeCloseTo(6, 9);
  });

  it('en un cuadrilátero coincide con Brahmagupta', () => {
    for (const lados of [[1, 1, 1, 1], [3, 4, 5, 6], [9.05, 52.7, 2.7, 46.4], [1, 1, 1, 2.9]]) {
      expect(maxAreaFromSides(lados)).toBeCloseTo(brahmagupta(lados), 6);
    }
  });

  it('el caso del 05/09/2026: 745 m² en pantalla, 245.22 como máximo posible', () => {
    expect(maxAreaFromSides([9.05, 52.7, 2.7, 46.4])).toBeCloseTo(245.22, 2);
  });

  it('con 5+ lados también: pentágono regular', () => {
    expect(maxAreaFromSides([1, 1, 1, 1, 1])).toBeCloseTo(1.7204774, 6);
    expect(maxAreaFromSides([2, 2, 2, 2, 2, 2])).toBeCloseTo(6 * Math.sqrt(3), 6);
  });

  it('largos que no cierran ningún polígono no tienen techo', () => {
    expect(maxAreaFromSides([1, 1, 5])).toBeNull();
    expect(maxAreaFromSides([1, 1, 1, 3])).toBeNull();
  });

  it('sin todos los lados no hay techo: es un hecho medido o no es nada', () => {
    expect(maxAreaFromSides([1, 1, null, 1])).toBeNull();
    expect(maxAreaFromSides([1, 2])).toBeNull();
  });
});
