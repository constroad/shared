"use strict";
/**
 * Base map layers and styles shared by every street editor.
 *
 * The tiles are OpenFreeMap's: vector tiles that are FREE, with no token, no
 * limits and no card (data © OpenStreetMap), compatible with MapLibre GL.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapStyleForTheme = exports.NAMED_ROAD_LAYER = exports.ROAD_SOURCE_LAYERS = void 0;
/**
 * Road layers of the OpenMapTiles tiles. The geometry is in `transportation`;
 * the name, in `transportation_name`. Both are queried and
 * `streetFromBasemapFeatures` decides.
 */
exports.ROAD_SOURCE_LAYERS = ['transportation', 'transportation_name'];
/** Tile layer that carries the road NAMES. */
exports.NAMED_ROAD_LAYER = 'transportation_name';
/** Tile style for the theme. */
const mapStyleForTheme = (dark) => dark
    ? 'https://tiles.openfreemap.org/styles/dark'
    : 'https://tiles.openfreemap.org/styles/liberty';
exports.mapStyleForTheme = mapStyleForTheme;
