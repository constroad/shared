import type { ConsumeMovementIntervalType, ConsumeMovementOrder, ConsumeMovementOrderListItem, ConsumeMovementRecord, ConsumeMovementTank, ConsumeMovementTankCalculation } from './consumeMovementFlow';
/**
 * The ONE consume engine (José, 30/10/2026: «un solo motor»). Pure: the admin
 * builder, Inframaq through the gateway and Lila all reach it, and the server
 * recomputes with it what the browser used to send already calculated. The UI
 * modules re-export these functions so the screen keeps calculating the same.
 */
export type EngineTank = Pick<ConsumeMovementTank, '_id' | 'name' | 'tableReference' | 'contentType' | 'sharedTankId'>;
/**
 * Chronological order of readings. `date` is saved to the minute, so readings
 * of the same minute tie: the one registered first goes first, then the id, and
 * the order never depends on how the list arrived (Inframaq 7066a5f, 31/10/2026).
 */
export declare const compareReadings: (first: Pick<ConsumeMovementRecord, "_id" | "date" | "createdAt">, second: Pick<ConsumeMovementRecord, "_id" | "date" | "createdAt">) => number;
export declare const tankMovementKey: (tank: Pick<EngineTank, "_id" | "sharedTankId">) => string;
/** Tank names of the same physical tank may differ in case between companies. */
export declare const normalizeTankName: (name?: string) => string;
/**
 * The tank a reading belongs to: by id or shared id, else by name (a reading
 * taken by another company carries its own alias id but the same tank name).
 */
export declare const resolveTankMovementKey: (tanks: Array<Pick<EngineTank, "_id" | "sharedTankId" | "name">>, movementTankId: string, movementTankName?: string) => string;
export declare const groupTankMovementsByTank: (tanks: Array<Pick<EngineTank, "_id" | "sharedTankId" | "name">>, movements: ConsumeMovementRecord[]) => Record<string, ConsumeMovementRecord[]>;
export declare const formatOrderLabel: (order: ConsumeMovementOrderListItem) => string;
/** An order as a consume stores it; a projected one keeps whose order it is. */
export declare const buildConsumeOrder: (order: ConsumeMovementOrderListItem) => ConsumeMovementOrder | null;
/**
 * Expands a selection to the continuous span between the first and the last
 * selected reading, with EVERY reading in between: a refill in the middle is
 * then a refill and not a missed consumption.
 */
export declare const expandSelectedMovements: (sortedMovements: ConsumeMovementRecord[], selectedIds: Set<string>) => ConsumeMovementRecord[];
/**
 * A span's consumption = ONLY the steps between consecutive readings of the
 * span (a drop is consumption, a rise a refill). The first reading is the
 * baseline: its stored delta against a reading OUTSIDE the span never counts
 * (bug 22/07/2026 doubled the consumption). One point = incomplete.
 */
export declare const calculateTankConsumption: (tank: EngineTank, selectedMovements: ConsumeMovementRecord[]) => ConsumeMovementTankCalculation;
export declare const totalByContentType: (calculations: ConsumeMovementTankCalculation[], contentTypes: ConsumeMovementTankCalculation["contentType"][]) => number;
/**
 * Every tank with a marked reading, over its expanded span. A reading another
 * consume already uses is left out; one of the consume being edited stays.
 */
export declare const computeTankCalculations: (input: {
    tanks: EngineTank[];
    movements: ConsumeMovementRecord[];
    selectionByTankKey: Record<string, string[]>;
    ignoredConsumeId?: string;
}) => ConsumeMovementTankCalculation[];
export interface ConsumeCalculation {
    orders: ConsumeMovementOrder[];
    tanks: ConsumeMovementTankCalculation[];
    dispatchIds: string[];
    computedM3: number;
    manualM3?: number;
    totalCubes: number;
    quantityPen: number;
    quantityGasohol: number;
    quantityPetroleo: number;
    calculationNotes?: string;
}
/** The document a consume is saved as. */
export declare const buildConsumePayload: (calculation: ConsumeCalculation) => {
    source: "tank-movements";
    date: Date;
    orders: ConsumeMovementOrder[];
    measures: {
        tank: string;
        tankId: string;
        initialMeasure: number;
        finalMeasure: number;
        quantityConsumed: number;
        movementIds: string[];
    }[];
    movementRefs: {
        movementId: string;
        tankId: string;
        tankName: string;
        eventType: import("./tankModel").TankMovementType;
        initialLevelCentimeter: number;
        initialEffectiveGallons: number;
        levelCentimeter: number;
        effectiveGallons: number;
        deltaGallons: number;
        consumedGallons: number;
        refillGallons: number;
        intervalType: ConsumeMovementIntervalType;
        date: string;
        role: "selected";
    }[];
    dispatchIds: string[];
    computedM3: number;
    manualM3: number | undefined;
    calculationNotes: string | undefined;
    quantityPen: number;
    quantityGasohol: number;
    quantityPetroleo: number;
    quantityGas: number;
    penConsume: number;
    fakePenConsume: number;
    gasoholConsume: number;
    petroleoConsume: number;
    gasConsume: number;
    totalCubes: number;
};
export type ConsumeProblem = 'no-orders' | 'no-complete-tank' | 'no-cubes';
export interface ConsumeEngineInput {
    tanks: EngineTank[];
    movements: ConsumeMovementRecord[];
    selectionByTankKey: Record<string, string[]>;
    ignoredConsumeId?: string;
    orders: ConsumeMovementOrder[];
    dispatch: {
        m3: number;
        ids: string[];
    };
    manualM3?: number;
    calculationNotes?: string;
}
/** What would be saved, from the readings and dispatches as they are now. */
export declare const computeConsume: (input: ConsumeEngineInput) => {
    payload: {
        source: "tank-movements";
        date: Date;
        orders: ConsumeMovementOrder[];
        measures: {
            tank: string;
            tankId: string;
            initialMeasure: number;
            finalMeasure: number;
            quantityConsumed: number;
            movementIds: string[];
        }[];
        movementRefs: {
            movementId: string;
            tankId: string;
            tankName: string;
            eventType: import("./tankModel").TankMovementType;
            initialLevelCentimeter: number;
            initialEffectiveGallons: number;
            levelCentimeter: number;
            effectiveGallons: number;
            deltaGallons: number;
            consumedGallons: number;
            refillGallons: number;
            intervalType: ConsumeMovementIntervalType;
            date: string;
            role: "selected";
        }[];
        dispatchIds: string[];
        computedM3: number;
        manualM3: number | undefined;
        calculationNotes: string | undefined;
        quantityPen: number;
        quantityGasohol: number;
        quantityPetroleo: number;
        quantityGas: number;
        penConsume: number;
        fakePenConsume: number;
        gasoholConsume: number;
        petroleoConsume: number;
        gasConsume: number;
        totalCubes: number;
    };
    tanks: ConsumeMovementTankCalculation[];
    incompleteTanks: string[];
    problems: ConsumeProblem[];
};
declare const COMPARED_FIGURES: readonly ["quantityPen", "quantityGasohol", "quantityPetroleo", "totalCubes"];
type ComparedFigure = (typeof COMPARED_FIGURES)[number];
/** Where the browser's figures differ from the server's (the server wins). */
export declare const diffConsumeFigures: (browser: Partial<Record<ComparedFigure, number>>, server: Record<ComparedFigure, number>) => Array<{
    field: ComparedFigure;
    browser: number;
    server: number;
}>;
export {};
