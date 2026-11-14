import { type LatLng } from './streetGeometry';
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
export declare const PHOTO_SPOT_M = 15;
/** Farther than this from the axis, a photo is not of that street (the same reach the units use). */
export declare const PHOTO_STREET_REACH_M = 30;
/** The id a photo spot's pin carries: `fotos-<spot id>`. */
export declare const PHOTO_PIN_PREFIX = "fotos-";
/** A photo on its street and chainage; `streetId` null when it fell off the work. */
export type PlacedPhoto<Photo extends MapPhoto = MapPhoto> = {
    photo: Photo;
    streetId: string | null;
    atM: number;
};
export declare function placeOnStreets<Photo extends MapPhoto>(streets: readonly MediaStreet[], photo: Photo): PlacedPhoto<Photo>;
/** Street by street in the map's order, along each one from 0+000; the loose ones last. */
export declare function photoSpotsOf<Photo extends MapPhoto>(streets: readonly MediaStreet[], photos: readonly Photo[]): PhotoSpot<Photo>[];
/** «Jr. Los Pinos · 0+044», or that it fell off the work. */
export declare const photoSpotTitle: (spot: Pick<PhotoSpot, "streetName" | "atM">) => string;
/**
 * A marker opens its own spot first, and the viewer swipes through every spot of the
 * layer, in the map's order. `sourceLabel` names where a photo comes from («Control de
 * pista · QAA-001»): each app has its own report names. `null` when the pin is not of the layer.
 */
export declare function photoLayerFiles<Photo extends MapPhoto>(spots: readonly PhotoSpot<Photo>[], pinId: string, sourceLabel: (photo: Photo) => string): {
    startIndex: number;
    files: MapViewerFile[];
} | null;
