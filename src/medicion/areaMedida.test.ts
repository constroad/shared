import { areaMaximaPorLados, areaPorTriangulacion, diagonalesNecesarias } from './areaMedida';

/**
 * Área a partir de los largos MEDIDOS con wincha, sin la foto de por medio.
 *
 * **Por qué (José, 01/09/2026): «el cálculo que haces cuando coloco las medidas
 * es recontra impreciso».** Lo era por construcción. El método actual saca una
 * ÚNICA escala promedio (metros por píxel) y la aplica a toda la foto. Eso sólo
 * vale si la superficie está paralela al sensor; los bacheos se fotografían en
 * ángulo contra el pavimento, y en perspectiva el borde cercano tiene muchos más
 * píxeles por metro que el lejano. Una escala única no puede corregir eso.
 *
 * **Y la homografía tampoco alcanza para esto.** Una homografía queda
 * determinada por 4 correspondencias, así que con 4 esquinas en la foto encaja
 * con CUALQUIER cuadrilátero del piso: no aporta ninguna restricción nueva. El
 * problema de fondo es geométrico, no de proyección — **cuatro lados no
 * determinan un cuadrilátero** (es articulado, como una tijera; un triángulo sí
 * queda determinado por sus tres lados). Falta un dato, y ese dato es la
 * DIAGONAL.
 *
 * Con la diagonal el cuadrilátero se parte en dos triángulos y el área sale por
 * Herón: exacta, sin perspectiva, sin cámara. Una medición más con la wincha.
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

describe('areaPorTriangulacion', () => {
  it('triángulo 3-4-5: área 6', () => {
    expect(areaPorTriangulacion([3, 4, 5], [])).toEqual({ estado: 'medida', area: 6 });
  });

  it('cuadrado de 2 m con su diagonal', () => {
    // Lados 2,2,2,2 y diagonal 2√2 → 4 m². Sin la diagonal, esos mismos cuatro
    // lados podrían ser un rombo aplastado de área casi cero.
    const r = areaPorTriangulacion([2, 2, 2, 2], [Math.sqrt(8)]);

    expect(r.estado).toBe('medida');
    expect(r.area).toBeCloseTo(4, 6);
  });

  it('el mismo cuadrilátero con otra diagonal da otra área', () => {
    // ESTA es la demostración de que el dato faltaba: mismos cuatro lados, dos
    // áreas legítimas distintas. Ningún método que sólo mire los lados y la foto
    // puede elegir entre las dos.
    const rombo = areaPorTriangulacion([2, 2, 2, 2], [2]);

    expect(rombo.area).toBeCloseTo(3.4641, 3);
    expect(rombo.area).not.toBeCloseTo(4, 2);
  });

  it('un bacheo trapezoidal real', () => {
    // Trapecio de bases 3.20 y 2.40, lados 1.80 y 1.85, diagonal 3.60.
    const r = areaPorTriangulacion([3.2, 1.8, 2.4, 1.85], [3.6]);

    expect(r.estado).toBe('medida');
    expect(r.area).toBeGreaterThan(4);
    expect(r.area).toBeLessThan(6);
  });

  // **Medidas que no cierran.** Si la wincha dio números imposibles, el área no
  // existe: hay que decirlo, no devolver un número plausible. Es justo el modo
  // de falla del que venimos.
  it('lados que violan la desigualdad triangular se reportan, no se inventan', () => {
    const r = areaPorTriangulacion([1, 1, 10], []);

    expect(r.estado).toBe('incoherente');
    expect(r.area).toBeNull();
  });

  it('una diagonal imposible también se reporta', () => {
    const r = areaPorTriangulacion([2, 2, 2, 2], [99]);

    expect(r.estado).toBe('incoherente');
    expect(r.area).toBeNull();
  });

  it('sin todos los lados no se calcula: no se rellena lo que falta', () => {
    expect(areaPorTriangulacion([3, 4, null], []).estado).toBe('faltan-datos');
    expect(areaPorTriangulacion([2, 2, 2, 2], [null]).estado).toBe('faltan-datos');
    expect(areaPorTriangulacion([2, 2, 2, 2], []).estado).toBe('faltan-datos');
  });

  it('un lado en cero o negativo no es una medición', () => {
    expect(areaPorTriangulacion([3, 4, 0], []).estado).toBe('faltan-datos');
    expect(areaPorTriangulacion([3, 4, -5], []).estado).toBe('faltan-datos');
  });

  it('menos de tres lados no tiene área', () => {
    expect(areaPorTriangulacion([3, 4], []).estado).toBe('faltan-datos');
  });

  it('un pentágono con sus dos diagonales', () => {
    // Fan desde el vértice 0: dos triángulos rectángulos de 3-4-5 más uno.
    const r = areaPorTriangulacion([3, 4, 4, 3, 6], [5, 5]);

    expect(r.estado).toBe('medida');
    expect(r.area).toBeGreaterThan(0);
  });
});

describe('areaMaximaPorLados — el techo geométrico', () => {
  const brahmagupta = (lados: number[]) => {
    const s = lados.reduce((a, b) => a + b, 0) / 2;
    return Math.sqrt(lados.reduce((acc, l) => acc * (s - l), 1));
  };

  it('en un triángulo el techo ES el área (tres lados ya la determinan)', () => {
    expect(areaMaximaPorLados([3, 4, 5])).toBeCloseTo(6, 9);
  });

  it('en un cuadrilátero coincide con Brahmagupta', () => {
    for (const lados of [[1, 1, 1, 1], [3, 4, 5, 6], [9.05, 52.7, 2.7, 46.4], [1, 1, 1, 2.9]]) {
      expect(areaMaximaPorLados(lados)).toBeCloseTo(brahmagupta(lados), 6);
    }
  });

  it('el caso del 05/09/2026: 745 m² en pantalla, 245.22 como máximo posible', () => {
    expect(areaMaximaPorLados([9.05, 52.7, 2.7, 46.4])).toBeCloseTo(245.22, 2);
  });

  it('con 5+ lados también: pentágono regular', () => {
    expect(areaMaximaPorLados([1, 1, 1, 1, 1])).toBeCloseTo(1.7204774, 6);
    expect(areaMaximaPorLados([2, 2, 2, 2, 2, 2])).toBeCloseTo(6 * Math.sqrt(3), 6);
  });

  it('largos que no cierran ningún polígono no tienen techo', () => {
    expect(areaMaximaPorLados([1, 1, 5])).toBeNull();
    expect(areaMaximaPorLados([1, 1, 1, 3])).toBeNull();
  });

  it('sin todos los lados no hay techo: es un hecho medido o no es nada', () => {
    expect(areaMaximaPorLados([1, 1, null, 1])).toBeNull();
    expect(areaMaximaPorLados([1, 2])).toBeNull();
  });
});
