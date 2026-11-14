import { type CubicageMeasures, type TruckShape } from './cubicage';
export interface DispatchCm {
    m3: number;
    loadCm: number;
    fromTopCm: number;
}
export declare const dispatchCm: (shape: TruckShape, measures: CubicageMeasures, m3: number) => DispatchCm | null;
/** Whole m³ every two, from the volume down: what the plant loads most often. */
export declare const dispatchReference: (shape: TruckShape, measures: CubicageMeasures, volume: number) => DispatchCm[];
