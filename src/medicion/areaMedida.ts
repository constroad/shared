/**
 * Área de un polígono a partir de los largos MEDIDOS con wincha. Motor PURO.
 *
 * **Existe porque el área de la foto era imprecisa por construcción
 * (01/09/2026).** El método anterior saca una ÚNICA escala promedio (metros por
 * píxel) y la aplica a toda la imagen. Eso sólo vale si la superficie está
 * paralela al sensor: los bacheos se fotografían en ángulo contra el pavimento y
 * en perspectiva el borde cercano tiene muchos más píxeles por metro que el
 * lejano. Ninguna escala única corrige eso.
 *
 * **Por qué NO alcanza una homografía.** Es lo primero que uno prueba, y no
 * cierra: una homografía queda determinada por 4 correspondencias, así que las
 * 4 esquinas marcadas en la foto encajan con CUALQUIER cuadrilátero del piso —
 * no aporta ninguna restricción nueva. El problema no es la proyección sino la
 * geometría: **cuatro lados no determinan un cuadrilátero**. Es articulado, como
 * una tijera; un triángulo sí queda determinado por sus tres lados. Falta un
 * dato, y con la wincha en la mano ese dato cuesta cinco segundos: la DIAGONAL.
 *
 * Con las diagonales el polígono se parte en triángulos y el área sale por
 * Herón: **exacta, sin perspectiva y sin cámara**. La foto queda para lo que
 * sirve — mostrar dónde y qué forma tenía.
 */

export type EstadoAreaMedida = 'medida' | 'faltan-datos' | 'incoherente';

export type AreaMedida = {
  estado: EstadoAreaMedida;
  /** m². `null` salvo que el estado sea `medida`. */
  area: number | null;
};

const FALTAN: AreaMedida = { estado: 'faltan-datos', area: null };
const INCOHERENTE: AreaMedida = { estado: 'incoherente', area: null };

/**
 * Cuántas diagonales hacen falta para triangular un polígono de `n` lados.
 *
 * Un abanico desde el primer vértice lo parte en `n-2` triángulos y necesita
 * `n-3` diagonales: el triángulo ninguna, el cuadrilátero una.
 */
export const diagonalesNecesarias = (lados: number): number | null =>
  lados >= 3 ? lados - 3 : null;

const esMedidaValida = (valor: unknown): valor is number =>
  typeof valor === 'number' && Number.isFinite(valor) && valor > 0;

/**
 * Herón en su forma numéricamente estable (Kahan): con lados muy dispares, la
 * fórmula del semiperímetro pierde precisión y puede dar la raíz de un negativo
 * por redondeo en un triángulo que sí es válido.
 */
const areaTriangulo = (ladoA: number, ladoB: number, ladoC: number): number | null => {
  const [c, b, a] = [ladoA, ladoB, ladoC].sort((x, y) => x - y);
  // Desigualdad triangular: si el lado mayor supera a los otros dos juntos, esos
  // tres largos no cierran ningún triángulo.
  if (c - (a - b) <= 0) return null;
  const producto = (a + (b + c)) * (c - (a - b)) * (c + (a - b)) * (a + (b - c));
  return producto <= 0 ? null : Math.sqrt(producto) / 4;
};

/**
 * Área por triangulación en abanico desde el primer vértice.
 *
 * `lados[i]` = largo del lado que va del vértice `i` al `i+1` (el último cierra
 * contra el primero). `diagonales[k]` = largo del vértice 0 al vértice `k+2`.
 *
 * Devuelve `incoherente` —y no un número— cuando los largos no cierran ningún
 * triángulo. Un área plausible sacada de medidas imposibles es peor que ninguna:
 * es exactamente el modo de falla del que venimos.
 */
/**
 * Área MÁXIMA que pueden encerrar esos lados: **el techo geométrico**.
 *
 * **Existe por el 05/09/2026.** Una foto de un estacionamiento con lados
 * 9.05 / 52.70 / 2.70 / 46.40 mostró «S = 745.00 m²» y «V = 73.76 m³». Con esos
 * cuatro lados NINGÚN cuadrilátero llega a 246 m²: el número era imposible, no
 * impreciso, y ese metrado se suma al cuadro del informe de área adicional. Lo
 * había producido la estimación por cámara, que en una foto en perspectiva mide
 * escalas que difieren 42× entre el lado cercano y el lejano.
 *
 * Entre todos los polígonos con los mismos lados, **el de área máxima es el
 * cíclico** (el que se inscribe en una circunferencia) — para n=4 es
 * Brahmagupta. Como los lados salen de la wincha y no de la cámara, este techo
 * es un hecho medido: cualquier área por encima está mal, venga de donde venga.
 *
 * `null` si falta algún lado o si los largos no cierran ningún polígono (el
 * mayor ≥ la suma de los otros).
 */
export const areaMaximaPorLados = (lados: Array<number | null | undefined>): number | null => {
  if (lados.length < 3 || !lados.every(esMedidaValida)) return null;
  const ls = lados as number[];

  const iMayor = ls.reduce((mejor, lado, i) => (lado > ls[mejor] ? i : mejor), 0);
  const mayor = ls[iMayor];
  const resto = ls.reduce((suma, lado) => suma + lado, 0) - mayor;
  // Desigualdad poligonal: sin ella no hay polígono, y por lo tanto no hay techo.
  if (mayor >= resto) return null;

  if (ls.length === 3) return areaTriangulo(ls[0], ls[1], ls[2]);

  // Ángulo central que subtiende un lado en la circunferencia de radio R.
  const angulo = (lado: number, radio: number) => 2 * Math.asin(Math.min(1, lado / (2 * radio)));

  // El radio se despeja numéricamente: los ángulos centrales tienen que sumar
  // una vuelta. Si con el radio mínimo ya no llegan a 2π, el centro cae FUERA
  // del polígono y el lado mayor pasa a restar en vez de sumar.
  const radioMinimo = mayor / 2;
  const centroFuera = ls.reduce((suma, lado) => suma + angulo(lado, radioMinimo), 0) < 2 * Math.PI;
  const desbalance = centroFuera
    ? (radio: number) =>
        2 * angulo(mayor, radio) - ls.reduce((suma, lado) => suma + angulo(lado, radio), 0)
    : (radio: number) => ls.reduce((suma, lado) => suma + angulo(lado, radio), 0) - 2 * Math.PI;

  // `desbalance` es positivo en el radio mínimo y negativo en el perímetro:
  // bisección sobre ese intervalo. 200 pasos son gratis y dejan el radio exacto
  // hasta el último bit del double.
  let bajo = radioMinimo;
  let alto = ls.reduce((suma, lado) => suma + lado, 0);
  for (let paso = 0; paso < 200; paso += 1) {
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

export const areaPorTriangulacion = (
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

  // Abanico: el triángulo k usa el lado k, la diagonal que entra y la que sale.
  // La primera "diagonal que entra" es el lado 0; la última "que sale" es el
  // último lado, el que cierra el polígono contra el vértice inicial.
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
