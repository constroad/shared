import {
  DEFAULT_RADIUS_M,
  FILL_RADIUS_M,
  MATCH_MIN_CONFIDENCE,
  buildMatchPath,
  densifyForMatch,
  parseMatchResponse,
} from './streetMatch';

/**
 * `/match` (map matching) is the right service to snap points to the road:
 * `/route` gives the driving route between two points, which can go down
 * another street. Besides, `/match` returns `confidence`, and that is what
 * makes it possible to warn "this trace came out doubtful" instead of saving
 * garbage silently.
 */

const A = { lat: -12.0, lng: -76.9 };
const B = { lat: -12.001, lng: -76.9 };

const okPayload = (overrides: Record<string, unknown> = {}) => ({
  matchings: [
    {
      confidence: 0.94,
      distance: 180.4,
      geometry: { coordinates: [[-76.9, -12.0], [-76.9, -12.0005], [-76.9, -12.001]] },
      ...overrides,
    },
  ],
});

/** Splits a built path the way OSRM reads it: coordinates and radiuses. */
const partsOf = (path: string | null) => {
  const url = new URL(`https://osrm.test${path}`);
  return {
    url,
    coordinates: url.pathname.split('/driving/')[1].split(';'),
    radiuses: url.searchParams.get('radiuses')?.split(';') ?? [],
  };
};

describe('parseMatchResponse', () => {
  it('devuelve la geometría de la vía y su confianza', () => {
    const matched = parseMatchResponse(okPayload());

    expect(matched).not.toBeNull();
    expect(matched!.line).toHaveLength(3);
    expect(matched!.line[0]).toEqual({ lat: -12.0, lng: -76.9 });
    expect(matched!.confidence).toBe(0.94);
    expect(matched!.distanceM).toBe(180.4);
  });

  it('marca para revisar cuando la confianza es baja', () => {
    // Alleys and new roads that OSM does not know end up here.
    const matched = parseMatchResponse(okPayload({ confidence: 0.3 }));

    expect(matched!.confidence).toBe(0.3);
    expect(matched!.needsReview).toBe(true);
  });

  it('no marca para revisar con confianza alta', () => {
    expect(parseMatchResponse(okPayload())!.needsReview).toBe(false);
    expect(MATCH_MIN_CONFIDENCE).toBeGreaterThan(0);
  });

  it('null si no hay matchings utilizables', () => {
    expect(parseMatchResponse({ matchings: [] })).toBeNull();
    expect(parseMatchResponse({})).toBeNull();
    expect(parseMatchResponse(null)).toBeNull();
  });

  it('null si la geometría llega con menos de dos puntos', () => {
    expect(parseMatchResponse(okPayload({ geometry: { coordinates: [[-76.9, -12.0]] } }))).toBeNull();
  });

  it('sin confianza declarada asume revisión manual', () => {
    expect(parseMatchResponse(okPayload({ confidence: undefined }))!.needsReview).toBe(true);
  });

  it('sin distancia legible la distancia es cero', () => {
    expect(parseMatchResponse(okPayload({ distance: 'n/a' }))!.distanceM).toBe(0);
  });
});

