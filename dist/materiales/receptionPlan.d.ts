/**
 * A material reception (an `Input` in `Pending`) built from what a person
 * picked from lists, and the rules that decide whether it is complete. Portal's
 * zod schema and Inframaq's model must agree on both, so they live here.
 */
/** One reception is one truck: beyond this many cubic metres it is a typo, not a load. */
export declare const MAX_RECEPTION_M3 = 500;
/** The evidence of a reception: at least one photo of the load, at most six. */
export declare const MIN_RECEPTION_PHOTOS = 1;
export declare const MAX_RECEPTION_PHOTOS = 6;
export type ReceptionMaterial = {
    id: string;
    name?: string;
    description?: string;
    unit?: string;
    level?: unknown;
};
export type ReceptionProvider = {
    id: string;
    name: string;
};
export type ReceptionPicks = {
    /** Minted by the caller when the evidence has to hang off it before it exists. */
    inputId: string;
    material: ReceptionMaterial;
    carrier: ReceptionProvider;
    quarry: ReceptionProvider;
    /** The freight driver or the plate. */
    driver: string;
    m3: number;
    /** The Lima day, `YYYY-MM-DD`. */
    day: string;
    locationId?: string;
    notes?: string;
};
export type ReceptionRecord = {
    _id: string;
    materialId: string;
    material: string;
    materialName: string;
    level?: number;
    driver: string;
    m3: number;
    arriveDate: string;
    providerId: string;
    providerName: string;
    vendorProviderId: string;
    vendorProviderName: string;
    chancadora: string;
    locationId?: string;
    notes?: string;
    unit: string;
};
/** The reception as the form would persist it: the material's name plus its description, and the quarry copied where the notice reads it. */
export declare function receptionFromPicks(picks: ReceptionPicks, now?: Date): ReceptionRecord;
export type ReceptionValidation = {
    ok: true;
} | {
    ok: false;
    invalidPaths: string[];
};
type Reception = Record<string, unknown>;
/** The fields a reception cannot be saved without (the form's schema), by path. */
export declare function validateReceptionFields(reception: Reception): ReceptionValidation;
export {};
