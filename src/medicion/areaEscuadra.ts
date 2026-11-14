/**
 * A ESCUADRA mode (square corners): area of an ORTHOGONAL polygon from its
 * sides. PURE engine. It exists because of the Globofast incident (30/09/2026):
 * a hole of (3.30 + 4.10) × 0.65 = 4.81 m² came out as 9–20 m², because five
 * sides without diagonals do not determine the polygon, and the cyclic ceiling
 * was shown.
 *
 * Patches and holes are cut with a saw: corners at 90°. With that premise the
 * polygon IS determined by the lengths, plus the direction of each turn
 * (left/right/straight), which is read from the drawing on the photo.
 * Perspective distorts the angles but keeps two things: the turn direction
 * (with every point in front of the camera) and collinearity.
 *
 * It is a closed survey traverse:
 * 1. Walk it turning 90° as drawn (the doubtful vertex, corner or straight,
 *    is decided by the closure: every combination is tried).
 * 2. The CLOSURE ERROR (where it ends vs. where it started) measures quality:
 *    a mistyped length does not close; two different widths almost close.
 * 3. The error is spread per AXIS, in equal parts among that axis' sides
 *    (two widths → their average), so the figure stays orthogonal.
 * 4. Area by the shoelace formula over the adjusted plan.
 */

export type Giro = 'izquierda' | 'derecha' | 'recto';
export type EscuadraStatus = 'medida' | 'faltan-datos' | 'no-ortogonal' | 'no-cierra';

export interface PuntoPlano {
  x: number;
  y: number;
}

/** Closure error: in meters and as a fraction of the perimeter. */
export interface CierreEscuadra {
  distancia: number;
  relativo: number;
}

export interface AreaEscuadra {
  estado: EscuadraStatus;
  /** m². `null` unless the status is `medida`. */
  area: number | null;
  /** Turn at each vertex i (between side i-1 and side i). */
  giros: Giro[];
  cierre: CierreEscuadra | null;
  /** Rebuilt plan in meters, vertex 0 at the origin. Adjusted if it closed. */
  planta: PuntoPlano[] | null;
}

export interface EscuadraInput {
  /** Drawing points, in order, normalized 0..1 per axis. */
  points: Array<{ x: number; y: number }>;
  /** Length of side i (vertex i → i+1); the last one closes against vertex 0. */
  lados: Array<number | null | undefined>;
  /** Photo width/height: without it the drawing's angles come out distorted. */
  aspect?: number;
  /** Turn forced by the user at a vertex, overriding the drawing. */
  girosForzados?: Partial<Record<number, Giro>>;
}

/**
 * How much a side may TILT to absorb the closure error: sine of the angle. The
 * closure error on one axis is absorbed by the sides of the OTHER axis tilting:
 * a mismeasured length (7.40 vs 7.10) forces the 0.65 widths to tilt 27° and
 * the real area is 11 % smaller than the averaged one; two different widths
 * (0.65 vs 0.70) tilt the lengths 0.4° and the average is exact.
 * With sin θ ≤ 0.14, 1 − cos θ ≤ 1 %: the per-axis average stays within 1 %.
 */
export const INCLINACION_MAXIMA = 0.14;

/** Deviation from the straight line below which the vertex is a collinear break. */
const RECTO_MAX_RAD = (20 * Math.PI) / 180;
/** Deviation above which it is surely a corner. In between, the closure decides. */
const ESQUINA_MIN_RAD = (60 * Math.PI) / 180;
/** Doubtful vertices that get combined (2^n): beyond that they count as corners. */
const MAX_DUDOSOS = 10;
/** A simple orthogonal polygon makes exactly one turn: four net turns. */
const GIROS_NETOS_DE_UNA_VUELTA = 4;

const esMedidaValida = (valor: unknown): valor is number =>
  typeof valor === 'number' && Number.isFinite(valor) && valor > 0;

type Sentido = 'izquierda' | 'derecha';
interface GiroDibujado {
  sentido: Sentido;
  claridad: 'recto' | 'esquina' | 'dudoso';
}

