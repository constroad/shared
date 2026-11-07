import type { LatLng } from './streetGeometry';
import { growChain, nameNearestTo, streetFromBasemapFeatures } from './basemapStreet';

/**
 * Contract of "I tapped a base map street and I want ITS axis".
 *
 * What `queryRenderedFeatures` returns is not a street: it is the pieces that
 * fall in each tile, with the same street repeated under the same `name`. This
 * layer decides WHICH pieces belong to the tapped street and sends them to be
 * stitched.
 */

const feature = (name: string | undefined, coordinates: Array<[number, number]>) => ({
  properties: name === undefined ? {} : { name },
  geometry: { type: 'LineString', coordinates },
});

// Contiguous stretches of one road, split by the tile edge.
const PIECE_A: Array<[number, number]> = [
  [-76.9, -12.0],
  [-76.9, -12.0005],
];
const PIECE_B: Array<[number, number]> = [
  [-76.9, -12.0005],
  [-76.9, -12.001],
];

describe('streetFromBasemapFeatures', () => {
  it('devuelve el eje de la calle tocada, con su nombre', () => {
    const result = streetFromBasemapFeatures([feature('Jr. Lima', PIECE_A)]);

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Jr. Lima');
    expect(result!.line).toHaveLength(2);
    expect(result!.line[0]).toEqual({ lat: -12.0, lng: -76.9 });
  });

  it('cose los pedazos de tile de la MISMA calle en un solo eje', () => {
    const result = streetFromBasemapFeatures([
      feature('Jr. Lima', PIECE_A),
      feature('Jr. Lima', PIECE_B),
    ]);

    // 3 vertices = both pieces joined, not 4 with the joint duplicated.
    expect(result!.line).toHaveLength(3);
    expect(result!.extraChains).toBe(0);
  });

  it('ignora los pedazos de OTRA calle aunque estén bajo el dedo', () => {
    // At a corner the tap returns both roads: the topmost one wins.
    const result = streetFromBasemapFeatures([
      feature('Jr. Lima', PIECE_A),
      feature('Av. Ferrocarril', [
        [-76.901, -12.0],
        [-76.902, -12.0],
      ]),
      feature('Jr. Lima', PIECE_B),
    ]);

    expect(result!.name).toBe('Jr. Lima');
    expect(result!.line).toHaveLength(3);
  });

  it('avisa cuando quedaron cadenas sueltas', () => {
    // Same name but ten blocks away: "Jr. Lima" repeated in another area. The
    // UI uses this to say "the longest stretch was taken".
    const result = streetFromBasemapFeatures([
      feature('Jr. Lima', PIECE_A),
      feature('Jr. Lima', [
        [-76.95, -12.05],
        [-76.95, -12.051],
      ]),
    ]);

    expect(result!.extraChains).toBe(1);
    // It keeps the LONGER chain of the two.
    expect(result!.line[0].lat).toBeCloseTo(-12.05, 3);
  });

  it('con el punto tocado gana la cadena CERCANA, no la más larga', () => {
    // "Av. Arequipa" repeats its name across half the city: keeping the longest
    // chunk would return a block in another district, not the tapped one.
    const result = streetFromBasemapFeatures(
      [
        feature('Av. Arequipa', PIECE_A),
        feature('Av. Arequipa', [
          [-76.95, -12.05],
          [-76.95, -12.06],
        ]),
      ],
      { lat: -12.0004, lng: -76.9 }
    );

    expect(result!.line).toHaveLength(2);
    expect(result!.line[0].lat).toBeCloseTo(-12.0, 3);
    expect(result!.extraChains).toBe(1);
  });

  it('una vía SIN nombre no arrastra a las demás sin nombre', () => {
    // Grouping by an empty name would join every alley in view into one
    // monster. Without a name only the tapped piece is taken.
    const result = streetFromBasemapFeatures([
      feature(undefined, PIECE_A),
      feature(undefined, [
        [-76.8, -12.3],
        [-76.8, -12.301],
      ]),
    ]);

    expect(result!.line).toHaveLength(2);
    expect(result!.name).toBe('');
    expect(result!.extraChains).toBe(0);
  });

  it('acepta MultiLineString (los tiles la usan para vías partidas)', () => {
    const result = streetFromBasemapFeatures([
      {
        properties: { name: 'Jr. Lima' },
        geometry: { type: 'MultiLineString', coordinates: [PIECE_A, PIECE_B] },
      },
    ]);

    expect(result!.line).toHaveLength(3);
  });

  it('usa `name:latin` o `ref` cuando no hay `name`', () => {
    const latin = streetFromBasemapFeatures([
      { properties: { 'name:latin': 'Av. Ferrocarril' }, geometry: { type: 'LineString', coordinates: PIECE_A } },
    ]);
    const ref = streetFromBasemapFeatures([
      { properties: { ref: 'PE-1S' }, geometry: { type: 'LineString', coordinates: PIECE_A } },
    ]);

    expect(latin!.name).toBe('Av. Ferrocarril');
    expect(ref!.name).toBe('PE-1S');
  });

  it('prefiere la vía CON nombre aunque venga debajo', () => {
    // In OpenMapTiles tiles the geometry lives in `transportation` (no name)
    // and the name in `transportation_name`. The tap returns both and the
    // anonymous one tends to be on top: keeping it would leave the street with
    // no name and nothing to group its pieces by.
    const result = streetFromBasemapFeatures([feature(undefined, PIECE_A), feature('Jr. Lima', PIECE_B)]);

    expect(result!.name).toBe('Jr. Lima');
  });

  it('descarta geometría que no es una línea', () => {
    // Blocks, parks and buildings are under the finger too.
    const result = streetFromBasemapFeatures([
      { properties: { name: 'Parque' }, geometry: { type: 'Polygon', coordinates: [PIECE_A] } },
      feature('Jr. Lima', PIECE_A),
    ]);

    expect(result!.name).toBe('Jr. Lima');
  });

  it('null cuando no hay nada usable', () => {
    expect(streetFromBasemapFeatures([])).toBeNull();
    expect(streetFromBasemapFeatures([feature('Jr. Lima', [[-76.9, -12.0]])])).toBeNull();
  });
});

