/**
 * When NOT to believe the automatic snapping (José, 04/09/2026).
 *
 * José marked Jr. Miguel Grau by hand, yet on saving it showed up further down.
 * The hand trace is sent to OSRM to snap it to the real road, and the snap can
 * go to the PARALLEL street: the street ends up one block off from what the
 * person drew, with nothing warning about it.
 *
 * The rule: if the snap strays from the trace by more than the width of a
 * street, it is not used. The hand trace is worse geometry but tells the truth
 * about WHERE.
 */
import { MATCH_MAX_DEVIATION_M, matchDeviationM, shouldTrustMatch } from './matchTrust';

/** ~0.001 of latitude ≈ 111 m; 0.0001 ≈ 11 m. */
const drawn = [
  { lat: -12.0, lng: -76.9 },
  { lat: -12.0, lng: -76.899 },
];

describe('matchDeviationM', () => {
  it('un pegado que sigue el mismo eje casi no se desvía', () => {
    const snapped = [
      { lat: -12.00001, lng: -76.9 },
      { lat: -12.00001, lng: -76.899 },
    ];

    expect(matchDeviationM(drawn, snapped)).toBeLessThan(3);
  });

  it('mide la distancia MÁXIMA, no el promedio: un extremo suelto es un error', () => {
    const snapped = [
      { lat: -12.0, lng: -76.9 },
      { lat: -12.0008, lng: -76.899 },
    ];

    // ~69 m: the projection onto the diagonal gives less than the end's
    // separation, and it still triples the threshold.
    expect(matchDeviationM(drawn, snapped)).toBeGreaterThan(60);
  });

  it('sin trazo o sin pegado no hay nada que medir', () => {
    expect(matchDeviationM([], drawn)).toBe(Infinity);
    expect(matchDeviationM(drawn, [])).toBe(Infinity);
  });
});

describe('shouldTrustMatch', () => {
  it('un pegado encima del trazo se usa', () => {
    const snapped = [
      { lat: -12.00002, lng: -76.9 },
      { lat: -12.00002, lng: -76.899 },
    ];

    expect(shouldTrustMatch({ drawn, matched: snapped })).toBe(true);
  });

  /** The parallel street is half a block away: that is other asphalt, not an adjustment. */
  it('un pegado que se fue a la calle de al lado NO se usa', () => {
    const parallel = [
      { lat: -12.0007, lng: -76.9 },
      { lat: -12.0007, lng: -76.899 },
    ];

    expect(matchDeviationM(drawn, parallel)).toBeGreaterThan(MATCH_MAX_DEVIATION_M);
    expect(shouldTrustMatch({ drawn, matched: parallel })).toBe(false);
  });

  it('sin pegado no hay nada en qué confiar', () => {
    expect(shouldTrustMatch({ drawn, matched: [] })).toBe(false);
  });
});
