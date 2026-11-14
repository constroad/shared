import type { ConsumeMovementRecord } from './consumeMovementFlow';
import { type EngineTank } from './consumeEngine';
/**
 * The server recomputes every consume with the single engine (José,
 * 30/10/2026): the browser's figures are never saved as they come. The marked
 * readings and the orders are the person's choice; gallons, m³ and rates come
 * from the readings and dispatches each app reads from its own database.
 */
/** The consume fields the recompute reads; each app's model has more. */
export interface ConsumeInput {
    source?: string;
    orders?: Array<{
        orderId: string;
        orderName: string;
        orderClient: string;
        tipoMAC: string;
        sourceCompanyId?: string;
    }>;
    measures?: Array<{
        tankId?: string;
        movementIds?: string[];
    }>;
    manualM3?: number;
    calculationNotes?: string;
}
/** A reading as a repository returns it. */
export interface ConsumeSpanRow {
    _id: unknown;
    tankId: string;
    tankName: string;
    eventType: ConsumeMovementRecord['eventType'];
    levelCentimeter: number;
    effectiveGallons: number;
    date: Date | string;
    createdAt?: Date | string;
    consumedByConsumeId?: string;
}
export declare const CONSUME_NOT_COMPUTABLE_MESSAGE = "Con las lecturas guardadas, el consumo no tiene un tanque con inicio y fin, o no tiene m\u00B3. Vuelve a cargar la pantalla.";
export interface ConsumeSelection {
    orderIds: string[];
    selectionByTankKey: Record<string, string[]>;
}
export interface ConsumeEngineData {
    tanks: EngineTank[];
    movements: ConsumeMovementRecord[];
    dispatch: {
        m3: number;
        ids: string[];
    };
}
export interface ConsumeRecomputeDeps {
    loadEngineData(companyId: string, selection: ConsumeSelection): Promise<ConsumeEngineData>;
    log(message: string): void;
}
/** What the person chose: the marked readings by tank and the orders. Pure. */
export declare const selectionFromConsume: (consume: Pick<ConsumeInput, "orders" | "measures">) => ConsumeSelection;
export declare const toEngineTank: (tank: {
    _id?: unknown;
    name: string;
    tableReference: string;
    contentType: EngineTank["contentType"];
    sharedTankId?: string;
}) => EngineTank;
export declare const toEngineMovement: (row: ConsumeSpanRow) => ConsumeMovementRecord;
/**
 * The consume as it is saved: recomputed by the engine over the database. A
 * legacy consume (typed by hand, no readings) is saved as it came.
 */
export declare function recomputeConsume<T extends ConsumeInput>(params: {
    companyId: string;
    consume: T;
    ignoredConsumeId?: string;
}, deps: ConsumeRecomputeDeps): Promise<T>;
