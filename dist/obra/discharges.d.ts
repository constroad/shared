/**
 * Where each unit of a Control de pista unloaded (José, 07/11/2026): its photos
 * with GPS, in the order they were taken, so Lilachat can project them on the
 * street and suggest the stretch it paved. No money and no driver: members
 * read it too. Pure.
 */
type DateSource = Date | string | null | undefined;
export type DischargeDispatch = {
    _id: unknown;
    plate?: string;
    quantity?: number;
    planedQuantity?: number;
    placeholders?: {
        m3Dispatched?: number;
        m3Truck?: number;
    } | null;
    arrival?: {
        at?: string;
    } | null;
    fieldWork?: {
        finishedAt?: unknown;
    } | null;
};
export type UnitPhotoMedia = {
    metadata?: {
        dispatchId?: string;
        tipoFoto?: string;
        geo?: string;
        precisionM?: string;
        takenAt?: string;
    };
    createdAt?: DateSource;
};
export type DischargePoint = {
    kind: string;
    lat: number;
    lng: number;
    precision_m?: number;
    at: string;
};
export type Discharge = {
    dispatch_id: string;
    plate: string;
    m3?: number;
    arrival_at?: string;
    finished_at?: string;
    points: DischargePoint[];
};
export declare const dischargesOf: (dispatches: DischargeDispatch[], photos: UnitPhotoMedia[]) => Discharge[];
export {};
