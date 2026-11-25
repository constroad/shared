import { type LatLng } from './streetGeometry';
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
    geometry?: {
        type?: string;
        coordinates?: unknown;
    } | null;
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
export declare const growChain: (chains: LatLng[][], chosen: LatLng[]) => LatLng[];
/**
 * Axis of the tapped street. `features` comes ordered top to bottom, so the
 * first one with line geometry is the one the finger picked.
 *
 * With `tap`, the chain CLOSEST to the finger is chosen instead of the longest:
 * an avenue repeats its name across half the city, and keeping the longest
 * chunk would return a block in another district.
 */
export declare const streetFromBasemapFeatures: (features: BasemapFeatureLike[], tap?: LatLng) => BasemapStreet | null;
/**
 * Name of the named road closest to the tap.
 *
 * Needed because names travel in ANOTHER tile layer (`transportation_name`)
 * and **are only drawn where the label fits**: asking what is painted under the
 * finger for its name returns empty along most of the block. Here the roads of
 * the tiles already loaded are searched, by proximity.
 */
export declare const nameNearestTo: (features: BasemapFeatureLike[], tap: LatLng, maxDistanceM?: number) => string;
