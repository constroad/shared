/**
 * A reading belongs to at most one consume, and an order too (F1
 * CONSUMES-TANK-RECONCILIATION). The rules each app applies to its own data.
 */
export declare const MOVEMENTS_ALREADY_USED_MESSAGE = "Una o m\u00E1s medidas ya fueron usadas en otro consumo.";
export declare const MOVEMENTS_NOT_ACCESSIBLE_MESSAGE = "Una o m\u00E1s medidas no existen o no pertenecen a esta empresa.";
export declare const ORDERS_ALREADY_USED_MESSAGE = "Uno o m\u00E1s pedidos ya fueron usados en otro consumo.";
interface ConsumeMovementIds {
    movementRefs?: Array<{
        movementId: string;
    }>;
    measures?: Array<{
        movementIds?: string[];
    }>;
}
export declare const extractConsumeMovementIds: (consume: ConsumeMovementIds) => string[];
export declare const extractUniqueConsumeMovementIds: (consume: ConsumeMovementIds) => string[];
/**
 * The period really measured: the first and last reading of the consume. With no
 * readings it falls back to the consume's date, never null, so a list can filter
 * by period without another branch.
 */
export declare const deriveConsumePeriod: (consume: {
    date: Date | string;
    movementRefs?: Array<{
        date: string;
    }>;
}) => {
    periodStart: Date;
    periodEnd: Date;
};
export {};
