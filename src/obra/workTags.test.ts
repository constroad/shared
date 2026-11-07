import {
  buildWorkLegend,
  colorForScope,
  dominantTag,
  tagUsage,
  untaggedUsage,
  unusedTags,
  type TaggedScope,
  type WorkTagLike,
} from './workTags';
import { colorForPartida, NO_PARTIDA_COLOR } from './partidaColors';

const DAY1: WorkTagLike = { _id: 't1', name: 'FRESADO DÍA 1', color: '#ef4444', order: 0 };
const DAY2: WorkTagLike = { _id: 't2', name: 'FRESADO DÍA 2-3', color: '#06b6d4', order: 1 };

const makeScope = (extra: Partial<TaggedScope> = {}): TaggedScope => ({
  _id: 's1',
  streetId: 'c1',
  fromM: 0,
  toM: 100,
  partidaIds: [],
  tagIds: [],
  ...extra,
});

const partidaNameOf = (id: string) => (id === 'p1' ? 'Fresado' : 'Carpeta asfáltica');

describe('colorForScope', () => {
  it('la etiqueta manda sobre la partida', () => {
    // If the engineer created «FRESADO DÍA 1» and painted it red, it is because
    // TODAY they want to view the work by day, not by partida.
    const color = colorForScope({
      scope: makeScope({ partidaIds: ['p1'], tagIds: ['t1'] }),
      tags: [DAY1, DAY2],
      partidaName: partidaNameOf,
    });

    expect(color).toBe('#ef4444');
  });

  it('sin etiqueta sigue mandando la partida: el mapa no se vuelve gris de golpe', () => {
    const color = colorForScope({
      scope: makeScope({ partidaIds: ['p1'] }),
      tags: [DAY1],
      partidaName: partidaNameOf,
    });

    expect(color).toBe(colorForPartida('p1', 'Fresado'));
  });

  it('sin nada, el color de «sin asignar»', () => {
    expect(
      colorForScope({ scope: makeScope(), tags: [DAY1], partidaName: partidaNameOf })
    ).toBe(NO_PARTIDA_COLOR);
  });

  it('con varias etiquetas gana la de menor orden, no la primera del array', () => {
    // If "the first in the array" won, the color would change depending on the
    // order in which the checkboxes were clicked.
    const scope = makeScope({ tagIds: ['t2', 't1'] });

    expect(dominantTag(scope, [DAY1, DAY2])?.name).toBe('FRESADO DÍA 1');
    expect(colorForScope({ scope, tags: [DAY1, DAY2], partidaName: partidaNameOf })).toBe('#ef4444');
  });

  it('una etiqueta borrada no pinta: el tramo cae a su partida', () => {
    const color = colorForScope({
      scope: makeScope({ partidaIds: ['p1'], tagIds: ['fantasma'] }),
      tags: [DAY1],
      partidaName: partidaNameOf,
    });

    expect(color).toBe(colorForPartida('p1', 'Fresado'));
  });

  it('el foco apaga todo lo que no es esa etiqueta', () => {
    const base = { tags: [DAY1, DAY2], partidaName: partidaNameOf, focusTagId: 't1' };

    expect(colorForScope({ ...base, scope: makeScope({ tagIds: ['t1'] }) })).toBe('#ef4444');
    expect(colorForScope({ ...base, scope: makeScope({ tagIds: ['t2'] }) })).toBe(NO_PARTIDA_COLOR);
    // With focus, not even the partida is painted: looking at a layer means looking at ONE.
    expect(colorForScope({ ...base, scope: makeScope({ partidaIds: ['p1'] }) })).toBe(NO_PARTIDA_COLOR);
  });
});

