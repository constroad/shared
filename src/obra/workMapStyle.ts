/**
 * The flat base map of the work map, the same one Lilachat draws (José, 09/11/2026:
 * the Portal map looked ugly and 3D). OpenFreeMap's `liberty` style extrudes the
 * buildings (`fill-extrusion`), and with the camera's perspective their walls show
 * even on a flat view. This style paints the buildings as plain blocks, so the
 * colored lines of the work are what stands out.
 *
 * Same free tiles (no token, data from OpenStreetMap). The road layers keep their
 * OpenMapTiles names, because a tap on a street reads them (`ROAD_SOURCE_LAYERS`).
 * MapLibre paint cannot read CSS variables: the colors are literal HSL, in one place.
 */
export type MapStyleLayer = {
  id: string;
  type: 'background' | 'fill' | 'line' | 'symbol';
  source?: string;
  'source-layer'?: string;
  minzoom?: number;
  filter?: unknown[];
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
};

export type MapStyle = {
  version: 8;
  name: string;
  sources: Record<string, { type: 'vector'; url: string }>;
  glyphs: string;
  layers: MapStyleLayer[];
};

const TILES = 'openmaptiles';
const TILES_URL = 'https://tiles.openfreemap.org/planet';
const GLYPHS_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
const FONT_BOLD = ['Noto Sans Bold'];
const FONT_REGULAR = ['Noto Sans Regular'];

const GROUND = 'hsl(222, 20%, 94%)';
const BLOCK = 'hsl(0, 0%, 100%)';
const BLOCK_EDGE = 'hsl(222, 16%, 86%)';
const PARK = 'hsl(142, 52%, 91%)';
const PARK_EDGE = 'hsl(142, 40%, 76%)';
const PARK_TEXT = 'hsl(142, 55%, 28%)';
const WATER = 'hsl(204, 70%, 87%)';
const ROAD = 'hsl(0, 0%, 100%)';
const ROAD_EDGE = 'hsl(222, 14%, 82%)';
const MAJOR_ROAD = 'hsl(45, 90%, 88%)';
const MAJOR_EDGE = 'hsl(40, 55%, 72%)';
const LABEL = 'hsl(222, 12%, 38%)';
const PLACE_LABEL = 'hsl(222, 14%, 30%)';
const HALO = 'hsl(0, 0%, 100%)';

const BLOCK_MIN_ZOOM = 14;
const STREET_NAME_MIN_ZOOM = 14;
const PARK_NAME_MIN_ZOOM = 15;
/** Width of a block-level street, in pixels, as the base the zoom interpolates from. */
const STREET_WIDTH = 9;
const AVENUE_WIDTH = 13;
const EDGE_EXTRA_WIDTH = 2;

/** The local name, which in Peru is the Spanish one («Jirón Moquegua»), in capitals. */
const SPANISH_NAME = ['upcase', ['coalesce', ['get', 'name'], ['get', 'name:latin']]];
const MAJOR = ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary'], true, false];
const STREETS = ['match', ['get', 'class'], ['tertiary', 'minor', 'service', 'track'], true, false];

/** Width that grows with the zoom: a block-level street is wide, like the design. */
const width = (atBlock: number) => ['interpolate', ['exponential', 1.6], ['zoom'], 12, atBlock * 0.15, 15, atBlock * 0.55, 18, atBlock * 2.4];

const roadLayers = (id: string, filter: unknown[], fill: string, edge: string, atBlock: number): MapStyleLayer[] => [
  { id: `${id}-edge`, type: 'line', source: TILES, 'source-layer': 'transportation', filter, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': edge, 'line-width': width(atBlock + EDGE_EXTRA_WIDTH) } },
  { id, type: 'line', source: TILES, 'source-layer': 'transportation', filter, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': fill, 'line-width': width(atBlock) } },
];

const groundLayers: MapStyleLayer[] = [
  { id: 'ground', type: 'background', paint: { 'background-color': GROUND } },
  { id: 'water', type: 'fill', source: TILES, 'source-layer': 'water', paint: { 'fill-color': WATER } },
  { id: 'park', type: 'fill', source: TILES, 'source-layer': 'park', paint: { 'fill-color': PARK, 'fill-outline-color': PARK_EDGE } },
  { id: 'green', type: 'fill', source: TILES, 'source-layer': 'landcover', filter: ['match', ['get', 'class'], ['grass', 'wood'], true, false], paint: { 'fill-color': PARK } },
  { id: 'block', type: 'fill', source: TILES, 'source-layer': 'building', minzoom: BLOCK_MIN_ZOOM, paint: { 'fill-color': BLOCK, 'fill-outline-color': BLOCK_EDGE } },
];

const labelLayers: MapStyleLayer[] = [
  {
    id: 'street-name',
    type: 'symbol',
    source: TILES,
    'source-layer': 'transportation_name',
    minzoom: STREET_NAME_MIN_ZOOM,
    layout: { 'symbol-placement': 'line', 'text-field': SPANISH_NAME, 'text-font': FONT_BOLD, 'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10, 18, 13], 'text-letter-spacing': 0.12, 'text-max-angle': 30 },
    paint: { 'text-color': LABEL, 'text-halo-color': HALO, 'text-halo-width': 1.6 },
  },
  {
    id: 'park-name',
    type: 'symbol',
    source: TILES,
    'source-layer': 'park',
    minzoom: PARK_NAME_MIN_ZOOM,
    layout: { 'text-field': SPANISH_NAME, 'text-font': FONT_BOLD, 'text-size': 11, 'text-letter-spacing': 0.1, 'text-max-width': 8 },
    paint: { 'text-color': PARK_TEXT, 'text-halo-color': HALO, 'text-halo-width': 1.2 },
  },
  {
    id: 'place-name',
    type: 'symbol',
    source: TILES,
    'source-layer': 'place',
    filter: ['match', ['get', 'class'], ['city', 'town', 'suburb', 'neighbourhood', 'quarter'], true, false],
    layout: { 'text-field': SPANISH_NAME, 'text-font': FONT_REGULAR, 'text-size': ['interpolate', ['linear'], ['zoom'], 10, 11, 16, 14], 'text-letter-spacing': 0.15, 'text-max-width': 9 },
    paint: { 'text-color': PLACE_LABEL, 'text-halo-color': HALO, 'text-halo-width': 1.6 },
  },
];

export const WORK_MAP_STYLE: MapStyle = {
  version: 8,
  name: 'ConStroad · mapa de obra',
  sources: { [TILES]: { type: 'vector', url: TILES_URL } },
  glyphs: GLYPHS_URL,
  layers: [...groundLayers, ...roadLayers('street', STREETS, ROAD, ROAD_EDGE, STREET_WIDTH), ...roadLayers('avenue', MAJOR, MAJOR_ROAD, MAJOR_EDGE, AVENUE_WIDTH), ...labelLayers],
};
