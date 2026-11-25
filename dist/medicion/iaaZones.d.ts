/**
 * PURE helpers for the zones of the additional area report (F6b).
 * Extracted from the local logic of `AreaAdicionalForm` (Chakra, untouched until
 * the swap; dedup when it is removed): the area/volume totals per zone are
 * derived from the MEASURED photos whose `category` is the zone id.
 */
import { type MeasurementShape } from './photoMeasurement';
export type IaaZoneRow = {
    id: string;
    item: string;
    ubicacion: string;
    descripcion: string;
    area: number | string;
    volumen: number | string;
    observaciones: string;
    /**
     * A person wrote the total, and it stops being derived from the photos.
     *
     * It exists because some measurements cannot be stored by the engine: if the
     * figure was drawn without measuring the sides, the area comes from the pixel
     * scale (`estimada`) and is discarded on purpose. In CHANCAY (17/10/2026) that
     * was 4 of 20, and without this the table fell short with no way out but going
     * back to the field. The screen warns, next to the number, that it no longer
     * matches its photos.
     */
    manual?: boolean;
    /**
     * An area measured in the field from Lilachat (José, 12/11/2026): its sides, thickness, how it was measured and
     * where. It always comes `manual`, because its photos are not measured in Portal and would sum it back to 0.
     * `entradaId` is the phone's id: a retry without signal finds the same row.
     */
    largo?: number;
    ancho?: number;
    espesor?: number;
    metodo?: string;
    point?: {
        lat: number;
        lng: number;
    };
    precisionM?: number;
    fuente?: string;
    entradaId?: string;
};
export type IaaMeasuredPhoto = {
    category?: string;
    areaM2?: number;
    volumeM3?: number;
    /** The measured sides. They bound the stored area: see `boundedPhotoArea`. */
    measurement?: Partial<MeasurementShape> | null;
};
export declare const IAA_TEXT_DEFAULTS: Record<string, string>;
export declare const IAA_TEXT_FIELDS: Array<{
    key: string;
    label: string;
    rows: number;
}>;
export declare const emptyIaaZone: (index: number) => IaaZoneRow;
/**
 * Sums the area/volume of the measured photos per zone (`photo.category` = zone.id).
 *
 * Each photo counts BOUNDED by what its own sides allow: reports captured
 * before 05/09/2026 stored impossible areas (745 m² with a ceiling of 245) and
 * this total goes to the quantities table that is billed.
 */
export declare const getZonePhotoTotals: (photos: IaaMeasuredPhoto[]) => Record<string, {
    area: number;
    volume: number;
}>;
/**
 * What the measured photos of ONE zone add up to, or `null` if it has none.
 *
 * It is what is shown to whoever wrote the total by hand: without the measured
 * number next to it, the «no coincide» notice does not say what it differs from.
 */
export declare const zoneMeasuredTotal: (zoneId: string, photos: IaaMeasuredPhoto[]) => {
    area: number;
    volume: number;
} | null;
/** Applies the measured totals to the zones (area/volume read-only unless manual). */
export declare const applyZonePhotoTotals: (rows: IaaZoneRow[], photos: IaaMeasuredPhoto[]) => IaaZoneRow[];
/**
 * Recomputes the zones' area/volume for the canvas EDITABLE table + the PDF:
 * - zone WITH photos → measured sum (read-only in practice: the photo rules).
 * - zone that LOST its last photo (it was in `prevPhotos`, no longer in `photos`) →
 *   reset to empty (do not leave an orphan total that over-reports).
 * - zone that NEVER had photos → keeps its hand-typed value.
 * - zone marked `manual` → untouched: a person set the number (see `manual`).
 * `prevPhotos` is optional: the server (PDF) recomputes without prev (orphans
 * were already reset by the client and are kept as an empty manual value).
 */
export declare const recomputeZoneTotals: (rows: IaaZoneRow[], photos: IaaMeasuredPhoto[], prevPhotos?: IaaMeasuredPhoto[]) => IaaZoneRow[];
/**
 * Groups photo entries (with their original index) by zone, in the zones' ORDER;
 * those without a zone (or whose `category` no longer matches any zone) go last
 * as "Sin zona". Pure and generic: shared by the admin canvas and the public
 * mobile photo panel. The original index is kept to edit/delete the right photo
 * after grouping.
 */
export declare const groupPhotosByZone: <T extends {
    category?: string;
}>(entries: Array<{
    photo: T;
    index: number;
}>, zoneOptions: Array<{
    value: string;
    label: string;
}>, orphanLabel?: string) => Array<{
    zoneId: string;
    zoneLabel: string;
    entries: Array<{
        photo: T;
        index: number;
    }>;
}>;
/** Renumbers and casts numerics (parity with the form's `normalizeAreaRows`). */
export declare const normalizeIaaZones: (rows: IaaZoneRow[]) => IaaZoneRow[];
