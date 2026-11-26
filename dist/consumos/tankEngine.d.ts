import type { LevelGallonsOutcome, LevelGallonsResult, TankCalculationError, TankCalculationInput } from './tankCalculation';
/** Sum displaced volume (gal) for serpentines fully below the liquid surface. */
export declare function submergedSerpentineDisplacementGallons(serpentines: TankCalculationInput['serpentines'], levelCm: number): number;
export declare function geometricGallonsAtLevel(input: TankCalculationInput, levelCm: number): LevelGallonsOutcome;
/**
 * Galones bajo la altura de válvula (volumen no utilizable por encima del fondo hasta la cinta),
 * ignorando cualquier override manual en `valveDeadVolumeGallons`.
 */
export declare function computeValveDeadGallonsFromGeometry(input: TankCalculationInput): number | null;
/** Galones muertos por válvula: override explícito o fluido efectivo hasta la cinta de válvula. */
export declare function resolveValveDeadGallons(input: TankCalculationInput): LevelGallonsOutcome | number;
export declare function availableForProductionGallons(input: TankCalculationInput, levelCm: number): LevelGallonsOutcome | {
    ok: true;
    availableGallons: number;
    valveDeadGallons: number;
};
export declare function consumptionGallons(input: TankCalculationInput, initialCm: number, finalCm: number): TankCalculationError | {
    ok: true;
    consumptionGallons: number;
    initial: LevelGallonsResult;
    final: LevelGallonsResult;
};
export declare function productionM3FromAvailableGallons(availableGallons: number, gallonsPerProductionM3: number | null | undefined): number | null;
/**
 * Whether a reading is a refill, compared at the precision it is saved with.
 *
 * The engine's gallons carry every decimal and the previous reading is already
 * rounded, so the same level counted as «went up» whenever that rounding went
 * down: a refill of 0.00 gallons (05/11/2026).
 */
export declare function tankEventFromGallons(currentGallons: number, previousGallons: number): 'refill' | 'measurement';
/** What a tank document or an API preview must carry to be calculated. */
export type TankCalculationSource = Omit<TankCalculationInput, 'geometry' | 'serpentines'> & {
    geometry: object;
    serpentines?: TankCalculationInput['serpentines'];
};
export declare function tankDocumentToCalculationInput(doc: TankCalculationSource): TankCalculationInput;
