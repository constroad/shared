/**
 * Area of a polygon from the lengths MEASURED with a tape. PURE engine.
 *
 * **It exists because the photo area was imprecise by construction
 * (01/09/2026).** The previous method derives a SINGLE average scale (meters per
 * pixel) and applies it to the whole image. That only holds if the surface is
 * parallel to the sensor: patches are photographed at an angle to the pavement,
 * and in perspective the near edge has far more pixels per meter than the far
 * one. No single scale fixes that.
 *
 * **Why a homography is NOT enough.** It is the first thing one tries, and it
 * does not work: a homography is determined by 4 correspondences, so the 4
 * corners marked on the photo fit ANY quadrilateral on the floor; it adds no
 * new constraint. The problem is not the projection but the geometry: **four
 * sides do not determine a quadrilateral**. It is hinged, like scissors; a
 * triangle IS determined by its three sides. One datum is missing, and with the
 * tape in hand it costs five seconds: the DIAGONAL.
 *
 * With the diagonals the polygon splits into triangles and the area comes from
 * Heron: **exact, with no perspective and no camera**. The photo is left for
 * what it is good at: showing where it was and what shape it had.
 */

export type MeasuredAreaStatus = 'medida' | 'faltan-datos' | 'incoherente';

export type AreaMedida = {
  estado: MeasuredAreaStatus;
  /** m². `null` unless the status is `medida`. */
  area: number | null;
};

const FALTAN: AreaMedida = { estado: 'faltan-datos', area: null };
const INCOHERENTE: AreaMedida = { estado: 'incoherente', area: null };
/** Bisection steps for the circumradius: enough to reach the last bit of a double. */
const BISECTION_STEPS = 200;

/**
 * How many diagonals it takes to triangulate a polygon with `n` sides.
 *
 * A fan from the first vertex splits it into `n-2` triangles and needs `n-3`
 * diagonals: none for a triangle, one for a quadrilateral.
 */
export const diagonalesNecesarias = (lados: number): number | null =>
  lados >= 3 ? lados - 3 : null;

const esMedidaValida = (valor: unknown): valor is number =>
  typeof valor === 'number' && Number.isFinite(valor) && valor > 0;

/**
 * Heron in its numerically stable form (Kahan): with very uneven sides, the
 * semiperimeter formula loses precision and, through rounding, can take the
 * square root of a negative on a triangle that is valid.
 */
const areaTriangulo = (ladoA: number, ladoB: number, ladoC: number): number | null => {
  const [c, b, a] = [ladoA, ladoB, ladoC].sort((x, y) => x - y);
  // Triangle inequality: if the longest side exceeds the other two together,
  // those three lengths close no triangle.
  if (c - (a - b) <= 0) return null;
  const producto = (a + (b + c)) * (c - (a - b)) * (c + (a - b)) * (a + (b - c));
  return producto <= 0 ? null : Math.sqrt(producto) / 4;
};

/**
 * MAXIMUM area those sides can enclose: **the geometric ceiling**.
 *
 * **It exists because of 05/09/2026.** A photo of a parking lot with sides
 * 9.05 / 52.70 / 2.70 / 46.40 showed «S = 745.00 m²» and «V = 73.76 m³». With
 * those four sides NO quadrilateral reaches 246 m²: the number was impossible,
 * not imprecise, and that quantity is added to the table of the additional area
 * report. It came from the camera estimate, which on a perspective photo
 * measures scales that differ 42× between the near and the far side.
 *
 * Among all polygons with the same sides, **the one with the largest area is
 * the cyclic one** (inscribed in a circle); for n=4 it is Brahmagupta. Since the
 * sides come from the tape and not from the camera, this ceiling is a measured
 * fact: any area above it is wrong, wherever it comes from.
 *
 * `null` if a side is missing or if the lengths close no polygon (the longest
 * ≥ the sum of the others).
 */
