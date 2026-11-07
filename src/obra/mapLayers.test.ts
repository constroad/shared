import { NAMED_ROAD_LAYER, ROAD_SOURCE_LAYERS, mapStyleForTheme } from './mapLayers';

describe('mapStyleForTheme', () => {
  it('el tema oscuro usa el estilo dark de OpenFreeMap', () => {
    expect(mapStyleForTheme(true)).toBe('https://tiles.openfreemap.org/styles/dark');
  });

  it('el tema claro usa el estilo liberty', () => {
    expect(mapStyleForTheme(false)).toBe('https://tiles.openfreemap.org/styles/liberty');
  });
});

describe('capas de vías', () => {
  it('se consultan la geometría y la capa de nombres', () => {
    // Geometry lives in `transportation` and the name in `transportation_name`.
    expect(ROAD_SOURCE_LAYERS).toEqual(['transportation', 'transportation_name']);
    expect(ROAD_SOURCE_LAYERS).toContain(NAMED_ROAD_LAYER);
  });
});
