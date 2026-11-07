import { buildWorkStreetsKml } from './kmzExport';

/**
 * The options Lilachat needed to drop its own KML (07/11): filters by stage and work, the planned
 * stretches as «Pendiente» and the stations as names. Without options the file must stay byte for
 * byte what Portal exports today: the golden strings below were taken from v0.7.0.
 */

const streets = [
  { _id: 's1', name: 'Av. Perú & Cía.', geometry: [{ lat: -12, lng: -77 }, { lat: -12, lng: -76.99 }], lengthM: 1087.6 },
  { _id: 's2', name: 'Jr. Los Pinos', geometry: [{ lat: -12.01, lng: -77 }, { lat: -12.01, lng: -76.995 }], lengthM: 543.8 },
  { _id: 's3', name: 'Psje. Sin Alcance', geometry: [{ lat: -12.02, lng: -77 }, { lat: -12.02, lng: -76.998 }], lengthM: 217.5 },
];
const scopes = [
  { _id: 'a1', streetId: 's1', fromM: 0, toM: 400, tagIds: ['base', 'asfalto'], stageId: 'e1' },
  { _id: 'a2', streetId: 's2', fromM: 40, toM: 540, partidaIds: ['p1'], stageId: 'e2' },
];
const progress = [
  { streetId: 's1', workId: 'base', fromM: 0, toM: 200, date: '2026-11-04' },
  { streetId: 's1', workId: 'base', fromM: 200, toM: 400, date: '2026-11-05' },
  { streetId: 's1', workId: 'asfalto', fromM: 0, toM: 120, date: '2026-11-05' },
  { streetId: 's2', workId: 'p1', fromM: 40, toM: 150, date: '2026-11-03' },
  { streetId: 's2', workId: 'p1', fromM: 60, toM: 90, date: '2026-11-06', rework: true },
];
const tags = [{ _id: 'base', name: 'Base', color: '#b45309' }, { _id: 'asfalto', name: 'Asfaltado', color: '#111827' }];
const partidas = [{ _id: 'p1', description: 'Imprimación' }];
const work = { obraName: 'Pavimentación Los Incas', streets, scopes, progress, partidas, tags };

const GOLDEN_ALL = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Pavimentación Los Incas</name><Style id="pendiente"><LineStyle><color>aab8a394</color><width>4</width></LineStyle></Style><Style id="p-base"><LineStyle><color>ff0953b4</color><width>6</width></LineStyle></Style><Style id="p-asfalto"><LineStyle><color>ff271811</color><width>6</width></LineStyle></Style><Style id="p-p1"><LineStyle><color>fff6823b</color><width>6</width></LineStyle></Style><Folder><name>Ejecutado</name><Folder><name>Base</name><Placemark><name>Av. Perú &amp; Cía. · 0–400 m</name><styleUrl>#p-base</styleUrl><LineString><tessellate>1</tessellate><coordinates>-77,-12,0 -76.9963223531373,-12,0</coordinates></LineString></Placemark></Folder><Folder><name>Asfaltado</name><Placemark><name>Av. Perú &amp; Cía. · 0–120 m</name><styleUrl>#p-asfalto</styleUrl><LineString><tessellate>1</tessellate><coordinates>-77,-12,0 -76.99889670594119,-12,0</coordinates></LineString></Placemark></Folder><Folder><name>Imprimación</name><Placemark><name>Jr. Los Pinos · 40–150 m</name><styleUrl>#p-p1</styleUrl><LineString><tessellate>1</tessellate><coordinates>-76.99963222166426,-12.01,0 -76.99862083124097,-12.01,0</coordinates></LineString></Placemark></Folder></Folder><Folder><name>Pendiente</name><Placemark><name>Av. Perú &amp; Cía.</name><styleUrl>#pendiente</styleUrl><LineString><tessellate>1</tessellate><coordinates>-77,-12,0 -76.99,-12,0</coordinates></LineString></Placemark><Placemark><name>Jr. Los Pinos</name><styleUrl>#pendiente</styleUrl><LineString><tessellate>1</tessellate><coordinates>-77,-12.01,0 -76.995,-12.01,0</coordinates></LineString></Placemark><Placemark><name>Psje. Sin Alcance</name><styleUrl>#pendiente</styleUrl><LineString><tessellate>1</tessellate><coordinates>-77,-12.02,0 -76.998,-12.02,0</coordinates></LineString></Placemark></Folder></Document></kml>`;
const GOLDEN_CUT = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Pavimentación Los Incas</name><Style id="pendiente"><LineStyle><color>aab8a394</color><width>4</width></LineStyle></Style><Style id="p-base"><LineStyle><color>ff0953b4</color><width>6</width></LineStyle></Style><Style id="p-asfalto"><LineStyle><color>ff271811</color><width>6</width></LineStyle></Style><Style id="p-p1"><LineStyle><color>fff6823b</color><width>6</width></LineStyle></Style><Folder><name>Ejecutado</name><Folder><name>Base</name><Placemark><name>Av. Perú &amp; Cía. · 0–200 m</name><styleUrl>#p-base</styleUrl><LineString><tessellate>1</tessellate><coordinates>-77,-12,0 -76.99816117656864,-12,0</coordinates></LineString></Placemark></Folder><Folder><name>Imprimación</name><Placemark><name>Jr. Los Pinos · 40–150 m</name><styleUrl>#p-p1</styleUrl><LineString><tessellate>1</tessellate><coordinates>-76.99963222166426,-12.01,0 -76.99862083124097,-12.01,0</coordinates></LineString></Placemark></Folder></Folder><Folder><name>Pendiente</name><Placemark><name>Av. Perú &amp; Cía.</name><styleUrl>#pendiente</styleUrl><LineString><tessellate>1</tessellate><coordinates>-77,-12,0 -76.99,-12,0</coordinates></LineString></Placemark><Placemark><name>Jr. Los Pinos</name><styleUrl>#pendiente</styleUrl><LineString><tessellate>1</tessellate><coordinates>-77,-12.01,0 -76.995,-12.01,0</coordinates></LineString></Placemark><Placemark><name>Psje. Sin Alcance</name><styleUrl>#pendiente</styleUrl><LineString><tessellate>1</tessellate><coordinates>-77,-12.02,0 -76.998,-12.02,0</coordinates></LineString></Placemark></Folder></Document></kml>`;

