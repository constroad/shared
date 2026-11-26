import { type AreaSource, type PlanPoint, type TapedSide } from './arPlan';
/**
 * What the APK measured with AR for one photo (José, 14/11/2026: «solo APK para medir»): the corners on the floor plane
 * in metres, the sides taped, the thickness readings in cm and the device. It travels inside the photo's measurement,
 * so the server recomputes the area from it and never trusts the phone's number.
 */
export type ArTracking = 'normal' | 'limitado';
export interface ArDevice {
    model: string;
    os: string;
    ar: 'arcore' | 'arkit';
    version: string;
}
export interface ArCapture {
    plan: PlanPoint[];
    tape: TapedSide[];
    thicknessCm: number[];
    tracking?: ArTracking;
    device?: ArDevice;
}
export interface ArCaptureMetrics {
    area: number | null;
    source: AreaSource | null;
    perimeter: number | null;
    /** Mean thickness in metres; null without readings. */
    thicknessM: number | null;
}
/** The capture as it can be trusted, or null when there is no plan to measure. */
export declare function normalizeArCapture(input: unknown): ArCapture | null;
/** Area from the plan fitted by the tape; the thickness from the readings. */
export declare function arCaptureMetrics(capture: ArCapture): ArCaptureMetrics;
