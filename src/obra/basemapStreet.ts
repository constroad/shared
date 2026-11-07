import { attachAtTouchingEnd, joinTileSegments } from './tileGeometry';
import { haversineMeters, projectToLine, type LatLng } from './streetGeometry';

/**
 * From "I tapped a street on the map" to that street's axis.
 *
 * `queryRenderedFeatures` returns EVERYTHING being painted under the finger:
 * the tapped street repeated once per tile, the road crossing at the corner,
 * and the park and the block as well. This module decides which pieces belong
 * to the tapped street and hands them to `joinTileSegments` to be stitched.
 *
 * It is pure: it does not import MapLibre. It takes features shaped the way
 * MapLibre emits them.
 */

export interface BasemapFeatureLike {
  properties?: Record<string, unknown> | null;
  geometry?: { type?: string; coordinates?: unknown } | null;
}

export interface BasemapStreet {
  /** Name of the road on the base map; empty when it has none (alleys). */
  name: string;
  line: LatLng[];
  /**
   * Chains left over with the SAME name. Above zero = there is another
   * "Jr. Lima" in view and the longest stretch was taken; the UI warns.
   */
  extraChains: number;
}

/** Name keys in OpenFreeMap tiles, in order of preference. */
const NAME_KEYS = ['name', 'name:latin', 'name:es', 'ref'];

const nameOf = (feature: BasemapFeatureLike): string => {
  const properties = feature?.properties ?? {};
  for (const key of NAME_KEYS) {
    const value = properties[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const isCoordPair = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1]);

const toLine = (coordinates: unknown): LatLng[] | null => {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  if (!coordinates.every(isCoordPair)) return null;
  return (coordinates as Array<[number, number]>).map(([lng, lat]) => ({ lat, lng }));
};

/** The pieces of a feature: one line, or several if it is a MultiLineString. */
const linesOf = (feature: BasemapFeatureLike): LatLng[][] => {
  const geometry = feature?.geometry;
  if (geometry?.type === 'LineString') {
    const line = toLine(geometry.coordinates);
    return line ? [line] : [];
  }
  if (geometry?.type === 'MultiLineString' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.map(toLine).filter((line): line is LatLng[] => line !== null);
  }
  // Blocks, parks and buildings also fall under the finger.
  return [];
};

/** The chain that passes closest to the finger. Ties go to the longest. */
const nearestChain = (chains: LatLng[][], tap: LatLng): LatLng[] => {
  let best = chains[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  chains.forEach((chain) => {
    const projected = projectToLine(chain, tap);
    if (projected && projected.distanceM < bestDistance) {
      bestDistance = projected.distanceM;
      best = chain;
    }
  });
  return best;
};

/**
 * How far apart two chains can be and still count as the SAME street going on.
 *
 * The tile cuts the road at its edge and at every intersection, and the ends do
 * not land exactly: 25 m covers the width of a crossing without reaching the
 * next block of a parallel street.
 */
const CHAIN_GAP_M = 25;

/**
 * The tapped chain, GROWN with the chains that continue it.
 *
 * "Jirón Los Pinos" goes on past the crossing and the base map delivers it in
 * pieces. Keeping only the one under the finger put half the street into the
 * work and left the handle with nothing to stretch: it was not that it could
 * not be trimmed, the geometry ended at the corner.
 *
 * Only what TOUCHES an end (`CHAIN_GAP_M`) is attached, one at a time, so an
 * avenue that repeats its name in another neighbourhood does not get in just
 * for being in the list.
 */
export const growChain = (chains: LatLng[][], chosen: LatLng[]): LatLng[] => {
  const loose = chains.filter((chain) => chain !== chosen && chain.length >= 2);
  let grown = [...chosen];
  let didGrow = true;

  while (didGrow) {
    didGrow = false;
    for (let index = 0; index < loose.length; index += 1) {
      const attached = attachAtTouchingEnd(grown, loose[index], CHAIN_GAP_M);
      if (attached) {
        grown = attached;
        loose.splice(index, 1);
        didGrow = true;
        break;
      }
    }
  }

  return grown;
};

/**
 * How many chains were left OUTSIDE the grown street.
 *
 * They are the ones carrying the same name but lying elsewhere —an avenue
 * repeats its name across half the city—. The editor warns with this, and now
 * the warning means something: before, it also counted the chains that really
 * were the continuation.
 */
const chainsLeftOver = (chains: LatLng[][], chosen: LatLng[], grown: LatLng[]): number =>
  chains.filter(
    (chain) =>
      chain !== chosen &&
      chain.length >= 2 &&
      !grown.some((point) => haversineMeters(point, chain[0]) <= CHAIN_GAP_M)
  ).length;

const sameName = (left: string, right: string): boolean =>
  left.toLocaleLowerCase('es-PE') === right.toLocaleLowerCase('es-PE');

/**
 * Axis of the tapped street. `features` comes ordered top to bottom, so the
 * first one with line geometry is the one the finger picked.
 *
 * With `tap`, the chain CLOSEST to the finger is chosen instead of the longest:
 * an avenue repeats its name across half the city, and keeping the longest
 * chunk would return a block in another district.
 */
export const streetFromBasemapFeatures = (
  features: BasemapFeatureLike[],
  tap?: LatLng
): BasemapStreet | null => {
  const usable = (features ?? []).filter((feature) => linesOf(feature).length > 0);
  // Named first: in OpenMapTiles tiles the geometry lives in `transportation`
  // (anonymous) and the name in `transportation_name`, and the anonymous one
  // tends to be on top. Keeping that one would leave the street without a name
  // and without anything to group its tile pieces by.
  const tapped = usable.find((feature) => nameOf(feature) !== '') ?? usable[0];
  if (!tapped) return null;

  const name = nameOf(tapped);
  // Without a name there is nothing to group by: joining every anonymous piece
  // in view would build a monster crossing half the city. Only the tapped one.
  const pieces = name
    ? usable.filter((feature) => sameName(nameOf(feature), name)).flatMap(linesOf)
    : linesOf(tapped);

  const chains = joinTileSegments(pieces);
  if (chains.length === 0 || chains[0].length < 2) return null;

  const chosen = tap ? nearestChain(chains, tap) : chains[0];
  // The street goes on past the crossing: the chains that continue it are
  // attached. Whatever stays loose is what really lies elsewhere.
  const line = growChain(chains, chosen);
  return { name, line, extraChains: chainsLeftOver(chains, chosen, line) };
};

/** How far from the tap the named road is accepted to be. */
const NAME_LOOKUP_RADIUS_M = 25;

/**
 * Name of the named road closest to the tap.
 *
 * Needed because names travel in ANOTHER tile layer (`transportation_name`)
 * and **are only drawn where the label fits**: asking what is painted under the
 * finger for its name returns empty along most of the block. Here the roads of
 * the tiles already loaded are searched, by proximity.
 */
export const nameNearestTo = (
  features: BasemapFeatureLike[],
  tap: LatLng,
  maxDistanceM: number = NAME_LOOKUP_RADIUS_M
): string => {
  let best = '';
  let bestDistance = maxDistanceM;

  (features ?? []).forEach((feature) => {
    const name = nameOf(feature);
    if (!name) return;
    linesOf(feature).forEach((line) => {
      const projected = projectToLine(line, tap);
      if (projected && projected.distanceM < bestDistance) {
        bestDistance = projected.distanceM;
        best = name;
      }
    });
  });

  return best;
};