describe('buildWorkLegend', () => {
  it('las etiquetas van primero y en su orden, con cuántos tramos pintan', () => {
    const legend = buildWorkLegend({
      scopes: [
        makeScope({ _id: 'a', tagIds: ['t2'] }),
        makeScope({ _id: 'b', tagIds: ['t1'] }),
        makeScope({ _id: 'c', tagIds: ['t1'] }),
      ],
      tags: [DAY1, DAY2],
      partidaName: partidaNameOf,
    });

    expect(legend.map((e) => [e.description, e.streetCount])).toEqual([
      ['FRESADO DÍA 1', 2],
      ['FRESADO DÍA 2-3', 1],
    ]);
  });

  it('las partidas que quedaron pintando entran después de las etiquetas', () => {
    const legend = buildWorkLegend({
      scopes: [makeScope({ _id: 'a', tagIds: ['t1'] }), makeScope({ _id: 'b', partidaIds: ['p1'] })],
      tags: [DAY1],
      partidaName: partidaNameOf,
    });

    expect(legend.map((e) => e.kind)).toEqual(['tag', 'partida']);
    expect(legend[1].description).toBe('Fresado');
  });

  it('una etiqueta que no pinta nada NO entra: buscarla en el plano termina en una llamada', () => {
    const legend = buildWorkLegend({
      scopes: [makeScope({ tagIds: ['t1'] })],
      tags: [DAY1, DAY2],
      partidaName: partidaNameOf,
    });

    expect(legend.map((e) => e.description)).toEqual(['FRESADO DÍA 1']);
  });

  it('el tramo etiquetado NO suma también a su partida: se cuenta una vez', () => {
    const legend = buildWorkLegend({
      scopes: [makeScope({ partidaIds: ['p1'], tagIds: ['t1'] })],
      tags: [DAY1],
      partidaName: partidaNameOf,
    });

    expect(legend).toHaveLength(1);
    expect(legend[0].kind).toBe('tag');
  });

  it('sin tramos, la leyenda está vacía', () => {
    expect(buildWorkLegend({ scopes: [], tags: [DAY1], partidaName: partidaNameOf })).toEqual([]);
  });

  /**
   * In the EDITOR the legend stopped being just a legend: it is the palette the
   * brush is picked from (C6, 30/08/2026). Filtering out those that paint
   * nothing, a newly created tag had no row, and without a row there is no
   * brush: there was no way to use it for the first time.
   */
  it('con `includeUnusedTags`, la recién creada entra en CERO para poder pintarla', () => {
    const legend = buildWorkLegend({
      scopes: [makeScope({ tagIds: ['t1'] })],
      tags: [DAY1, DAY2],
      partidaName: partidaNameOf,
      includeUnusedTags: true,
    });

    expect(legend.map((e) => [e.description, e.streetCount])).toEqual([
      ['FRESADO DÍA 1', 1],
      ['FRESADO DÍA 2-3', 0],
    ]);
  });

  it('sin la bandera sigue sin mostrar ceros: al cliente no se le ofrecen colores vacíos', () => {
    const legend = buildWorkLegend({
      scopes: [makeScope({ tagIds: ['t1'] })],
      tags: [DAY1, DAY2],
      partidaName: partidaNameOf,
    });

    expect(legend).toHaveLength(1);
  });

  it('las no usadas respetan el ORDEN del plano, no se apilan al final', () => {
    // DAY1 is `order: 0`; if they were concatenated separately, a new tag with
    // order 0 would land below the used ones and the palette would be out of order.
    const legend = buildWorkLegend({
      scopes: [makeScope({ tagIds: ['t2'] })],
      tags: [DAY1, DAY2],
      partidaName: partidaNameOf,
      includeUnusedTags: true,
    });

    expect(legend.map((e) => e.description)).toEqual(['FRESADO DÍA 1', 'FRESADO DÍA 2-3']);
  });
});

describe('unusedTags', () => {
  it('las que todavía no pinta nada se ofrecen igual para asignarlas', () => {
    const unused = unusedTags({ scopes: [makeScope({ tagIds: ['t1'] })], tags: [DAY1, DAY2] });

    expect(unused.map((t) => t.name)).toEqual(['FRESADO DÍA 2-3']);
  });
});

describe('tagUsage', () => {
  // 24 streets in production and only 6 with width (measured 29/08/2026): the
  // "no width" case is not a rare edge, it is the majority.
  // The scope's EFFECTIVE width: its own if it has one, otherwise its street's (C5).
  const widthOf = (scope: { streetId: string; widthM?: number }) =>
    scope.widthM ?? (scope.streetId === 'c1' ? 6 : undefined);

  it('cuenta TODAS las etiquetas del tramo, no solo la que gana el color', () => {
    // The map paints the scope red (lowest `order`), but the asphalt layer is
    // also executed there: deleting it is not free and the list must say so.
    const usage = tagUsage({
      scopes: [makeScope({ tagIds: ['t1', 't2'] })],
      widthOfScope: widthOf,
    });

    expect(usage.get('t1')?.scopeCount).toBe(1);
    expect(usage.get('t2')?.scopeCount).toBe(1);
  });

  it('el m² sale de largo × ancho efectivo del tramo', () => {
    const usage = tagUsage({
      scopes: [makeScope({ fromM: 0, toM: 100, tagIds: ['t1'] })],
      widthOfScope: widthOf,
    });

    expect(usage.get('t1')?.areaM2).toBe(600);
    expect(usage.get('t1')?.withoutWidth).toBe(0);
  });

  it('sin ancho el tramo cuenta pero no suma m²: mejor guiones que un número inventado', () => {
    const usage = tagUsage({
      scopes: [makeScope({ streetId: 'c9', tagIds: ['t1'] })],
      widthOfScope: widthOf,
    });

    expect(usage.get('t1')).toEqual({ scopeCount: 1, areaM2: 0, withoutWidth: 1 });
  });

  it('suma varios tramos de la misma etiqueta', () => {
    const usage = tagUsage({
      scopes: [
        makeScope({ _id: 'a', fromM: 0, toM: 100, tagIds: ['t1'] }),
        makeScope({ _id: 'b', fromM: 100, toM: 150, tagIds: ['t1'] }),
      ],
      widthOfScope: widthOf,
    });

    expect(usage.get('t1')).toEqual({ scopeCount: 2, areaM2: 900, withoutWidth: 0 });
  });

  it('una etiqueta sin tramos no aparece en el mapa de uso', () => {
    const usage = tagUsage({ scopes: [makeScope({ tagIds: [] })], widthOfScope: widthOf });

    expect(usage.has('t1')).toBe(false);
  });
});

