import { type BasemapFeatureLike, type BasemapStreet } from './basemapStreet';
import type { LatLng } from './streetGeometry';
/** A road of the OpenMapTiles `transportation` layers, by its class; no class at all is taken as a road. */
export declare function isRoadFeature(feature: BasemapFeatureLike): boolean;
/** What the map gives at a tap: what is drawn under the finger, and what else is loaded around. */
export type TapFeatures = {
    underFinger: BasemapFeatureLike[];
    nearby: BasemapFeatureLike[];
    tap: LatLng;
};
export declare function streetAtTap({ underFinger, nearby, tap }: TapFeatures): BasemapStreet | null;
