/**
 * The four photos a unit of a CTL-PIS needs (José, 06/11/2026): it came in, its
 * temperature, it left empty, and the tape showing the thickness. A photo with no
 * position does not count: without GPS there is no photo in this report. Pure.
 */
export declare const CTL_PIS_PHOTO_KINDS: readonly ["ingreso", "temperatura", "vacia", "escantillon"];
export type CtlPisPhotoKind = (typeof CTL_PIS_PHOTO_KINDS)[number];
export declare const CTL_PIS_PHOTO_LABELS: Record<CtlPisPhotoKind, string>;
/** What each photo is called where a person picks it. */
export declare const CTL_PIS_PHOTO_TITLES: Record<CtlPisPhotoKind, string>;
/**
 * Optional photos of a unit, beyond its four (José, 07/11/2026, for engineer
 * Jeremy): they never count as missing, never block publishing, and print after
 * every unit so they cannot shift a unit's row.
 */
export declare const CTL_PIS_EXTRA_PHOTO: "adicional";
export declare const MAX_EXTRA_PHOTOS_PER_UNIT = 10;
export declare const CTL_PIS_EXTRA_PHOTO_TITLE = "Fotos adicionales";
/** A unit photo's class: one of the four, or an extra one. */
export type CtlPisPhotoClass = CtlPisPhotoKind | typeof CTL_PIS_EXTRA_PHOTO;
export declare const isCtlPisPhotoKind: (value: unknown) => value is CtlPisPhotoKind;
/**
 * Reports born with this mark must hold a unit's four photos and its thickness.
 * Drafts from before it were filled under the old rules and stay publishable.
 */
export declare const requiresUnitEvidence: (schemaData: unknown) => boolean;
type PhotoPosition = {
    lat?: unknown;
    lon?: unknown;
    lng?: unknown;
};
export type CtlPisUnitPhoto = {
    tipoFoto?: string;
    stampContext?: {
        location?: PhotoPosition | null;
    } | null;
};
export declare const hasPhotoPosition: (photo: CtlPisUnitPhoto) => boolean;
/** The kinds this unit has no valid photo of. */
export declare const missingUnitPhotoKinds: (photos: readonly CtlPisUnitPhoto[]) => CtlPisPhotoKind[];
/**
 * A unit's row of the PDF: the latest photo of each kind, always in the same
 * columns. A photo taken again goes in `rest`, so it cannot shift the rows below.
 */
export declare function printRowOf<T extends {
    tipoFoto?: string;
}>(photos: readonly T[]): {
    row: T[];
    rest: T[];
};
/** Whether a unit is still «terminó» after taking this photo away. */
export declare const keepsEmptyPhoto: (photos: readonly {
    tipoFoto?: string;
    mediaId?: unknown;
}[], removedMediaId: string) => boolean;
export declare const isUnitOfReport: (schemaData: unknown, dispatchId: string) => boolean;
/** Each unit's gallery, for its thumbnails and its buttons. */
export declare const unitPhotosByDispatchOf: <T>(schemaData: Record<string, unknown>) => Record<string, T[]>;
export {};
