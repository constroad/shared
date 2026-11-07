import { type TankCalculationSource } from './tankEngine';
/**
 * A tank measure, from the level on the dipstick to what the audit says of it.
 *
 * Whoever registers a measure without the measure screen only has the
 * centimetres, so the conversion happens here with the same engine and rounding
 * as the screen. A tank whose geometry cannot be calculated is refused: a zeroed
 * measure reads as an empty tank.
 */
export type TankMeasureEvent = 'measurement' | 'refill' | 'adjustment';
/** The tank as this builder reads it: what the engine needs, plus which tank it is. */
export type TankForMeasure = TankCalculationSource & {
    _id?: unknown;
    name?: string;
};
export type TankMeasureRequest = {
    eventType: TankMeasureEvent;
    levelCm: number;
    note?: string;
    date?: Date;
};
export type TankMeasureFigures = {
    tankId: string;
    tankName: string;
    eventType: TankMeasureEvent;
    levelCentimeter: number;
    effectiveGallons: number;
    availableGallons: number;
    valveDeadGallons: number;
    date: Date;
    note?: string;
};
export type TankMovementFromLevel = {
    ok: true;
    movement: TankMeasureFigures;
} | {
    ok: false;
    reason: string;
};
export declare function tankMovementFromLevel(tank: TankForMeasure, request: TankMeasureRequest): TankMovementFromLevel;
type AuditedReading = {
    levelCentimeter: number;
    effectiveGallons: number;
    date: Date | string;
};
/** Why a measure deserves a second look, against the reading before it. */
export declare const tankAuditReasons: ({ evidenceCount, movement, previousMovement }: {
    evidenceCount: number;
    movement: AuditedReading;
    previousMovement: AuditedReading;
}) => string[];
/** The tank as this measure leaves it: its own stock is synced after the measure is saved. */
export declare function tankAsMeasured<T extends {
    volumeInStock?: number;
    levelCentimeter?: number;
}>(tank: T, measure: {
    effectiveGallons?: number;
    levelCentimeter?: number;
}): T;
export {};
