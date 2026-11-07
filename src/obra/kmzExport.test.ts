import { buildWorkStreetsKml, buildWorkStreetsKmz, kmlColor } from './kmzExport';

describe('buildWorkStreetsKmz', () => {
  it('is a zip that holds doc.kml with the map inside', () => {
    // Act
    const bytes = buildWorkStreetsKmz('<kml/>');
    const text = new TextDecoder().decode(bytes);

    // Assert: the local file signature «PK\x03\x04», the name and the stored content.
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(text).toContain('doc.kml');
    expect(text).toContain('<kml/>');
  });
});

/**
 * KMZ export to keep viewing the work in Google Earth, which is where the
 * client and the supervision already look at the drawings.
 *
 * What is tested here is what makes the file OPEN and look right: the color
 * byte order (KML does not use RGB), XML escaping, and that the work done is
 * told apart from what is missing.
 */

const STREET = {
  _id: 'street-1',
  name: 'Jr. Lima',
  geometry: [
    { lat: -12.0, lng: -76.9 },
    { lat: -12.001, lng: -76.9 },
  ],
  lengthM: 111.2,
};

const SCOPE = { _id: 'scope-1', streetId: 'street-1', fromM: 0, toM: 111.2, partidaIds: ['p1'] };

const PARTIDAS = [{ _id: 'p1', description: 'Base granular' }];

const build = (over: Record<string, unknown> = {}) =>
  buildWorkStreetsKml({
    obraName: 'Obra QA',
    streets: [STREET],
    scopes: [SCOPE],
    progress: [{ streetId: 'street-1', workId: 'p1', fromM: 0, toM: 55.6, date: '2026-08-01' }],
    partidas: PARTIDAS,
    ...over,
  });

describe('kmlColor', () => {
  it('invierte el orden: KML es AABBGGRR, no RGB', () => {
    // It is THE classic KML mistake. With CSS order, the base's brown comes out
    // light blue in Google Earth and the drawing stops being readable.
    expect(kmlColor('#a16207')).toBe('ff0762a1');
  });

  it('acepta el hex sin numeral', () => {
    expect(kmlColor('1f2937')).toBe('ff37291f');
  });

  it('un color inválido no rompe el archivo', () => {
    expect(kmlColor('rojo')).toMatch(/^ff[0-9a-f]{6}$/);
  });
});

describe('buildWorkStreetsKml', () => {
  it('es un KML con la obra como documento', () => {
    const kml = build();

    expect(kml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(kml).toContain('<kml xmlns="http://www.opengis.net/kml/2.2">');
    expect(kml).toContain('<name>Obra QA</name>');
  });

  it('dibuja lo trabajado con el color de su partida', () => {
    const kml = build();

    expect(kml).toContain('Base granular');
    expect(kml).toContain('<LineString>');
    expect(kml).toContain(kmlColor('#a16207'));
  });

  it('las coordenadas van lng,lat — al revés que en la app', () => {
    // KML wants longitude first. Swapping it sends the work to China.
    const kml = build();

    expect(kml).toContain('-76.9,-12');
  });

  it('separa lo trabajado de lo que falta', () => {
    const kml = build();

    expect(kml).toContain('Ejecutado');
    expect(kml).toContain('Pendiente');
  });

  it('escapa el XML: una obra puede llamarse "Av. Perú & Cía."', () => {
    const kml = build({ obraName: 'Av. Perú & Cía. <2026>' });

    expect(kml).toContain('Av. Perú &amp; Cía. &lt;2026&gt;');
    expect(kml).not.toContain('& C');
  });

  it('reconstruye a una fecha: el mismo día del slider', () => {
    const kml = build({ upToDate: '2026-07-01' });

    // Nothing approved at that date: no executed stretch to draw.
    expect(kml).not.toContain('Ejecutado');
    expect(kml).toContain('Pendiente');
  });

  it('una calle sin partidas igual se exporta: el área es la que es', () => {
    const kml = build({ scopes: [{ ...SCOPE, partidaIds: [] }], progress: [] });

    expect(kml).toContain('Jr. Lima');
  });

  it('sin calles devuelve un KML válido y vacío', () => {
    const kml = build({ streets: [], scopes: [], progress: [] });

    expect(kml).toContain('</kml>');
    expect(kml).not.toContain('<LineString>');
  });
});

describe('el KMZ también exporta el avance por ETIQUETA', () => {
  // It used to be filtered out: the exporter only understood partidas, so what
  // was sent to Google Earth did NOT show the new progress (José, 30/08/2026).
  const MILLING_TAG = { _id: 't1', name: 'Fresado día 1', color: '#ef4444' };

  it('pinta el tramo con el COLOR de la etiqueta, no con uno derivado', () => {
    const kml = build({
      scopes: [{ ...SCOPE, tagIds: ['t1'], partidaIds: [] }],
      progress: [{ streetId: 'street-1', workId: 't1', fromM: 0, toM: 55.6, date: '2026-08-01' }],
      tags: [MILLING_TAG],
    });

    // KML uses AABBGGRR: #ef4444 → ff4444ef.
    expect(kml).toContain('ff4444ef');
  });

  it('la carpeta lleva el NOMBRE de la etiqueta, no «Partida»', () => {
    const kml = build({
      scopes: [{ ...SCOPE, tagIds: ['t1'], partidaIds: [] }],
      progress: [{ streetId: 'street-1', workId: 't1', fromM: 0, toM: 55.6, date: '2026-08-01' }],
      tags: [MILLING_TAG],
    });

    expect(kml).toContain('<name>Fresado día 1</name>');
    expect(kml).not.toContain('<name>Partida</name>');
  });

  it('un tramo con etiquetas Y partidas se exporta por la ETIQUETA', () => {
    // Same rule as the rest of the module: the tag wins.
    const kml = build({
      scopes: [{ ...SCOPE, tagIds: ['t1'], partidaIds: ['p1'] }],
      progress: [{ streetId: 'street-1', workId: 't1', fromM: 0, toM: 55.6, date: '2026-08-01' }],
      tags: [MILLING_TAG],
    });

    expect(kml).toContain('Fresado día 1');
  });

  it('sin etiquetas sigue funcionando por partida: lo viejo no se rompe', () => {
    const kml = build({
      scopes: [SCOPE],
      progress: [{ streetId: 'street-1', workId: 'p1', fromM: 0, toM: 55.6, date: '2026-08-01' }],
    });

    // `p1` is «Base granular» in the test partidas.
    expect(kml).toContain('<name>Base granular</name>');
  });
});
