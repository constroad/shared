import { stationLabel } from './kmStrip';
import { haversineMeters, pointAtMeasure, projectToLine, type LatLng } from './streetGeometry';

/**
 * The «Fotos» layer of the work map (José, 09/11/2026): every field photo carries
 * where it was taken, so it lands on its street and chainage, and photos of the same
 * spot share one marker. One engine for Lilachat and Portal. Pure: each app draws its
 * own pins and opens its own viewer from here.
 */
export interface MapPhoto {
  id: string;
  lat: number;
  lng: number;
  /** When it was taken; the upload time when the phone did not say. */
  at: string;
  precisionM?: number;
  kind: 'photo' | 'video';
  url: string;
  thumbnailUrl: string;
  reportType?: string;
  reportId?: string;
  reportCode?: string;
  dispatchId?: string;
  plate?: string;
  tipoFoto?: string;
}

/** A street as the photo layer needs it: where it runs. */
export interface MediaStreet {
  _id: string;
  name: string;
  geometry: LatLng[];
}

/** One spot of the layer: the photos taken within a few meters of each other on a street. */
export interface PhotoSpot<Photo extends MapPhoto = MapPhoto> {
  id: string;
  lat: number;
  lng: number;
  /** The street the photos fall on, or null when they fell off the work. */
  streetId: string | null;
  streetName: string | null;
  /** Meters from the start of the street (its chainage), or null off the work. */
  atM: number | null;
  /** Newest first. */
  photos: Photo[];
}

/** What a viewer needs of one file, in the order of the layer. */
export interface MapViewerFile {
  url: string;
  thumbUrl: string;
  mime: string;
  title: string;
  at: string;
}

/** Photos closer than this along a street are one spot: a dump truck empties over a few meters. */
export const PHOTO_SPOT_M = 15;
/** Farther than this from the axis, a photo is not of that street (the same reach the units use). */
export const PHOTO_STREET_REACH_M = 30;
/** The id a photo spot's pin carries: `fotos-<spot id>`. */
export const PHOTO_PIN_PREFIX = 'fotos-';

const OFF_THE_WORK = 'Fuera de las calles de la obra';
const LOOSE_SPOT_PREFIX = 'fuera-';

/** A photo on its street and chainage; `streetId` null when it fell off the work. */
export type PlacedPhoto<Photo extends MapPhoto = MapPhoto> = { photo: Photo; streetId: string | null; atM: number };

export function placeOnStreets<Photo extends MapPhoto>(streets: readonly MediaStreet[], photo: Photo): PlacedPhoto<Photo> {
  let best: PlacedPhoto<Photo> = { photo, streetId: null, atM: 0 };
  let bestDistance = PHOTO_STREET_REACH_M;
  for (const street of streets) {
    const foot = projectToLine(street.geometry, photo);
    // A tie keeps the first street: two streets drawn over the same road stay in the map's order.
    if (foot && (best.streetId === null ? foot.distanceM <= bestDistance : foot.distanceM < bestDistance)) {
      best = { photo, streetId: street._id, atM: foot.measureM };
      bestDistance = foot.distanceM;
    }
  }
  return best;
}

/** ISO instants order as text: newest first. */
const newestFirst = <Photo extends MapPhoto>(photos: Photo[]): Photo[] => [...photos].sort((left, right) => (left.at < right.at ? 1 : left.at > right.at ? -1 : 0));

function streetSpots<Photo extends MapPhoto>(street: MediaStreet, placed: PlacedPhoto<Photo>[]): PhotoSpot<Photo>[] {
  const groups: PlacedPhoto<Photo>[][] = [];
  for (const one of [...placed].sort((left, right) => left.atM - right.atM)) {
    const last = groups[groups.length - 1];
    if (last && one.atM - last[0]!.atM <= PHOTO_SPOT_M) last.push(one);
    else groups.push([one]);
  }
  return groups.map((group) => {
    const atM = Math.round(group.reduce((total, one) => total + one.atM, 0) / group.length);
    const point = pointAtMeasure(street.geometry, atM) ?? group[0]!.photo;
    return { id: `${street._id}-${atM}`, lat: point.lat, lng: point.lng, streetId: street._id, streetName: street.name, atM, photos: newestFirst(group.map((one) => one.photo)) };
  });
}

function looseSpots<Photo extends MapPhoto>(photos: Photo[]): PhotoSpot<Photo>[] {
  const groups: Photo[][] = [];
  for (const photo of photos) {
    const near = groups.find((group) => haversineMeters(group[0]!, photo) <= PHOTO_SPOT_M);
    if (near) near.push(photo);
    else groups.push([photo]);
  }
  return groups.map((group) => ({ id: `${LOOSE_SPOT_PREFIX}${group[0]!.id}`, lat: group[0]!.lat, lng: group[0]!.lng, streetId: null, streetName: null, atM: null, photos: newestFirst(group) }));
}

/** Street by street in the map's order, along each one from 0+000; the loose ones last. */
export function photoSpotsOf<Photo extends MapPhoto>(streets: readonly MediaStreet[], photos: readonly Photo[]): PhotoSpot<Photo>[] {
  const placed = photos.map((photo) => placeOnStreets(streets, photo));
  const onStreets = streets.flatMap((street) => {
    const mine = placed.filter((one) => one.streetId === street._id);
    return mine.length ? streetSpots(street, mine) : [];
  });
  return [...onStreets, ...looseSpots(placed.filter((one) => one.streetId === null).map((one) => one.photo))];
}

/** «Jr. Los Pinos · 0+044», or that it fell off the work. */
export const photoSpotTitle = (spot: Pick<PhotoSpot, 'streetName' | 'atM'>): string =>
  spot.streetName !== null && spot.atM !== null ? `${spot.streetName} · ${stationLabel(spot.atM)}` : OFF_THE_WORK;

/**
 * A marker opens its own spot first, and the viewer swipes through every spot of the
 * layer, in the map's order. `sourceLabel` names where a photo comes from («Control de
 * pista · QAA-001»): each app has its own report names. `null` when the pin is not of the layer.
 */
export function photoLayerFiles<Photo extends MapPhoto>(spots: readonly PhotoSpot<Photo>[], pinId: string, sourceLabel: (photo: Photo) => string): { startIndex: number; files: MapViewerFile[] } | null {
  const at = spots.findIndex((spot) => `${PHOTO_PIN_PREFIX}${spot.id}` === pinId);
  if (at < 0 || !spots[at]!.photos.length) return null;
  const files = spots.flatMap((spot) =>
    spot.photos.map((photo) => ({
      url: photo.url,
      thumbUrl: photo.thumbnailUrl,
      mime: photo.kind === 'video' ? 'video/mp4' : 'image/jpeg',
      title: `${sourceLabel(photo)} · ${photoSpotTitle(spot)}`,
      at: photo.at,
    })),
  );
  const startIndex = spots.slice(0, at).reduce((sum, spot) => sum + spot.photos.length, 0);
  return { startIndex, files };
}