describe('untaggedUsage', () => {
  // The scope's EFFECTIVE width: its own if it has one, otherwise its street's (C5).
  const widthOf = (scope: { streetId: string; widthM?: number }) =>
    scope.widthM ?? (scope.streetId === 'c1' ? 6 : undefined);

  it('junta lo que va a caer en «Sin clasificar» en el cuadro del plano', () => {
    const untagged = untaggedUsage({
      scopes: [
        makeScope({ _id: 'a', fromM: 0, toM: 100, tagIds: [] }),
        makeScope({ _id: 'b', fromM: 0, toM: 50, tagIds: ['t1'] }),
        makeScope({ _id: 'c', streetId: 'c9', fromM: 0, toM: 80, tagIds: [] }),
      ],
      widthOfScope: widthOf,
    });

    expect(untagged.scopeCount).toBe(2);
    expect(untagged.areaM2).toBe(600);
    expect(untagged.withoutWidth).toBe(1);
  });

  it('con todo etiquetado queda en cero y la fila gris desaparece', () => {
    const untagged = untaggedUsage({ scopes: [makeScope({ tagIds: ['t1'] })], widthOfScope: widthOf });

    expect(untagged.scopeCount).toBe(0);
  });
});

describe('tagUsage con ancho por TRAMO (C5)', () => {
  const makeScope = (over: Partial<{ _id: string; widthM: number; tagIds: string[] }>) => ({
    _id: over._id ?? 's1',
    streetId: 'c1',
    fromM: 0,
    toM: 100,
    tagIds: over.tagIds ?? ['t1'],
    ...(over.widthM ? { widthM: over.widthM } : {}),
  });
  const widthOf = (scope: { streetId: string; widthM?: number }) =>
    scope.widthM ?? (scope.streetId === 'c1' ? 6 : undefined);

  it('un tramo con ancho propio se mide con el SUYO, no con el de la calle', () => {
    // 100 × 6 = 600 with the street's; 100 × 5 = 500 with its own.
    const usage = tagUsage({ scopes: [makeScope({ widthM: 5 })], widthOfScope: widthOf });
    expect(usage.get('t1')?.areaM2).toBe(500);
  });

  it('dos tramos de la misma calle con anchos distintos suman por separado', () => {
    const usage = tagUsage({
      scopes: [makeScope({ _id: 's1' }), makeScope({ _id: 's2', widthM: 5 })],
      widthOfScope: widthOf,
    });
    expect(usage.get('t1')?.areaM2).toBe(1100);
    expect(usage.get('t1')?.scopeCount).toBe(2);
  });
});

/**
 * A scope with SEVERAL tags (José, 01/09/2026).
 *
 * A maintenance work carries milling, priming and asphalt on the SAME block.
 * The line can only have one color —the lowest order wins— but that must not
 * leak into the legend or the focus: the five streets had all three tags and
 * the legend showed «Fresado 5 · Imprimación 0 · Asfaltado 0», and turning on a
 * layer that did not win the color made the whole map go dark.
 */
describe('un tramo con varias etiquetas', () => {
  const TAGS = [
    { _id: 'fresado', name: 'Fresado', color: '#22d3ee', order: 0 },
    { _id: 'imprimacion', name: 'Imprimación', color: '#2563eb', order: 1 },
    { _id: 'asfaltado', name: 'Asfaltado', color: '#e879f9', order: 2 },
  ];

  const withAllThree = (id: string) => ({
    _id: id,
    streetId: `calle-${id}`,
    fromM: 0,
    toM: 497,
    tagIds: ['fresado', 'imprimacion', 'asfaltado'],
  });

  const FIVE_STREETS = ['a', 'b', 'c', 'd', 'e'].map(withAllThree);

  it('la leyenda cuenta CADA etiqueta, no solo la que gana el color', () => {
    const legend = buildWorkLegend({
      scopes: FIVE_STREETS,
      tags: TAGS,
      partidaName: () => 'Partida',
    });

    expect(legend.map((entry) => [entry.description, entry.streetCount])).toEqual([
      ['Fresado', 5],
      ['Imprimación', 5],
      ['Asfaltado', 5],
    ]);
  });

  it('enfocar una capa que NO gana el color igual pinta sus tramos', () => {
    const color = colorForScope({
      scope: FIVE_STREETS[0],
      tags: TAGS,
      partidaName: () => 'Partida',
      focusTagId: 'asfaltado',
    });

    expect(color).toBe('#e879f9');
  });

  it('enfocar una etiqueta que el tramo NO tiene lo apaga', () => {
    const color = colorForScope({
      scope: { ...FIVE_STREETS[0], tagIds: ['fresado'] },
      tags: TAGS,
      partidaName: () => 'Partida',
      focusTagId: 'asfaltado',
    });

    expect(color).toBe(NO_PARTIDA_COLOR);
  });

  it('sin foco sigue mandando la de menor orden: un trazo, un color', () => {
    expect(
      colorForScope({ scope: FIVE_STREETS[0], tags: TAGS, partidaName: () => 'Partida' })
    ).toBe('#22d3ee');
  });
});
