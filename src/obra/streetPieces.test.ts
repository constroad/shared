import { isSamePieceOfStreet } from './streetPieces';
import type { LatLng } from './streetGeometry';

/** North-south, ~111 m per 0.001 of latitude. */
const A: LatLng[] = [
  { lat: -12.0, lng: -76.9 },
  { lat: -12.001, lng: -76.9 },
];
/** Continues A to the south. */
const B: LatLng[] = [
  { lat: -12.001, lng: -76.9 },
  { lat: -12.002, lng: -76.9 },
];

/**
 * Tapping the CONTINUATION of a street already in the area (José, 01/09/2026).
 *
 * The picker rejected by NAME: tapping the other stretch of "Jirón Miguel Grau"
 * answered "already in the area" and added nothing. José had to name it
 * "Grau 2" to get it in, when it is the same street going on.
 *
 * The name is not enough to decide: what decides is whether the tapped trace
 * is the SAME PIECE of asphalt or a new one.
 */
describe('isSamePieceOfStreet', () => {
  it('volver a tocar la misma calle: es el mismo pedazo', () => {
    expect(isSamePieceOfStreet(A, A)).toBe(true);
  });

  it('tocar la continuación NO es el mismo pedazo: hay que agregarla', () => {
    expect(isSamePieceOfStreet(A, B)).toBe(false);
  });

  it('un pedazo DENTRO del que ya está sí lo es', () => {
    const inside: LatLng[] = [
      { lat: -12.0003, lng: -76.9 },
      { lat: -12.0007, lng: -76.9 },
    ];

    expect(isSamePieceOfStreet(A, inside)).toBe(true);
  });

  it('la misma calle en otro barrio no es el mismo pedazo', () => {
    const far: LatLng[] = [
      { lat: -12.05, lng: -76.9 },
      { lat: -12.051, lng: -76.9 },
    ];

    expect(isSamePieceOfStreet(A, far)).toBe(false);
  });

  it('sin geometría suficiente no hay pedazo que comparar', () => {
    expect(isSamePieceOfStreet([], A)).toBe(false);
    expect(isSamePieceOfStreet(A, [A[0]])).toBe(false);
  });
});
