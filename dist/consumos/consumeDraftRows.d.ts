import type { TankContentType } from './tankModel';
import type { ConsumeMovementOrderListItem, ConsumeMovementRecord } from './consumeMovementFlow';
import { type ConsumeProblem } from './consumeEngine';
export declare const MAX_PERIOD_DAYS = 31;
export type DraftPeriod = {
    desde: string;
    hasta: string;
};
export declare function resolveDraftPeriod(args: {
    desde?: string;
    hasta?: string;
}, today: string): {
    ok: true;
    period: DraftPeriod;
} | {
    ok: false;
    message: string;
};
export declare const contentLabelOf: (content: TankContentType) => string;
type DraftOrder = ConsumeMovementOrderListItem & {
    isProjected?: boolean;
    sourceCompanyName?: string;
};
export interface OrderRow {
    id: string;
    etiqueta: string;
    detalle: string;
    bloqueado?: true;
}
export declare const orderLabelOf: (order: DraftOrder) => string;
export declare function orderRowOf(input: {
    order: DraftOrder;
    m3: number;
    dispatchCount: number;
    usedOn?: string;
}): OrderRow;
export interface ReadingRow {
    id: string;
    tanqueId: string;
    etiqueta: string;
    detalle: string;
    foto?: string;
    fotos?: string[];
    bloqueada?: true;
}
export declare const readingLabelOf: (movement: ConsumeMovementRecord) => string;
/** One tank's readings, in date order, with the step against the previous one. */
export declare function readingRowsOf(tankKey: string, movements: ConsumeMovementRecord[], photoUrlsByMovementId: Record<string, string[]>): ReadingRow[];
export interface DraftTramo {
    tanqueId: string;
    inicioId?: string;
    finId?: string;
}
/** The marked readings by tank; a row with neither end does not enter. */
export declare function selectionFromTramos(tramos: DraftTramo[]): {
    selectionByTankKey: Record<string, string[]>;
    singlePointTankIds: string[];
};
/** What blocks saving (conflicts) and what to look at before sending (warnings). */
export declare function reviewFindingsOf(input: {
    problems: ConsumeProblem[];
    incompleteTanks: string[];
    usedOrders: Array<{
        etiqueta: string;
        usedOn: string;
    }>;
    missingOrderIds: string[];
    takenReadings: string[];
    variancePct: number | null;
}): {
    conflictos: string[];
    avisos: string[];
};
export type BlockTone = 'ok' | 'info' | 'warn' | 'error' | 'neutral';
export type ReviewBlock = {
    type: 'metric';
    value: string;
    unit?: string;
    label?: string;
    tone?: BlockTone;
} | {
    type: 'rows';
    rows: Array<{
        label: string;
        value: string;
        sub?: string;
        tone?: BlockTone;
    }>;
} | {
    type: 'chips';
    items: Array<{
        label: string;
        sub?: string;
        tone?: BlockTone;
    }>;
} | {
    type: 'text';
    text: string;
    tone?: BlockTone;
};
export interface ReviewBlocksInput {
    aggregates?: DraftAggregates[];
    complete: boolean;
    ratePerM3: number | null;
    averageRatePerM3: number | null;
    variancePct: number | null;
    tanks: Array<{
        nombre: string;
        gl: number;
        inicioCm: number;
        finCm: number;
        recargaGl: number;
    }>;
    m3: number;
    m3Despachados: number;
    m3Manual?: number;
    despachos: number;
    fuels: Array<{
        label: string;
        gl: number;
        glPorM3: number;
    }>;
    conflictos: string[];
    avisos: string[];
}
export type DraftAggregates = {
    client: string;
    materials: Array<{
        name: string;
        quantity: number;
    }>;
};
/** What Lilachat draws above «Enviar»: an incomplete draft only says what is missing. */
export declare function reviewBlocksOf(input: ReviewBlocksInput): ReviewBlock[];
/** One line per client of what the consume takes from its stock. Pure. */
export declare const aggregatesLineOf: (preview: DraftAggregates) => string;
export {};
