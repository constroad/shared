import {
  deriveTargetQuantity,
  lengthOfLine,
  measuresOf,
  pointAtMeasure,
  projectToLine,
  sliceLine,
} from './streetGeometry';

/** ~111.32 m per 0.001° of latitude at the equator; in Lima (-12°) longitude
 *  shrinks by cos(lat), which is why the test segments run along latitude. */
const A = { lat: -12.0, lng: -76.9 };
const B = { lat: -12.001, lng: -76.9 };

describe('lengthOfLine', () => {
  it('mide un tramo recto con la precisión que pide una calle', () => {
    expect(lengthOfLine([A, B])).toBeCloseTo(111.3, 0);
  });

  it('suma los quiebres de la polilínea, no la recta entre extremos', () => {
    // An "L": measuring end to end would give less than the sum of the legs.
    const corner = { lat: -12.001, lng: -76.899 };
    const total = lengthOfLine([A, B, corner]);

    expect(total).toBeGreaterThan(lengthOfLine([A, corner]));
  });

  it('una línea de menos de dos puntos mide 0', () => {
    expect(lengthOfLine([])).toBe(0);
    expect(lengthOfLine([A])).toBe(0);
  });
});

describe('measuresOf', () => {
  it('devuelve la progresiva acumulada por vértice, arrancando en 0', () => {
    const measures = measuresOf([A, B]);

    expect(measures).toHaveLength(2);
    expect(measures[0]).toBe(0);
    expect(measures[1]).toBeCloseTo(111.3, 0);
  });
});

describe('pointAtMeasure', () => {
  it('interpola el punto a mitad del tramo', () => {
    const length = lengthOfLine([A, B]);
    const midpoint = pointAtMeasure([A, B], length / 2);

    expect(midpoint!.lat).toBeCloseTo(-12.0005, 6);
  });

  it('recorta fuera de rango en vez de devolver basura', () => {
    expect(pointAtMeasure([A, B], -50)).toEqual(A);
    expect(pointAtMeasure([A, B], 99999)).toEqual(B);
  });

  it('null si no hay línea', () => {
    expect(pointAtMeasure([], 10)).toBeNull();
  });
});

describe('sliceLine', () => {
  it('corta el sub-tramo entre dos progresivas', () => {
    // The cut is what allows painting "from 40 to 150" without redrawing.
    const length = lengthOfLine([A, B]);
    const piece = sliceLine([A, B], length * 0.25, length * 0.75);

    expect(lengthOfLine(piece)).toBeCloseTo(length / 2, 0);
    expect(piece[0].lat).toBeCloseTo(-12.00025, 6);
  });

  it('conserva los vértices intermedios que caen dentro del corte', () => {
    const midpoint = { lat: -12.0005, lng: -76.9 };
    const piece = sliceLine([A, midpoint, B], 20, 90);

    expect(piece.length).toBeGreaterThan(2);
  });

  it('un corte invertido o vacío devuelve lista vacía', () => {
    expect(sliceLine([A, B], 80, 20)).toEqual([]);
    expect(sliceLine([A, B], 50, 50)).toEqual([]);
  });
});

describe('projectToLine', () => {
  it('proyecta el punto GPS sobre el eje y da su progresiva', () => {
    // The engineer walks on the sidewalk: their point NEVER falls on the axis.
    const onSidewalk = { lat: -12.0005, lng: -76.90005 };
    const projection = projectToLine([A, B], onSidewalk)!;

    expect(projection.measureM).toBeCloseTo(55.6, 0);
    expect(projection.distanceM).toBeGreaterThan(0);
    expect(projection.distanceM).toBeLessThan(15);
  });

  it('un punto antes del inicio se ancla en la progresiva 0', () => {
    const behind = { lat: -11.999, lng: -76.9 };

    expect(projectToLine([A, B], behind)!.measureM).toBe(0);
  });

  it('un punto pasado el final se ancla en el largo total', () => {
    const ahead = { lat: -12.002, lng: -76.9 };
    const length = lengthOfLine([A, B]);

    expect(projectToLine([A, B], ahead)!.measureM).toBeCloseTo(length, 0);
  });

  it('null si no hay línea contra la cual proyectar', () => {
    expect(projectToLine([A], { lat: -12, lng: -76.9 })).toBeNull();
  });
});

describe('deriveTargetQuantity', () => {
  it('m² = largo × ancho de calzada', () => {
    expect(deriveTargetQuantity({ unit: 'm2', lengthM: 180, widthM: 6 })).toBe(1080);
  });

  it('acepta las variantes de unidad que escribe la gente', () => {
    expect(deriveTargetQuantity({ unit: 'M2', lengthM: 100, widthM: 5 })).toBe(500);
    expect(deriveTargetQuantity({ unit: 'm²', lengthM: 100, widthM: 5 })).toBe(500);
  });

  it('metro lineal ignora el ancho', () => {
    expect(deriveTargetQuantity({ unit: 'ml', lengthM: 180, widthM: 6 })).toBe(180);
    expect(deriveTargetQuantity({ unit: 'm', lengthM: 180 })).toBe(180);
  });

  it('m³ necesita espesor además del ancho', () => {
    expect(deriveTargetQuantity({ unit: 'm3', lengthM: 100, widthM: 6, thicknessM: 0.05 })).toBe(30);
    expect(deriveTargetQuantity({ unit: 'm3', lengthM: 100, widthM: 6 })).toBeNull();
  });

  it('SIN ancho no inventa una meta: devuelve null', () => {
    // Plan rule: the scope is left "without target" and the UI asks for it.
    expect(deriveTargetQuantity({ unit: 'm2', lengthM: 180 })).toBeNull();
    expect(deriveTargetQuantity({ unit: 'm2', lengthM: 180, widthM: 0 })).toBeNull();
  });

  it('una unidad que no es geométrica (glb, und) no se deriva', () => {
    expect(deriveTargetQuantity({ unit: 'glb', lengthM: 180, widthM: 6 })).toBeNull();
    expect(deriveTargetQuantity({ unit: '', lengthM: 180, widthM: 6 })).toBeNull();
  });
});
