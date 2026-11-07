import { nameNearestTo, streetFromBasemapFeatures, type BasemapFeatureLike, type BasemapStreet } from './basemapStreet';
import type { LatLng } from './streetGeometry';

/**
 * The street under the finger (audit 07/11, José: «audítalo y mejóralo»). `streetFromBasemapFeatures`
 * takes the first named feature as the tapped one; a map asked for everything in view hands back any
 * street first. Here the features under the finger decide which road it is, and the ones around
 * only give it its name and its continuation. Rivers and canals, which are lines too, never count.
 *
 * PURE: Portal and Lilachat ask their maps and pass the features here.
 */
const ROAD_CLASSES = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service', 'track', 'path', 'busway', 'raceway', 'motorway_construction', 'trunk_construction', 'primary_construction', 'secondary_construction', 'tertiary_construction', 'minor_construction']);

/** A road of the OpenMapTiles `transportation` layers, by its class; no class at all is taken as a road. */
export function isRoadFeature(feature: BasemapFeatureLike): boolean {
  const kind = feature?.properties?.class;
  return typeof kind !== 'string' || ROAD_CLASSES.has(kind);
}

const nameOfFirst = (features: BasemapFeatureLike[]): string => {
  for (const feature of features) {
    const name = feature?.properties?.name;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  return '';
};

/** What the map gives at a tap: what is drawn under the finger, and what else is loaded around. */
export type TapFeatures = { underFinger: BasemapFeatureLike[]; nearby: BasemapFeatureLike[]; tap: LatLng };

export function streetAtTap({ underFinger, nearby, tap }: TapFeatures): BasemapStreet | null {
  const roads = underFinger.filter(isRoadFeature);
  const around = nearby.filter(isRoadFeature);
  const name = nameOfFirst(roads) || nameNearestTo(around, tap);
  if (!roads.length) return null;
  if (!name) return streetFromBasemapFeatures(roads, tap);
  const named = (feature: BasemapFeatureLike) => ({ ...feature, properties: { ...(feature.properties ?? {}), name } });
  // The anonymous pieces under the finger take the street's name, so they join its named pieces around.
  const sameStreet = around.filter((feature) => feature?.properties?.name === name);
  return streetFromBasemapFeatures([...roads.map(named), ...sameStreet], tap);
}
