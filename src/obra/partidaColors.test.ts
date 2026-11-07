import { NO_PARTIDA_COLOR, colorForPartida, legendForStreets } from './partidaColors';

/**
 * The map's color is site language: the Civil 3D drawing already uses brown
 * for base and black for asphalt. If the color does not match what the
 * engineer expects, the map can no longer be read at a glance.
 */

describe('colorForPartida', () => {
  it('respeta el color convencional del tratamiento', () => {
    expect(colorForPartida('p1', 'Base granular e=0.30')).toBe(colorForPartida('p9', 'BASE'));
    expect(colorForPartida('p1', 'Imprimación asfáltica')).not.toBe(
      colorForPartida('p2', 'Carpeta asfáltica')
    );
  });

  it('reconoce el tratamiento sin importar mayúsculas ni tildes', () => {
    const withAccent = colorForPartida('p1', 'Imprimación asfáltica');
    const withoutAccent = colorForPartida('p2', 'IMPRIMACION ASFALTICA');

    expect(withoutAccent).toBe(withAccent);
  });

  it('una partida desconocida siempre recibe el MISMO color', () => {
    // If the color shifted between renders, the map and the legend would contradict each other.
    const first = colorForPartida('abc123', 'Sardinel sumergido');
    const second = colorForPartida('abc123', 'Sardinel sumergido');

    expect(first).toBe(second);
    expect(first).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('dos partidas desconocidas distintas se distinguen', () => {
    expect(colorForPartida('abc123', 'Sardinel')).not.toBe(colorForPartida('zzz999', 'Berma'));
  });

  it('sin partida hay un color propio: no aplicar no es estar en cero', () => {
    expect(colorForPartida('', '')).toBe(NO_PARTIDA_COLOR);
  });
});

describe('legendForStreets', () => {
  const PARTIDAS = [
    { _id: 'p1', description: 'Base granular' },
    { _id: 'p2', description: 'Carpeta asfáltica' },
    { _id: 'p3', description: 'Imprimación' },
  ];

  it('lista solo las partidas realmente asignadas', () => {
    const legend = legendForStreets([{ partidaIds: ['p1'] }, { partidaIds: ['p1', 'p2'] }], PARTIDAS);

    expect(legend.map((entry) => entry._id)).toEqual(['p1', 'p2']);
    expect(legend[0].color).toBe(colorForPartida('p1', 'Base granular'));
  });

  it('cuenta cuántas calles usa cada partida', () => {
    const legend = legendForStreets([{ partidaIds: ['p1'] }, { partidaIds: ['p1', 'p2'] }], PARTIDAS);

    expect(legend[0].streetCount).toBe(2);
    expect(legend[1].streetCount).toBe(1);
  });

  it('vacía cuando nadie asignó partidas', () => {
    expect(legendForStreets([{ partidaIds: [] }], PARTIDAS)).toEqual([]);
  });

  it('ignora ids de partidas que ya no existen en el presupuesto', () => {
    // A deleted partida would leave a nameless ghost entry in the legend.
    expect(legendForStreets([{ partidaIds: ['borrada'] }], PARTIDAS)).toEqual([]);
  });
});
