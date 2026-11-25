/** The tank fields every calculation reads, with no database or validation library behind them. */
export type TankShape = 'horizontal_cylinder' | 'vertical_cylinder' | 'rectangular';
export type TankContentType = 'pen' | 'gasohol' | 'petroleum' | 'thermal_oil' | 'other';
export type TankMovementType = 'measurement' | 'refill' | 'adjustment';
export interface ConfigurableTankSerpentine {
    heightFromBottomCm: number;
    displacedVolumeGallons: number;
    label?: string;
}
export interface ConfigurableTankCalibrationPoint {
    levelCentimeter: number;
    effectiveGallons: number;
}
