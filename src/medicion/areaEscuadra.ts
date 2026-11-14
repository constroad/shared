/**
 * Modo A ESCUADRA: área de un polígono ORTOGONAL a partir de sus lados. Motor
 * PURO. Existe por el incidente Globofast (30/09/2026): un hueco de
 * (3.30 + 4.10) × 0.65 = 4.81 m² salía 9–20 m² porque cinco lados sin
 * diagonales no determinan el polígono, y se mostraba el techo cíclico.
 *
 * Bacheos y huecos se cortan con sierra: esquinas a 90°. Con esa premisa el
 * polígono SÍ queda determinado por los largos, más el sentido de cada giro
 * (izquierda/derecha/recto), que se lee del dibujo sobre la foto. La
 * perspectiva deforma los ángulos pero conserva dos cosas: el sentido de giro
 * (con todos los puntos delante de la cámara) y la colinealidad.
 *
 * Es una poligonal cerrada de topografía:
 * 1. Se recorre girando 90° según el dibujo (el vértice dudoso —¿esquina o
 *    recto?— lo decide el cierre: se prueban las combinaciones).
 * 2. El ERROR DE CIERRE (dónde termina vs. dónde empezó) mide la calidad: un
 *    largo mal tipeado no cierra; dos anchos distintos cierran casi.
 * 3. El error se reparte por EJE, en partes iguales entre los lados de ese eje
 *    (dos anchos → su promedio), para que la figura siga siendo ortogonal.
 * 4. Área por la fórmula del zapatero sobre la planta ajustada.
 */

export type Giro = 'izquierda' | 'derecha' | 'recto';
export type EstadoEscuadra = 'medida' | 'faltan-datos' | 'no-ortogonal' | 'no-cierra';

export interface PuntoPlano {
  x: number;
  y: number;
}

/** Error de cierre: en metros y como fracción del perímetro. */
export interface CierreEscuadra {
  distancia: number;
  relativo: number;
}

export interface AreaEscuadra {
  estado: EstadoEscuadra;
  /** m². `null` salvo que el estado sea `medida`. */
  area: number | null;
  /** Giro en cada vértice i (entre el lado i-1 y el lado i). */
  giros: Giro[];
  cierre: CierreEscuadra | null;
  /** Planta reconstruida en metros, vértice 0 en el origen. Ajustada si cerró. */
  planta: PuntoPlano[] | null;
}

export interface EntradaEscuadra {
  /** Puntos del dibujo, en orden, normalizados 0..1 por eje. */
  points: Array<{ x: number; y: number }>;
  /** Largo del lado i (vértice i → i+1); el último cierra contra el vértice 0. */
  lados: Array<number | null | undefined>;
  /** Ancho/alto de la foto: sin él los ángulos del dibujo salen deformados. */
  aspect?: number;
  /** Giro impuesto por el usuario en un vértice, por encima del dibujo. */
  girosForzados?: Partial<Record<number, Giro>>;
}

/**
 * Cuánto puede INCLINARSE un lado para absorber el error de cierre: seno del
 * ángulo. El error de cierre en un eje lo absorben, inclinándose, los lados del
 * OTRO eje: un largo mal medido (7.40 vs 7.10) obliga a los anchos de 0.65 a
 * inclinarse 27° y el área real es 11 % menor que la promediada; dos anchos
 * distintos (0.65 vs 0.70) inclinan los largos 0.4° y el promedio es exacto.
 * Con sin θ ≤ 0.14, 1 − cos θ ≤ 1 %: el promedio por eje entra en el 1 %.
 */
export const INCLINACION_MAXIMA = 0.14;

/** Desvío respecto de la recta por debajo del cual el vértice es un quiebre colineal. */
const RECTO_MAX_RAD = (20 * Math.PI) / 180;
/** Desvío por encima del cual es una esquina sin duda. Entre ambos, lo decide el cierre. */
const ESQUINA_MIN_RAD = (60 * Math.PI) / 180;
/** Vértices dudosos que se combinan (2^n): más allá se toman como esquina. */
const MAX_DUDOSOS = 10;
/** Un polígono simple ortogonal da exactamente una vuelta: cuatro giros netos. */
const GIROS_NETOS_DE_UNA_VUELTA = 4;

const esMedidaValida = (valor: unknown): valor is number =>
  typeof valor === 'number' && Number.isFinite(valor) && valor > 0;

type Sentido = 'izquierda' | 'derecha';
interface GiroDibujado {
  sentido: Sentido;
  claridad: 'recto' | 'esquina' | 'dudoso';
}

