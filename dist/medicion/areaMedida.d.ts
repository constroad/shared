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
/**
 * How many diagonals it takes to triangulate a polygon with `n` sides.
 *
 * A fan from the first vertex splits it into `n-2` triangles and needs `n-3`
 * diagonals: none for a triangle, one for a quadrilateral.
 */
export declare const diagonalesNecesarias: (lados: number) => number | null;
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
export declare const maxAreaFromSides: (lados: Array<number | null | undefined>) => number | null;
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
export declare const areaByTriangulation: (lados: Array<number | null | undefined>, diagonales: Array<number | null | undefined>) => AreaMedida;