/** Direction and clarity of each turn per the drawing (x scaled by the aspect). */
const clasificarGirosDibujados = (points: EscuadraInput['points'], aspect: number): GiroDibujado[] => {
  const n = points.length;
  return points.map((actual, i) => {
    const previo = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const ux = (actual.x - previo.x) * aspect;
    const uy = actual.y - previo.y;
    const vx = (next.x - actual.x) * aspect;
    const vy = next.y - actual.y;
    const cruz = ux * vy - uy * vx;
    const punto = ux * vx + uy * vy;
    // 0 = keeps straight, π = goes back the way it came.
    const desvio = Math.atan2(Math.abs(cruz), punto);
    const claridad = desvio < RECTO_MAX_RAD ? 'recto' : desvio > ESQUINA_MIN_RAD ? 'esquina' : 'dudoso';
    return { sentido: cruz >= 0 ? 'izquierda' : 'derecha', claridad };
  });
};

const girar = (rumbo: PuntoPlano, giro: Giro): PuntoPlano => {
  if (giro === 'izquierda') return { x: -rumbo.y, y: rumbo.x };
  if (giro === 'derecha') return { x: rumbo.y, y: -rumbo.x };
  return rumbo;
};

const girosNetos = (giros: Giro[]): number =>
  giros.reduce((suma, giro) => suma + (giro === 'izquierda' ? 1 : giro === 'derecha' ? -1 : 0), 0);

interface Poligonal {
  pasos: Array<{ rumbo: PuntoPlano; largo: number }>;
  cierre: PuntoPlano;
}

/** Walks the traverse from the origin heading +x; the turn at vertex 0 is not applied. */
const recorrer = (lados: number[], giros: Giro[]): Poligonal => {
  let rumbo: PuntoPlano = { x: 1, y: 0 };
  const steps = lados.map((largo, i) => {
    if (i > 0) rumbo = girar(rumbo, giros[i]);
    return { rumbo, largo };
  });
  const cierre = steps.reduce(
    (fin, paso) => ({ x: fin.x + paso.rumbo.x * paso.largo, y: fin.y + paso.rumbo.y * paso.largo }),
    { x: 0, y: 0 }
  );
  return { pasos: steps, cierre };
};

const planFromSteps = (steps: Array<{ dx: number; dy: number }>): PuntoPlano[] => {
  const planta: PuntoPlano[] = [{ x: 0, y: 0 }];
  steps.forEach((paso) => {
    const previo = planta[planta.length - 1];
    planta.push({ x: previo.x + paso.dx, y: previo.y + paso.dy });
  });
  return planta.slice(0, -1);
};

/** Spreads the closure per axis, in equal parts among that axis' sides. */
const adjustPerAxis = (poligonal: Poligonal): PuntoPlano[] => {
  const horizontales = poligonal.pasos.filter((paso) => paso.rumbo.x !== 0).length;
  const verticales = poligonal.pasos.length - horizontales;
  return planFromSteps(
    poligonal.pasos.map((paso) => ({
      dx: paso.rumbo.x * paso.largo - (paso.rumbo.x !== 0 && horizontales > 0 ? poligonal.cierre.x / horizontales : 0),
      dy: paso.rumbo.y * paso.largo - (paso.rumbo.y !== 0 && verticales > 0 ? poligonal.cierre.y / verticales : 0),
    }))
  );
};

const areaZapatero = (planta: PuntoPlano[]): number =>
  Math.abs(
    planta.reduce((suma, actual, i) => {
      const next = planta[(i + 1) % planta.length];
      return suma + actual.x * next.y - next.x * actual.y;
    }, 0) / 2
  );

/** Every corner/straight assignment for the doubtful vertices. */
const candidatos = (dibujados: GiroDibujado[], forzados: Partial<Record<number, Giro>>): Giro[][] => {
  const dudosos = dibujados
    .map((giro, i) => (forzados[i] === undefined && giro.claridad === 'dudoso' ? i : -1))
    .filter((i) => i >= 0)
    .slice(0, MAX_DUDOSOS);
  const base: Giro[] = dibujados.map((giro, i) => forzados[i] ?? (giro.claridad === 'recto' ? 'recto' : giro.sentido));
  return Array.from({ length: 2 ** dudosos.length }, (_, mascara) =>
    base.map((giro, i) => {
      const bit = dudosos.indexOf(i);
      return bit >= 0 && (mascara >> bit) & 1 ? 'recto' : giro;
    })
  );
};