const folder = (kml: string, name: string): string => {
  const start = kml.indexOf(`<Folder><name>${name}</name>`);
  if (start < 0) return '';
  let depth = 0;
  for (let at = start; at < kml.length; at += 1) {
    if (kml.startsWith('<Folder>', at)) depth += 1;
    if (kml.startsWith('</Folder>', at)) depth -= 1;
    if (depth === 0) return kml.slice(start, at + '</Folder>'.length);
  }
  return kml.slice(start);
};
const count = (text: string, piece: string): number => text.split(piece).length - 1;

describe('buildWorkStreetsKml without options', () => {
  it('stays exactly the KML Portal exports today', () => {
    // Act
    const all = buildWorkStreetsKml(work);
    const cut = buildWorkStreetsKml({ ...work, upToDate: '2026-11-04' });

    // Assert
    expect(all).toBe(GOLDEN_ALL);
    expect(cut).toBe(GOLDEN_CUT);
  });
});

describe('buildWorkStreetsKml labels', () => {
  it('names each executed stretch by its stations when asked', () => {
    // Act
    const kml = buildWorkStreetsKml({ ...work, labels: 'progresiva' });

    // Assert
    expect(kml).toContain('<name>Av. Perú &amp; Cía. · 0+000 a 0+120</name>');
    expect(kml).toContain('<name>Jr. Los Pinos · 0+040 a 0+150</name>');
    expect(kml).not.toContain('0–120 m');
  });
});

describe('buildWorkStreetsKml pending', () => {
  it('«planned» draws each planned stretch and the streets without one', () => {
    // Act
    const pending = folder(buildWorkStreetsKml({ ...work, pending: 'planned' }), 'Pendiente');

    // Assert: s1 0–400 is a slice, not the whole street; s3 has no scope and goes whole.
    expect(count(pending, '<Placemark>')).toBe(3);
    expect(pending).not.toContain('-76.99,-12,0');
    expect(pending).toContain('-76.998,-12.02,0');
  });

  it('a planned stretch too short to draw is left out instead of an empty line', () => {
    // Arrange
    const tiny = [{ _id: 'a9', streetId: 's3', fromM: 10, toM: 10, tagIds: ['base'] }];

    // Act
    const pending = folder(buildWorkStreetsKml({ ...work, scopes: tiny, pending: 'planned' }), 'Pendiente');

    // Assert: s3's only scope has no length; s1 and s2 have no scope and go whole.
    expect(count(pending, '<Placemark>')).toBe(2);
    expect(pending).not.toContain('Psje. Sin Alcance');
  });
});

describe('buildWorkStreetsKml filters', () => {
  it('a stage keeps only its scopes and the streets they touch', () => {
    // Act
    const kml = buildWorkStreetsKml({ ...work, stageId: 'e2' });

    // Assert
    expect(folder(kml, 'Ejecutado')).toContain('<Folder><name>Imprimación</name>');
    expect(kml).not.toContain('Av. Perú');
    expect(kml).not.toContain('Psje. Sin Alcance');
    expect(count(folder(kml, 'Pendiente'), '<Placemark>')).toBe(1);
    expect(kml).not.toContain('<Style id="p-base">');
  });

  it('a work keeps only its folder, its style and the streets where it applies', () => {
    // Act
    const kml = buildWorkStreetsKml({ ...work, works: ['asfalto'], pending: 'planned' });

    // Assert
    expect(folder(kml, 'Ejecutado')).toContain('<Folder><name>Asfaltado</name>');
    expect(kml).not.toContain('<name>Base</name>');
    expect(kml).not.toContain('<Style id="p-base">');
    expect(kml).not.toContain('Jr. Los Pinos');
    expect(count(folder(kml, 'Pendiente'), '<Placemark>')).toBe(1);
  });

  it('a stage without progress exports only what is pending', () => {
    // Act
    const kml = buildWorkStreetsKml({ ...work, stageId: 'e2', upToDate: '2026-11-01' });

    // Assert
    expect(kml).not.toContain('<name>Ejecutado</name>');
    expect(folder(kml, 'Pendiente')).toContain('<name>Jr. Los Pinos</name>');
  });

  it('a filter that matches nothing gives a valid empty document', () => {
    // Act
    const kml = buildWorkStreetsKml({ ...work, works: ['missing'] });

    // Assert
    expect(kml).toContain('<Document><name>Pavimentación Los Incas</name>');
    expect(kml).not.toContain('<Placemark>');
    expect(kml.endsWith('</Document></kml>')).toBe(true);
  });
});
