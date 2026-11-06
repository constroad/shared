import type { ConfigurableTankCalibrationPoint, ConfigurableTankSerpentine, TankShape } from './tankModel';
/** Input shape for pure calculation functions (DB document or API preview). */
export interface TankCalculationInput {
    tankShape: TankShape;
    geometry: Record<string, number>;
    cubicCmPerUsGallon: number;
    valveHeightFromBottomCm?: number;
    valveDeadVolumeGallons?: number;
    serpentines: ConfigurableTankSerpentine[];
    calibrationTable?: ConfigurableTankCalibrationPoint[];
    gallonsPerProductionM3?: number | null;
}
export type TankCalculationErrorCode = 'LEVEL_BELOW_ZERO' | 'LEVEL_ABOVE_MAX' | 'INVALID_GEOMETRY';
export interface TankCalculationError {
    ok: false;
    code: TankCalculationErrorCode;
    message: string;
}
export interface LevelGallonsResult {
    ok: true;
    geometricGallons: number;
    serpentineDisplacementGallons: number;
    effectiveGallons: number;
}
export type LevelGallonsOutcome = LevelGallonsResult | TankCalculationError;