export const areaEscuadra = (entrada: EscuadraInput): AreaEscuadra => {
  const { points, lados, aspect = 1, girosForzados = {} } = entrada;
  const empty = { area: null, cierre: null, planta: null };
  if (points.length !== lados.length || !lados.every(esMedidaValida)) {
    return { estado: 'faltan-datos', giros: [], ...empty };
  }
  const ladosOk = lados as number[];
  const dibujados = clasificarGirosDibujados(points, aspect);
  const girosDibujo = dibujados.map((giro, i) => girosForzados[i] ?? (giro.claridad === 'recto' ? 'recto' : giro.sentido));
  if (points.length < 4) return { estado: 'no-ortogonal', giros: girosDibujo, ...empty };

  let mejor: { giros: Giro[]; poligonal: Poligonal } | null = null;
  for (const giros of candidatos(dibujados, girosForzados)) {
    if (Math.abs(girosNetos(giros)) !== GIROS_NETOS_DE_UNA_VUELTA) continue;
    const poligonal = recorrer(ladosOk, giros);
    if (!mejor || Math.hypot(poligonal.cierre.x, poligonal.cierre.y) < Math.hypot(mejor.poligonal.cierre.x, mejor.poligonal.cierre.y)) {
      mejor = { giros, poligonal };
    }
  }
  if (!mejor) return { estado: 'no-ortogonal', giros: girosDibujo, ...empty };

  const perimetro = ladosOk.reduce((suma, lado) => suma + lado, 0);
  const distancia = Math.hypot(mejor.poligonal.cierre.x, mejor.poligonal.cierre.y);
  const cierre = { distancia, relativo: distancia / perimetro };
  const largoHorizontal = mejor.poligonal.pasos.filter((paso) => paso.rumbo.x !== 0).reduce((suma, paso) => suma + paso.largo, 0);
  const largoVertical = perimetro - largoHorizontal;
  if (largoHorizontal === 0 || largoVertical === 0) return { estado: 'no-ortogonal', giros: mejor.giros, ...empty };
  // The closure in x is absorbed by the vertical sides, and vice versa.
  const inclinacion = Math.max(
    Math.abs(mejor.poligonal.cierre.x) / largoVertical,
    Math.abs(mejor.poligonal.cierre.y) / largoHorizontal
  );
  if (inclinacion > INCLINACION_MAXIMA) {
    const planta = planFromSteps(mejor.poligonal.pasos.map((paso) => ({ dx: paso.rumbo.x * paso.largo, dy: paso.rumbo.y * paso.largo })));
    return { estado: 'no-cierra', area: null, giros: mejor.giros, cierre, planta };
  }
  const planta = adjustPerAxis(mejor.poligonal);
  return { estado: 'medida', area: areaZapatero(planta), giros: mejor.giros, cierre, planta };
};

const CM_PER_M = 100;
const PCT = 100;

/** What the panel tells the operator about the a escuadra mode. `null` = nothing to say. */
export const describirEscuadra = (escuadra: AreaEscuadra | null): { tono: 'ok' | 'alerta'; texto: string } | null => {
  if (!escuadra) return null;
  const cm = (m: number) => Math.round(m * CM_PER_M);
  const pct = (fraccion: number) => (fraccion * PCT).toFixed(1);
  switch (escuadra.estado) {
    case 'medida':
      return {
        tono: 'ok',
        texto: escuadra.cierre && escuadra.cierre.distancia >= 0.005
          ? `Esquinas a 90°: área exacta. Cierre ${cm(escuadra.cierre.distancia)} cm (${pct(escuadra.cierre.relativo)} %), repartido.`
          : 'Esquinas a 90°: área exacta. Cierre perfecto.',
      };
    case 'no-cierra':
      return {
        tono: 'alerta',
        texto: `No cierra: sobran ${cm(escuadra.cierre?.distancia ?? 0)} cm (${pct(escuadra.cierre?.relativo ?? 0)} % del perímetro). Revisa un largo, o la figura no es a escuadra.`,
      };
    case 'no-ortogonal':
      return { tono: 'alerta', texto: 'Los giros del dibujo no arman una figura a escuadra: cada esquina de 90° y los quiebres rectos.' };
    default:
      return { tono: 'alerta', texto: 'Faltan largos: carga todos los lados para el modo a escuadra.' };
  }
};
