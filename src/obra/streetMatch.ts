import type { LatLng } from './streetGeometry';

/**
 * Snapping a trace to the real road (OSRM **map matching**), the pure half.
 *
 * `/match` is used, not `/route`: `/route` computes the DRIVING route between
 * two points and can go down another street if that is the best way to get
 * there; `/match` hooks the points onto the road network and, above all,
 * returns `confidence` — with that the editor can say "check this trace"
 * instead of saving a wrong geometry without warning.
 *
 * This file builds the request path and reads the answer. The network call
 * (fetch, timeout, OSRM base URL) lives in each app: the package does no I/O.
 */

/** Below this the trace is flagged for human review. */
export const MATCH_MIN_CONFIDENCE = 0.6;

/**
 * Search radius per point, in metres. **It is mandatory for our case.**
 *
 * Checked against the real service (01/08/2026): two hand-tapped points return
 * `NoMatch` without `radiuses`, and `Ok` with confidence 0.85 when it is sent.
 * OSRM's default assumes a dense GPS trace with timestamps; here they are two
 * loose taps on the map, so how far each point may stray from the road has to
 * be declared. 25 m covers the carriageway width plus GPS error without
 * jumping to the parallel street.
 */
export const DEFAULT_RADIUS_M = 25;

/**
 * Every how many metres the trace is filled in between two taps.
 *
 * With ONLY a start and an end, the path in between is a ROUTING decision: over
 * ten blocks OSRM can take the parallel street —if it is one-way, that is the
 * logical way to drive— and come back to the end point. José saw it on Jirón
 * Puno: the saved trace was another street.
 *
 * Filling in the straight line between taps builds a CORRIDOR: every invented
 * point has to land near the path, so the parallel street stops being an
 * option.
 */
export const DENSIFY_STEP_M = 40;

/**
 * Radius of the INVENTED points, wider than the tapped ones.
 *
 * The fill goes along the straight line and the real street curves; with a
 * tap's radius (25 m) a gentle curve would leave the corridor and the service
 * would return `NoMatch`. 45 m holds the curve without reaching the next block,
 * which in an urban grid is ~80 m away.
 */
export const FILL_RADIUS_M = 45;

const METERS_PER_DEGREE = 111_320;

/** Approximate distance in metres. Good for deciding, not for measuring. */
const roughMeters = (a: LatLng, b: LatLng): number => {
  const cosLat = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return Math.hypot((b.lat - a.lat) * METERS_PER_DEGREE, (b.lng - a.lng) * METERS_PER_DEGREE * cosLat);
};

/**
 * The trace with intermediate points.
 *
 * The engineer's taps are kept as they are and in order: they are the data;
 * what is added is filler so the matcher has nowhere to wander off.
 */
export const densifyForMatch = (points: LatLng[], stepM = DENSIFY_STEP_M): LatLng[] => {
  if (points.length < 2) return points;

  const output: LatLng[] = [points[0]];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const segments = Math.floor(roughMeters(previous, current) / stepM);

    for (let step = 1; step < segments; step += 1) {
      const fraction = step / segments;
      output.push({
        lat: previous.lat + (current.lat - previous.lat) * fraction,
        lng: previous.lng + (current.lng - previous.lng) * fraction,
      });
    }
    output.push(current);
  }

  return output;
};

export interface MatchedStreet {
  line: LatLng[];
  confidence: number;
  distanceM: number;
  /** `true` = confidence falls short; the editor asks for a manual fix. */
  needsReview: boolean;
}

const coordinateKey = (point: LatLng): string => `${point.lng},${point.lat}`;

/**
 * Path and query of the OSRM `/match` request, without the base URL.
 *
 * The trace that is sent carries filler; the radiuses tell the real tap
 * (narrow, it is the data) from the invented one (wider, it only bounds the
 * corridor). `null` with fewer than two points: there is nothing to match.
 */
export const buildMatchPath = (params: { points: LatLng[]; radiusM?: number }): string | null => {
  const { points, radiusM = DEFAULT_RADIUS_M } = params;
  if (!Array.isArray(points) || points.length < 2) return null;

  const tapped = new Set(points.map(coordinateKey));
  const trace = densifyForMatch(points);
  const coordinates = trace.map(coordinateKey).join(';');
  const radiuses = trace
    .map((point) => (tapped.has(coordinateKey(point)) ? radiusM : FILL_RADIUS_M))
    .join(';');
  return `/match/v1/driving/${coordinates}?overview=full&geometries=geojson&tidy=true&radiuses=${radiuses}`;
};

/** Reads OSRM's `/match` answer. `null` when there is no usable matching. */
export const parseMatchResponse = (payload: unknown): MatchedStreet | null => {
  const matching = (payload as { matchings?: Array<Record<string, unknown>> })?.matchings?.[0];
  if (!matching) return null;

  const coordinates = (matching.geometry as { coordinates?: Array<[number, number]> } | undefined)
    ?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  // Without a declared `confidence` success is not assumed: it goes to review.
  const confidence = typeof matching.confidence === 'number' ? matching.confidence : 0;

  return {
    line: coordinates.map(([lng, lat]) => ({ lat, lng })),
    confidence,
    distanceM: Number(matching.distance) || 0,
    needsReview: confidence < MATCH_MIN_CONFIDENCE,
  };
};
