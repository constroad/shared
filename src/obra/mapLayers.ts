/**
 * Base map layers and styles shared by every street editor.
 *
 * The tiles are OpenFreeMap's: vector tiles that are FREE, with no token, no
 * limits and no card (data © OpenStreetMap), compatible with MapLibre GL.
 */

/**
 * Road layers of the OpenMapTiles tiles. The geometry is in `transportation`;
 * the name, in `transportation_name`. Both are queried and
 * `streetFromBasemapFeatures` decides.
 */
export const ROAD_SOURCE_LAYERS = ['transportation', 'transportation_name'];

/** Tile layer that carries the road NAMES. */
export const NAMED_ROAD_LAYER = 'transportation_name';

/** Tile style for the theme. */
export const mapStyleForTheme = (dark: boolean): string =>
  dark
    ? 'https://tiles.openfreemap.org/styles/dark'
    : 'https://tiles.openfreemap.org/styles/liberty';