describe('nameNearestTo', () => {
  const named = (name: string, coordinates: Array<[number, number]>) => ({
    properties: { name },
    geometry: { type: 'LineString', coordinates },
  });

  it('devuelve el nombre de la vía más cercana al toque', () => {
    // Names live in another tile layer (`transportation_name`) and are only
    // drawn where the label fits: they must be searched by proximity, not by
    // what was painted under the finger.
    const name = nameNearestTo(
      [named('Av. Ferrocarril', [[-76.902, -12.0], [-76.902, -12.001]]), named('Jr. Lima', PIECE_A)],
      { lat: -12.0004, lng: -76.9 }
    );

    expect(name).toBe('Jr. Lima');
  });

  it('vacío si ninguna vía con nombre está cerca', () => {
    expect(nameNearestTo([named('Jr. Lima', PIECE_A)], { lat: -12.5, lng: -76.5 })).toBe('');
  });

  it('vacío sin candidatas', () => {
    expect(nameNearestTo([], { lat: -12.0, lng: -76.9 })).toBe('');
  });
});

/**
 * The street cut into chains (José, 01/09/2026).
 *
 * "Jirón Los Pinos" goes on past the crossing and the base map delivers it in
 * pieces: the tile cuts it at its edge and at every intersection. We kept the
 * tapped piece, so the street entered the work only up to the corner and the
 * handle could not stretch it — there was no geometry to stretch.
 */
describe('growChain', () => {
  const A: LatLng[] = [
    { lat: -12.0, lng: -76.9 },
    { lat: -12.001, lng: -76.9 },
  ];
  const NEXT: LatLng[] = [
    { lat: -12.001, lng: -76.9 },
    { lat: -12.002, lng: -76.9 },
  ];
  const BEFORE: LatLng[] = [
    { lat: -11.999, lng: -76.9 },
    { lat: -12.0, lng: -76.9 },
  ];
  const FAR: LatLng[] = [
    { lat: -12.02, lng: -76.9 },
    { lat: -12.021, lng: -76.9 },
  ];

  it('pega la cadena que CONTINÚA hacia adelante', () => {
    const output = growChain([A, NEXT], A);

    expect(output[0]).toEqual(A[0]);
    expect(output[output.length - 1]).toEqual(NEXT[1]);
  });

  it('pega la que viene de ATRÁS, y en orden', () => {
    const output = growChain([A, BEFORE], A);

    expect(output[0]).toEqual(BEFORE[0]);
    expect(output[output.length - 1]).toEqual(A[1]);
  });

  it('encadena las dos: la calle entera', () => {
    const output = growChain([BEFORE, A, NEXT], A);

    expect(output[0]).toEqual(BEFORE[0]);
    expect(output[output.length - 1]).toEqual(NEXT[1]);
  });

  /** An avenue repeats its name across half the city: that is NOT attached. */
  it('no pega un pedazo suelto de otro barrio', () => {
    expect(growChain([A, FAR], A)).toEqual(A);
  });

  it('da vuelta la cadena si viene al revés', () => {
    const backwards = [...NEXT].reverse();

    const output = growChain([A, backwards], A);

    expect(output[output.length - 1]).toEqual(NEXT[1]);
  });

  it('sin cadenas vecinas devuelve la misma', () => {
    expect(growChain([A], A)).toEqual(A);
  });
});