describe('buildMatchPath', () => {
  it('pide `/match` con las coordenadas en lng,lat y geometría completa', () => {
    const path = buildMatchPath({ points: [A, B] });

    expect(path).toContain('/match/v1/driving/');
    // The taps open and close the trace; the filler goes in between.
    expect(path).toContain('/driving/-76.9,-12;');
    expect(path).toContain('-76.9,-12.001?');
    expect(path).toContain('geometries=geojson');
    expect(path).toContain('overview=full');
    expect(path).toContain('tidy=true');
  });

  it('manda `radiuses` — sin eso el servicio real responde NoMatch', () => {
    // Checked against OSRM on 01/08/2026: two hand-tapped points give
    // `NoMatch` without this parameter and `Ok` (confidence 0.85) with it.
    // Mocks do not see it: that is why the test pins the path contract.
    const { radiuses } = partsOf(buildMatchPath({ points: [A, B] }));

    expect(radiuses[0]).toBe(String(DEFAULT_RADIUS_M));
    expect(radiuses[radiuses.length - 1]).toBe('25');
  });

  it('un radio por punto, también cuando son varios', () => {
    const { coordinates, radiuses } = partsOf(buildMatchPath({ points: [A, B, A], radiusM: 40 }));

    // One radius per point, always: the service rejects the request otherwise.
    expect(radiuses).toHaveLength(coordinates.length);
    expect(radiuses[0]).toBe('40');
  });

  it('sin al menos dos puntos no hay nada que pedir', () => {
    expect(buildMatchPath({ points: [A] })).toBeNull();
    expect(buildMatchPath({ points: [] })).toBeNull();
    expect(buildMatchPath({ points: undefined as unknown as [] })).toBeNull();
  });

  it('fija la ruta exacta para dos toques a ~200 m', () => {
    // ~200 m at a 40 m step = 5 segments: the two taps plus 4 filler points.
    const path = buildMatchPath({
      points: [
        { lat: -12.0, lng: -76.9 },
        { lat: -12.0018, lng: -76.9 },
      ],
    });

    expect(path).toBe(
      '/match/v1/driving/' +
        '-76.9,-12;-76.9,-12.00036;-76.9,-12.00072;-76.9,-12.00108;-76.9,-12.001439999999999;-76.9,-12.0018' +
        '?overview=full&geometries=geojson&tidy=true&radiuses=25;45;45;45;45;25'
    );
  });
});

/**
 * Two far-apart taps and the matcher goes down the parallel street (José,
 * 01/09/2026).
 *
 * With only a start and an end, the path in between is a ROUTING decision:
 * over ten blocks OSRM can take the street next door —if it is one-way, that
 * is the logical way to drive— and come back to the end point. The saved
 * geometry was another street.
 */
describe('densifyForMatch', () => {
  it('dos toques pegados no se tocan: ya hay poco que decidir', () => {
    const near = { lat: -12.0002, lng: -76.9 };

    expect(densifyForMatch([A, near], 40)).toEqual([A, near]);
  });

  it('dos toques lejanos se rellenan con puntos intermedios', () => {
    const far = { lat: -12.009, lng: -76.9 }; // ~1 km

    const output = densifyForMatch([A, far], 40);

    expect(output.length).toBeGreaterThan(20);
    expect(output[0]).toEqual(A);
    expect(output[output.length - 1]).toEqual(far);
  });

  it('los intermedios caen SOBRE la recta entre los dos toques', () => {
    const far = { lat: -12.004, lng: -76.9 };

    densifyForMatch([A, far], 40).forEach((point) => {
      expect(point.lng).toBeCloseTo(-76.9, 6);
      expect(point.lat).toBeLessThanOrEqual(A.lat);
      expect(point.lat).toBeGreaterThanOrEqual(far.lat);
    });
  });

  it('respeta los toques del ingeniero: todos siguen ahí y en orden', () => {
    const second = { lat: -12.004, lng: -76.9 };
    const third = { lat: -12.004, lng: -76.895 };

    const output = densifyForMatch([A, second, third], 40);

    expect(output).toEqual(expect.arrayContaining([A, second, third]));
    expect(output.indexOf(second)).toBeGreaterThan(output.indexOf(A));
    expect(output.indexOf(third)).toBeGreaterThan(output.indexOf(second));
  });

  it('con menos de dos puntos no hay nada que rellenar', () => {
    expect(densifyForMatch([A], 40)).toEqual([A]);
    expect(densifyForMatch([], 40)).toEqual([]);
  });
});

describe('radiuses del trazo densificado', () => {
  it('el punto TOCADO va con radio chico y el rellenado con uno más ancho', () => {
    const { radiuses } = partsOf(
      buildMatchPath({
        points: [
          { lat: -12.0, lng: -76.9 },
          { lat: -12.009, lng: -76.9 },
        ],
      })
    );

    // The first and last are the taps; the ones in the middle, the invented.
    expect(radiuses[0]).toBe('25');
    expect(radiuses[radiuses.length - 1]).toBe('25');
    expect(Number(radiuses[Math.floor(radiuses.length / 2)])).toBe(FILL_RADIUS_M);
  });
});
