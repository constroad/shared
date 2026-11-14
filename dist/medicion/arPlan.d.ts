/**
 * The AR measurement of a patch on the floor (ARPlan 3D pattern, `rumbo/specs/MEDICION-AR.spec.md` §3): the phone
 * hands the corners in metres on the floor plane, one or more sides taped fix the scale, and the area is the shoelace
 * of the contour. Pure: shared by Portal (the server recomputes, it never trusts the phone's number) and Lilachat's APK.
 */
export interface PlanPoint {
    x: number;
    y: number;
}
export interface TapedSide {
    /** Side `i` goes from vertex `i` to vertex `i + 1` (the last one closes on vertex 0). */
    side: number;
    lengthM: number;
}
export type PlanRefusal = 'pocos-vertices' | 'se-cruza';
export type PlanMeasure = {
    ok: true;
    areaM2: number;
    perimeterM: number;
} | {
    ok: false;
    reason: PlanRefusal;
};
export type AreaSource = 'ar' | 'ar+wincha';
export type FittedPlan = {
    ok: true;
    plan: PlanPoint[];
    areaM2: number;
    perimeterM: number;
    /** The one number that corrects the SLAM drift (1 = no tape). */
    scale: number;
    residuals: Array<{
        side: number;
        cm: number;
    }>;
    /** Sides where AR and tape disagree: the tape won on each one. */
    discrepantSides: number[];
    /** The drift differs by axis: the operator should scan again. */
    irregularTracking: boolean;
    source: AreaSource;
} | {
    ok: false;
    reason: PlanRefusal;
};
export interface ThicknessStats {
    n: number;
    meanM: number;
    sdM: number;
    volumeM3: number;
    volumePlusMinusM3: number;
    /** Fewer readings than recommended: a warning, never a block. */
    fewReadings: boolean;
}
/** Area and perimeter of a contour on the floor; refuses what has no area. */
export declare function planArea(rawPlan: PlanPoint[]): PlanMeasure;
/** The AR plan corrected by the tape: one scale for the drift, and the tape over AR on every side that disagrees. */
export declare function fitTapeScale(rawPlan: PlanPoint[], rawTape: TapedSide[]): FittedPlan;
/** Thickness from n readings in cm: mean, spread, and the volume with the ± that the spread leaves. */
export declare function thicknessStats(readingsCm: number[], areaM2: number): ThicknessStats;