/** Sentido y claridad de cada giro según el dibujo (x escalado por el aspecto). */
const clasificarGirosDibujados = (points: EntradaEscuadra['points'], aspect: number): GiroDibujado[] => {
  const n = points.length;
  return points.map((actual, i) => {
    const previo = points[(i - 1 + n) % n];
    const siguiente = points[(i + 1) % n];
    const ux = (actual.x - previo.x) * aspect;
    const uy = actual.y - previo.y;
    const vx = (siguiente.x - actual.x) * aspect;
    const vy = siguiente.y - actual.y;
    const cruz = ux * vy - uy * vx;
    const punto = ux * vx + uy * vy;
    // 0 = sigue derecho, π = vuelve sobre sus pasos.
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

/** Recorre la poligonal desde el origen con rumbo +x; el giro del vértice 0 no se aplica. */
const recorrer = (lados: number[], giros: Giro[]): Poligonal => {
  let rumbo: PuntoPlano = { x: 1, y: 0 };
  const pasos = lados.map((largo, i) => {
    if (i > 0) rumbo = girar(rumbo, giros[i]);
    return { rumbo, largo };
  });
  const cierre = pasos.reduce(
    (fin, paso) => ({ x: fin.x + paso.rumbo.x * paso.largo, y: fin.y + paso.rumbo.y * paso.largo }),
    { x: 0, y: 0 }
  );
  return { pasos, cierre };
};

const plantaDesde = (pasos: Array<{ dx: number; dy: number }>): PuntoPlano[] => {
  const planta: PuntoPlano[] = [{ x: 0, y: 0 }];
  pasos.forEach((paso) => {
    const previo = planta[planta.length - 1];
    planta.push({ x: previo.x + paso.dx, y: previo.y + paso.dy });
  });
  return planta.slice(0, -1);
};

/** Reparte el cierre por eje, en partes iguales entre los lados de ese eje. */
const ajustarPorEje = (poligonal: Poligonal): PuntoPlano[] => {
  const horizontales = poligonal.pasos.filter((paso) => paso.rumbo.x !== 0).length;
  const verticales = poligonal.pasos.length - horizontales;
  return plantaDesde(
    poligonal.pasos.map((paso) => ({
      dx: paso.rumbo.x * paso.largo - (paso.rumbo.x !== 0 && horizontales > 0 ? poligonal.cierre.x / horizontales : 0),
      dy: paso.rumbo.y * paso.largo - (paso.rumbo.y !== 0 && verticales > 0 ? poligonal.cierre.y / verticales : 0),
    }))
  );
};

const areaZapatero = (planta: PuntoPlano[]): number =>
  Math.abs(
    planta.reduce((suma, actual, i) => {
      const siguiente = planta[(i + 1) % planta.length];
      return suma + actual.x * siguiente.y - siguiente.x * actual.y;
    }, 0) / 2
  );

/** Todas las asignaciones esquina/recto para los vértices dudosos. */
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

export const areaEscuadra = (entrada: EntradaEscuadra): AreaEscuadra => {
  const { points, lados, aspect = 1, girosForzados = {} } = entrada;
  const vacio = { area: null, cierre: null, planta: null };
  if (points.length !== lados.length || !lados.every(esMedidaValida)) {
    return { estado: 'faltan-datos', giros: [], ...vacio };
  }
  const ladosOk = lados as number[];
  const dibujados = clasificarGirosDibujados(points, aspect);
  const girosDibujo = dibujados.map((giro, i) => girosForzados[i] ?? (giro.claridad === 'recto' ? 'recto' : giro.sentido));
  if (points.length < 4) return { estado: 'no-ortogonal', giros: girosDibujo, ...vacio };

  let mejor: { giros: Giro[]; poligonal: Poligonal } | null = null;
  for (const giros of candidatos(dibujados, girosForzados)) {
    if (Math.abs(girosNetos(giros)) !== GIROS_NETOS_DE_UNA_VUELTA) continue;
    const poligonal = recorrer(ladosOk, giros);
    if (!mejor || Math.hypot(poligonal.cierre.x, poligonal.cierre.y) < Math.hypot(mejor.poligonal.cierre.x, mejor.poligonal.cierre.y)) {
      mejor = { giros, poligonal };
    }
  }
  if (!mejor) return { estado: 'no-ortogonal', giros: girosDibujo, ...vacio };

  const perimetro = ladosOk.reduce((suma, lado) => suma + lado, 0);
  const distancia = Math.hypot(mejor.poligonal.cierre.x, mejor.poligonal.cierre.y);
  const cierre = { distancia, relativo: distancia / perimetro };
  const largoHorizontal = mejor.poligonal.pasos.filter((paso) => paso.rumbo.x !== 0).reduce((suma, paso) => suma + paso.largo, 0);
  const largoVertical = perimetro - largoHorizontal;
  if (largoHorizontal === 0 || largoVertical === 0) return { estado: 'no-ortogonal', giros: mejor.giros, ...vacio };
  // El cierre en x lo absorben los lados verticales, y viceversa.
  const inclinacion = Math.max(
    Math.abs(mejor.poligonal.cierre.x) / largoVertical,
    Math.abs(mejor.poligonal.cierre.y) / largoHorizontal
  );
  if (inclinacion > INCLINACION_MAXIMA) {
    const planta = plantaDesde(mejor.poligonal.pasos.map((paso) => ({ dx: paso.rumbo.x * paso.largo, dy: paso.rumbo.y * paso.largo })));
    return { estado: 'no-cierra', area: null, giros: mejor.giros, cierre, planta };
  }
  const planta = ajustarPorEje(mejor.poligonal);
  return { estado: 'medida', area: areaZapatero(planta), giros: mejor.giros, cierre, planta };
};

const CM_POR_M = 100;
const PCT = 100;

/** Qué le dice el panel al operador sobre el modo a escuadra. `null` = nada que decir. */
export const describirEscuadra = (escuadra: AreaEscuadra | null): { tono: 'ok' | 'alerta'; texto: string } | null => {
  if (!escuadra) return null;
  const cm = (m: number) => Math.round(m * CM_POR_M);
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
