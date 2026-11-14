/**
 * Modo A ESCUADRA (José, 30/09/2026, tras el incidente Globofast).
 *
 * Bacheos y huecos se cortan con sierra: esquinas a 90°. Un polígono
 * ortogonal queda DETERMINADO por sus lados más el sentido de cada giro — y el
 * sentido lo da el dibujo sobre la foto (la perspectiva deforma los ángulos,
 * pero no invierte izquierda/derecha ni rompe la colinealidad). Así el hueco de
 * Globofast, (3.30 + 4.10) × 0.65, sale exacto sin diagonales.
 *
 * El motor es una poligonal cerrada de topografía: se recorre girando 90°, se
 * mide el ERROR DE CIERRE, se reparte por eje (para que siga siendo ortogonal)
 * y el área sale por la fórmula del zapatero. Un cierre malo es la señal de
 * que un largo está mal tipeado, o de que la figura no era a escuadra.
 */
import { areaEscuadra } from './areaEscuadra';

const p = (x: number, y: number) => ({ x, y });

// Rectángulo 7.40 × 0.65 visto desde arriba.
const rectangulo = {
  points: [p(0.2, 0.2), p(0.8, 0.2), p(0.8, 0.4), p(0.2, 0.4)],
  lados: [7.4, 0.65, 7.4, 0.65],
};

// La franja de Globofast: el lado largo de abajo tiene un quiebre COLINEAL en
// c (3.30 + 4.10); el de arriba es un solo tramo de 7.40.
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
    // Planta (m): (0,0) (4,0) (4,3) (2,3) (2,1) (0,1). Área 4×1 + 2×2 = 8.
    const r = areaEscuadra({
      points: [p(0.1, 0.1), p(0.5, 0.1), p(0.5, 0.4), p(0.3, 0.4), p(0.3, 0.2), p(0.1, 0.2)],
      lados: [4, 3, 2, 2, 2, 1],
    });

    expect(r.estado).toBe('medida');
    expect(r.area).toBeCloseTo(8, 4);
    // Cinco giros al mismo lado y uno al contrario: la esquina entrante de la L.
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
    // Foto en ángulo: el borde cercano se ve más ancho. Las esquinas se dibujan
    // a ~70° y ~110°, pero son cuatro giros al mismo lado.
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
    // El ancho se midió 0.65 en un extremo y 0.70 en el otro: el hueco no es
    // perfecto. Ajuste por eje = ancho medio 0.675, largo medio 7.39.
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
    // Promediar daría 7.25 × 0.65 = 4.71; el trapecio real mide 4.18: 11 % de más.
    const r = areaEscuadra({ ...rectangulo, lados: [7.4, 0.65, 7.1, 0.65] });

    expect(r.estado).toBe('no-cierra');
  });

  it('…pero 5 cm entre dos anchos sí cierra: los largos se inclinan 0.4° y el promedio es exacto', () => {
    const r = areaEscuadra({ ...rectangulo, lados: [7.4, 0.65, 7.4, 0.7] });

    expect(r.estado).toBe('medida');
    expect(r.area).toBeCloseTo(0.675 * 7.4, 4);
  });

  it('un vértice dudoso en el dibujo (¿esquina o recto?) lo decide el cierre', () => {
    // c dibujado 26° fuera de la línea b–d: como esquina el polígono no cierra
    // (cinco giros de 90° no suman una vuelta); como recto, cierra exacto.
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
    const conEsquina = {
      ...franjaGlobofast,
      points: [p(0.2, 0.2), p(0.2, 0.4), p(0.5, 0.2), p(0.8, 0.4), p(0.8, 0.2)],
    };

    expect(areaEscuadra(conEsquina).estado).toBe('no-ortogonal');
    const forzado = areaEscuadra({ ...conEsquina, girosForzados: { 2: 'recto' } });
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
