import { PHOTO_SPOT_M, photoLayerFiles, photoSpotTitle, photoSpotsOf, placeOnStreets, type MapPhoto, type MediaStreet } from './mapPhotos';

/**
 * The «Fotos» layer of the work map (José, 09/11/2026): a photo lands on its street and
 * chainage and photos of the same spot share one marker. Ported from Portal and Lilachat.
 */
/** Each app names the source of a photo; this is the one Portal and Lilachat use for these cases. */
const label = (photo: Pick<MapPhoto, 'reportType' | 'plate'>): string =>
  photo.reportType === 'CTL-PIS' ? `Control de pista${photo.plate ? ` · ${photo.plate}` : ''}` : photo.plate ? `Unidad ${photo.plate}` : 'Avance registrado';
const LAT = -12;
/** ~109 m per 0.001° of longitude at this latitude. */
const lngAt = (meters: number) => -77 + meters / 108_900;
const STREET_A: MediaStreet = { _id: 'a', name: 'Jr. Conchucos', geometry: [{ lat: LAT, lng: lngAt(0) }, { lat: LAT, lng: lngAt(400) }] };
const STREET_B: MediaStreet = { _id: 'b', name: 'Av. Los Incas', geometry: [{ lat: LAT - 0.01, lng: lngAt(0) }, { lat: LAT - 0.01, lng: lngAt(400) }] };

const photo = (id: string, atMeters: number, extra: Partial<MapPhoto> = {}, lat = LAT): MapPhoto => ({
  id,
  lat,
  lng: lngAt(atMeters),
  at: `2026-11-07T20:0${id.length}:00.000Z`,
  kind: 'photo',
  url: `https://lila.constroad.com/files/${id}.jpg`,
  thumbnailUrl: `https://lila.constroad.com/files/${id}-t.jpg`,
  ...extra,
});

describe('placeOnStreets', () => {
  it('puts a photo on the street within reach, with its chainage', () => {
    const placed = placeOnStreets([STREET_A, STREET_B], photo('p1', 100));

    expect(placed.streetId).toBe('a');
    expect(placed.atM).toBeGreaterThan(95);
    expect(placed.atM).toBeLessThan(105);
  });

  it('a photo farther than the reach of every street fell off the work', () => {
    expect(placeOnStreets([STREET_A], photo('p1', 100, {}, LAT - 0.001)).streetId).toBeNull();
  });

  it('with no streets drawn, every photo is off the work', () => {
    expect(placeOnStreets([], photo('p1', 100)).streetId).toBeNull();
  });
});

describe('photoSpotsOf', () => {
  it('photos within a few meters on a street share one spot, newest first', () => {
    const spots = photoSpotsOf([STREET_A], [photo('p1', 100), photo('p22', 100 + PHOTO_SPOT_M - 5), photo('p3', 300)]);

    expect(spots).toHaveLength(2);
    expect(spots[0]!.photos.map((one) => one.id)).toEqual(['p22', 'p1']);
    expect(spots[0]).toMatchObject({ streetId: 'a', streetName: 'Jr. Conchucos' });
    expect(spots[1]!.photos.map((one) => one.id)).toEqual(['p3']);
  });

  it('goes street by street in the map order, along each from the start, and the loose ones last', () => {
    const spots = photoSpotsOf([STREET_A, STREET_B], [photo('far', 100, {}, LAT + 0.05), photo('onB', 50, {}, LAT - 0.01), photo('onA2', 300), photo('onA1', 20)]);

    expect(spots.map((spot) => spot.photos[0]!.id)).toEqual(['onA1', 'onA2', 'onB', 'far']);
    expect(spots[3]).toMatchObject({ streetId: null, atM: null });
  });

  it('loose photos close to each other are one spot too', () => {
    const spots = photoSpotsOf([], [photo('x1', 100), photo('x2', 105)]);

    expect(spots).toHaveLength(1);
    expect(spots[0]!.photos).toHaveLength(2);
  });
});

describe('photoSpotTitle', () => {
  it('names the street and the chainage, or says it fell off the work', () => {
    const [onStreet] = photoSpotsOf([STREET_A], [photo('p1', 44)]);
    const [loose] = photoSpotsOf([], [photo('p2', 44)]);

    expect(photoSpotTitle(onStreet)).toBe('Jr. Conchucos · 0+044');
    expect(photoSpotTitle(loose)).toBe('Fuera de las calles de la obra');
  });

});

describe('photoLayerFiles', () => {
  it('opens at the tapped spot and swipes through every photo of the layer, in the map order', () => {
    const spots = photoSpotsOf([STREET_A], [photo('p1', 20), photo('p2', 150), photo('p33', 160), photo('p4', 350)]);
    const second = spots.find((spot) => spot.photos.length === 2)!;

    const result = photoLayerFiles(spots, `fotos-${second.id}`, label);

    expect(result?.files).toHaveLength(4);
    expect(result?.startIndex).toBe(1);
    expect(result?.files[1]!.url).toContain('p33');
  });

  it('a pin that is not of the layer opens nothing', () => {
    expect(photoLayerFiles([], 'fotos-nope', label)).toBeNull();
  });

  it('each file says where it came from, its place and when', () => {
    const spots = photoSpotsOf([STREET_A], [photo('p1', 44, { reportType: 'CTL-PIS', plate: 'QAA-001' })]);

    const file = photoLayerFiles(spots, `fotos-${spots[0]!.id}`, label)?.files[0];

    expect(file?.title).toBe('Control de pista · QAA-001 · Jr. Conchucos · 0+044');
    expect(file).toMatchObject({ mime: 'image/jpeg', thumbUrl: expect.stringContaining('p1-t'), at: expect.any(String) });
  });

  it('a video says so, and a photo with no report is a registered advance', () => {
    const spots = photoSpotsOf([STREET_A], [photo('v1', 44, { kind: 'video' })]);

    expect(photoLayerFiles(spots, `fotos-${spots[0]!.id}`, label)?.files[0]).toMatchObject({ mime: 'video/mp4', title: expect.stringContaining('Avance registrado') });
  });
});