export const maxAreaFromSides = (lados: Array<number | null | undefined>): number | null => {
  if (lados.length < 3 || !lados.every(esMedidaValida)) return null;
  const ls = lados as number[];

  const iMayor = ls.reduce((mejor, lado, i) => (lado > ls[mejor] ? i : mejor), 0);
  const mayor = ls[iMayor];
  const resto = ls.reduce((suma, lado) => suma + lado, 0) - mayor;
  // Polygon inequality: without it there is no polygon, and so no ceiling.
  if (mayor >= resto) return null;

  if (ls.length === 3) return areaTriangulo(ls[0], ls[1], ls[2]);

  // Central angle a side subtends on the circle of radius R.
  const angulo = (lado: number, radio: number) => 2 * Math.asin(Math.min(1, lado / (2 * radio)));

  // The radius is solved numerically: the central angles must add up to one
  // revolution. If at the minimum radius they already fall short of 2π, the
  // center lies OUTSIDE the polygon and the longest side subtracts instead of adding.
  const minRadius = mayor / 2;
  const centroFuera = ls.reduce((suma, lado) => suma + angulo(lado, minRadius), 0) < 2 * Math.PI;
  const desbalance = centroFuera
    ? (radio: number) =>
        2 * angulo(mayor, radio) - ls.reduce((suma, lado) => suma + angulo(lado, radio), 0)
    : (radio: number) => ls.reduce((suma, lado) => suma + angulo(lado, radio), 0) - 2 * Math.PI;

  // `desbalance` is positive at the minimum radius and negative at the
  // perimeter: bisection over that interval. 200 steps are free and leave the
  // radius exact down to the last bit of the double.
  let bajo = minRadius;
  let alto = ls.reduce((suma, lado) => suma + lado, 0);
  for (let step = 0; step < BISECTION_STEPS; step += 1) {
    const medio = (bajo + alto) / 2;
    if (desbalance(medio) > 0) bajo = medio;
    else alto = medio;
  }
  const radio = (bajo + alto) / 2;

  const area = ls.reduce((suma, lado, i) => {
    const triangulo = (radio * radio * Math.sin(angulo(lado, radio))) / 2;
    return suma + (centroFuera && i === iMayor ? -triangulo : triangulo);
  }, 0);

  return Number.isFinite(area) && area > 0 ? area : null;
};

/**
 * Area by fan triangulation from the first vertex.
 *
 * `lados[i]` = length of the side from vertex `i` to `i+1` (the last one closes
 * against the first). `diagonales[k]` = length from vertex 0 to vertex `k+2`.
 *
 * Returns `incoherente`, not a number, when the lengths close no triangle. A
 * plausible area drawn from impossible measurements is worse than none: it is
 * exactly the failure mode we came from.
 */
export const areaByTriangulation = (
  lados: Array<number | null | undefined>,
  diagonales: Array<number | null | undefined>
): AreaMedida => {
  const n = lados.length;
  const necesarias = diagonalesNecesarias(n);
  if (necesarias === null) return FALTAN;
  if (!lados.every(esMedidaValida)) return FALTAN;
  if (diagonales.length < necesarias) return FALTAN;

  const diagonalesUsadas = diagonales.slice(0, necesarias);
  if (!diagonalesUsadas.every(esMedidaValida)) return FALTAN;

  const ladosOk = lados as number[];
  const diagOk = diagonalesUsadas as number[];

  // Fan: triangle k uses side k, the incoming diagonal and the outgoing one.
  // The first "incoming diagonal" is side 0; the last "outgoing" one is the
  // last side, the one that closes the polygon against the starting vertex.
  let total = 0;
  for (let k = 0; k < n - 2; k += 1) {
    const entra = k === 0 ? ladosOk[0] : diagOk[k - 1];
    const sale = k === n - 3 ? ladosOk[n - 1] : diagOk[k];
    const area = areaTriangulo(entra, ladosOk[k + 1], sale);
    if (area === null) return INCOHERENTE;
    total += area;
  }

  return { estado: 'medida', area: total };
};
