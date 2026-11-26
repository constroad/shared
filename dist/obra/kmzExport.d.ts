import { type LatLng } from './streetGeometry';
/**
 * KML color: `AABBGGRR`. **It is not RGB**: alpha goes first and the channels
 * are reversed. With CSS order, the base's brown comes out light blue and the
 * drawing stops being readable — the classic mistake with this format.
 */
export declare const kmlColor: (hex: string, alpha?: string) => string;
export interface KmlStreet {
    _id: string;
    name: string;
    geometry: LatLng[];
    lengthM: number;
}
export interface KmlScope {
    _id: string;
    streetId: string;
    fromM: number;
    toM: number;
    /** Work tags: they take precedence since 30/08/2026. */
    tagIds?: string[];
    /** Contracted partidas. Used when the scope has no tags. */
    partidaIds?: string[];
    /** Its stage, for the stage filter. */
    stageId?: string;
}
export interface KmlProgress {
    streetId: string;
    /** The progress axis: a tag, or a partida in old records. */
    workId: string;
    fromM: number;
    toM: number;
    date?: string;
    rework?: boolean;
}
/**
 * What the file holds (Lilachat exports what its map shows, 07/11). Without them it is the KML
 * Portal always exported: every work, every street whole as «Pendiente», stretches in metres.
 */
export interface KmlOptions {
    /** Only these works (tags or partidas) and the streets where they apply. */
    works?: string[];
    /** Only the scopes of this stage and the streets they touch. */
    stageId?: string;
    /** «Pendiente»: each whole street, or each planned stretch plus the streets without one. */
    pending?: 'street' | 'planned';
    /** Executed stretch names: «0–120 m», or its stations «0+000 a 0+120». */
    labels?: 'meters' | 'progresiva';
}
export interface KmlParams extends KmlOptions {
    obraName: string;
    streets: KmlStreet[];
    scopes: KmlScope[];
    progress: KmlProgress[];
    partidas: Array<{
        _id: string;
        description?: string;
    }>;
    /**
     * Work tags. They carry their name and their OWN COLOR: the KMZ must look
     * like the map and the PDF drawing, otherwise the client opens Google Earth
     * and sees different colors for the same work.
     */
    tags?: Array<{
        _id: string;
        name: string;
        color: string;
    }>;
    /** Rebuilds the work at a date, just like the client's slider. */
    upToDate?: string;
}
export declare const buildWorkStreetsKml: (params: KmlParams) => string;
/** Official KMZ MIME. It is the only thing that makes Earth offer to open it. */
export declare const KMZ_MIME = "application/vnd.google-earth.kmz";
/** Plain KML: more apps recognise it and nothing needs unzipping. */
export declare const KML_MIME = "application/vnd.google-earth.kml+xml";
/**
 * The KMZ bytes: a zip holding `doc.kml`, stored without compression
 * (`zipOneFile`), so the web and the APK write the same file with no zip
 * library. The caller wraps it with `KMZ_MIME`: with `application/zip` Android
 * forwards it as a zip and Google Earth does not show up to open it.
 */
export declare const buildWorkStreetsKmz: (kml: string) => Uint8Array;
