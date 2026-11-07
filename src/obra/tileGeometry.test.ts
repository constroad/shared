import { joinTileSegments } from './tileGeometry';

/**
 * When a street is tapped on the map, `queryRenderedFeatures` returns geometry
 * CLIPPED PER TILE: a long avenue arrives in pieces, sometimes reversed and
 * almost never in order. Without stitching those pieces, the street is saved
 * split and every chainage ends up wrong.
 */

const p = (lat: number, lng: number) => ({ lat, lng });

// Continuous stretch A→B→C on the same meridian, ~111 m per 0.001°.
const A = p(-12.0, -76.9);
const B = p(-12.001, -76.9);
const C = p(-12.002, -76.9);

describe('joinTileSegments', () => {
  it('cose dos pedazos contiguos en una sola línea', () => {
    const chains = joinTileSegments([[A, B], [B, C]]);

    expect(chains).toHaveLength(1);
    expect(chains[0]).toEqual([A, B, C]);
  });

  it('no repite el vértice compartido', () => {
    const [chain] = joinTileSegments([[A, B], [B, C]]);

    expect(chain).toHaveLength(3);
  });

  it('da vuelta el pedazo que viene invertido', () => {
    // The neighbouring tile can deliver the stretch in the opposite direction.
    const chains = joinTileSegments([[A, B], [C, B]]);

    expect(chains).toHaveLength(1);
    expect(chains[0]).toEqual([A, B, C]);
  });

  it('ordena pedazos que llegan salteados', () => {
    const chains = joinTileSegments([[B, C], [A, B]]);

    expect(chains).toHaveLength(1);
    expect(chains[0]).toEqual([A, B, C]);
  });

  it('tolera un hueco de pocos centímetros entre tiles', () => {
    // Clipping leaves the ends almost equal, not identical.
    const almostB = p(-12.0010001, -76.9);
    const chains = joinTileSegments([[A, B], [almostB, C]]);

    expect(chains).toHaveLength(1);
    expect(chains[0]).toHaveLength(3);
  });

  it('NO une pedazos separados de verdad: son calles distintas', () => {
    const far = p(-12.05, -76.9);
    const chains = joinTileSegments([[A, B], [far, p(-12.051, -76.9)]]);

    expect(chains).toHaveLength(2);
  });

  it('devuelve la cadena más larga primero', () => {
    // The UI takes the first one: it must be the road, not a loose sliver.
    const sliver = [p(-12.05, -76.9), p(-12.0501, -76.9)];
    const chains = joinTileSegments([sliver, [A, B], [B, C]]);

    expect(chains[0]).toEqual([A, B, C]);
  });

  it('un solo pedazo se devuelve tal cual', () => {
    expect(joinTileSegments([[A, B]])).toEqual([[A, B]]);
  });

  it('descarta pedazos degenerados y listas vacías', () => {
    expect(joinTileSegments([])).toEqual([]);
    expect(joinTileSegments([[A]])).toEqual([]);
  });

  it('cose una avenida de tres tiles en cualquier orden', () => {
    const D = p(-12.003, -76.9);
    const chains = joinTileSegments([[C, D], [A, B], [B, C]]);

    expect(chains).toHaveLength(1);
    expect(chains[0]).toEqual([A, B, C, D]);
  });

  it('pega por la cabeza un pedazo que termina donde empieza la cadena', () => {
    // Covers the two head cases: the piece arrives before the chain, in either direction.
    expect(joinTileSegments([[B, C], [A, B]])[0]).toEqual([A, B, C]);
    expect(joinTileSegments([[B, C], [B, A]])[0]).toEqual([A, B, C]);
  });
});
