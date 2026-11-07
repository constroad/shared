import { cutoffDates, kmLabel, kmStrip, stationLabel } from './kmStrip';

const street = { _id: 'c1', name: 'Jirón Pedro Silva', lengthM: 2140, widthM: 6 };
const scope = { _id: 'a1', streetId: 'c1', fromM: 0, toM: 2140, partidaIds: [], tagIds: ['t1', 't2'] };
const tags = [
  { _id: 't1', name: 'Imprimación MC30', color: '#ef4444', order: 1 },
  { _id: 't2', name: 'Carpeta 2"', color: '#1f2937', order: 2 },
];
const progress = [
  { streetId: 'c1', partidaId: '', tagId: 't1', fromM: 0, toM: 800, date: '2026-09-12' },
  { streetId: 'c1', partidaId: '', tagId: 't2', fromM: 0, toM: 300, date: '2026-09-14' },
  { streetId: 'c1', partidaId: '', tagId: 't1', fromM: 800, toM: 1200, date: '2026-09-16' },
];

/**
 * The design's "km strip" (`stitch/jose-report-big.png`, «Mapa Técnico de
 * Avance Geoespacial»): each street as a bar along its chainage, segmented by
 * the axis that worked it, with the active front and the legend in m².
 *
 * The intervals come from the engine the map already uses (`streetProgress`);
 * here they are only translated into something drawable without geometry.
 */
describe('kmStrip', () => {
  it('cada calle se parte en segmentos por eje, con su color y su rótulo', () => {
    const strip = kmStrip({ streets: [street], scopes: [scope], progress, tags, partidas: [] });

    expect(strip.streets).toHaveLength(1);
    const [pedroSilva] = strip.streets;
    expect(pedroSilva.name).toBe('Jirón Pedro Silva');
    expect(pedroSilva.lengthM).toBe(2140);
    expect(pedroSilva.segments).toEqual([
      { workId: 't1', label: 'Imprimación MC30', color: '#ef4444', fromM: 0, toM: 1200 },
      { workId: 't2', label: 'Carpeta 2"', color: '#1f2937', fromM: 0, toM: 300 },
    ]);
  });

  it('el frente activo es el metro más lejano trabajado en la calle', () => {
    const strip = kmStrip({ streets: [street], scopes: [scope], progress, tags, partidas: [] });

    expect(strip.streets[0].frenteM).toBe(1200);
  });

  /** The design's cutoff date selector: rewind the work to a given day. */
  it('con fecha de corte, solo entra lo trabajado hasta ese día', () => {
    const strip = kmStrip({
      streets: [street],
      scopes: [scope],
      progress,
      tags,
      partidas: [],
      upToDate: '2026-09-14',
    });

    expect(strip.streets[0].segments.map((seg) => [seg.workId, seg.toM])).toEqual([
      ['t1', 800],
      ['t2', 300],
    ]);
    expect(strip.streets[0].frenteM).toBe(800);
  });

  it('la leyenda dice metros y m² por eje, con su porcentaje del alcance', () => {
    const strip = kmStrip({ streets: [street], scopes: [scope], progress, tags, partidas: [] });

    expect(strip.legend).toEqual([
      { workId: 't1', label: 'Imprimación MC30', color: '#ef4444', approvedM: 1200, m2: 7200, pct: 56 },
      { workId: 't2', label: 'Carpeta 2"', color: '#1f2937', approvedM: 300, m2: 1800, pct: 14 },
    ]);
  });

  it('sin ancho cargado, la leyenda no inventa m²', () => {
    const strip = kmStrip({
      streets: [{ ...street, widthM: undefined }],
      scopes: [scope],
      progress,
      tags,
      partidas: [],
    });

    expect(strip.legend[0].m2).toBeNull();
    expect(strip.legend[0].approvedM).toBe(1200);
  });

  it('una obra vieja sin etiquetas se colorea por partida, como el mapa', () => {
    const strip = kmStrip({
      streets: [street],
      scopes: [{ ...scope, tagIds: [], partidaIds: ['p1'] }],
      progress: [{ streetId: 'c1', partidaId: 'p1', fromM: 0, toM: 500, date: '2026-09-12' }],
      tags: [],
      partidas: [{ _id: 'p1', description: 'Fresado de pavimento' }],
    });

    expect(strip.streets[0].segments[0]).toMatchObject({ workId: 'p1', label: 'Fresado de pavimento' });
    expect(strip.streets[0].segments[0].color).toMatch(/^#/);
  });

  it('una calle sin avance sale con la tira vacía, no desaparece', () => {
    const strip = kmStrip({ streets: [street], scopes: [scope], progress: [], tags, partidas: [] });

    expect(strip.streets[0].segments).toEqual([]);
    expect(strip.streets[0].frenteM).toBeNull();
  });
});

describe('cutoffDates', () => {
  it('lista los días con avance, del más reciente al más viejo, sin repetir', () => {
    expect(cutoffDates(progress)).toEqual(['2026-09-16', '2026-09-14', '2026-09-12']);
  });

  it('sin avances no hay fechas', () => {
    expect(cutoffDates([])).toEqual([]);
  });
});

describe('kmLabel', () => {
  it('escribe la progresiva como en los planos: Km 0+650', () => {
    expect(kmLabel(0)).toBe('Km 0+000');
    expect(kmLabel(650)).toBe('Km 0+650');
    expect(kmLabel(1800)).toBe('Km 1+800');
    expect(kmLabel(2140.14)).toBe('Km 2+140');
  });
});

describe('stationLabel', () => {
  it('is the chainage without «Km», rounded to the metre', () => {
    expect(stationLabel(40)).toBe('0+040');
    expect(stationLabel(1250.6)).toBe('1+251');
    expect(stationLabel(0)).toBe('0+000');
  });
});
