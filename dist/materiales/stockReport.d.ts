/**
 * The aggregates stock report (`MAT-STOCK`): a snapshot of how much there is
 * NOW of each aggregate. It is not what came in today (that is the daily
 * reception summary, another question).
 *
 * Two domain decisions hold the rest:
 *
 * 1. **Liquids stay out.** PEN, gasohol, diesel and thermal oil exist as a row in
 *    `materials`, but their quantity there is dead: the live number is measured
 *    by the tank. Including them would print the same material twice with
 *    different figures, and the wrong one would be this one.
 * 2. **One channel, one rendering.** The data is computed once; each channel
 *    paints it (WhatsApp understands `*bold*`, Telegram does not).
 */
export interface MaterialStockInput {
    /** Its id. It travels because the NAME IS NOT A KEY: two materials can share one. */
    _id?: unknown;
    name: string;
    quantity?: number;
    unit?: string;
    level?: number;
    reorderPoint?: number;
}
/** Same vocabulary as the tank cards, so nobody learns two scales for one thing. */
export type MaterialStockStatus = 'healthy' | 'medium' | 'low' | 'unknown';
export declare const MATERIAL_STATUS_LABEL: Record<MaterialStockStatus, string>;
export interface MaterialStockRow {
    /**
     * The id of this row's material. A name does not identify a material: on
     * 23/10/2026 the company `test` had two «Filler mineral» (4,000 kg and 580 TM)
     * and a tool that mapped the id by name gave both the second one's id.
     */
    id?: string;
    name: string;
    quantity: number;
    unit: string;
    /** `true` when the quantity reached or fell below the configured reorder point. */
    needsRestock: boolean;
    reorderPoint: number | null;
    /**
     * How full the bar is, 0 to 100; `null` without a reorder point. A pile of
     * sand has no capacity, so the reference is DOUBLE the minimum: half a bar
     * means exactly at the minimum, and below it is time to restock. Capped at 100.
     */
    fillPercent: number | null;
    status: MaterialStockStatus;
}
export interface MaterialsStockReport {
    rows: MaterialStockRow[];
    /** Only the m³ rows are added: m³ plus gallons means nothing. */
    totalCubicMeters: number;
    /** How many rows ask for restocking (to decide whether the notice is urgent). */
    restockCount: number;
    /** What was left out as a tank liquid, so the discard is never silent. */
    excludedAsLiquid: string[];
}
/** Is this row a liquid the tank control already reports? Two signs, because neither alone is reliable. */
export declare function isLiquidMaterial(material: MaterialStockInput): boolean;
/** `true` when the quantity reached or fell below the reorder point. No point, no opinion. */
export declare function needsRestock(material: MaterialStockInput): boolean;
/** The bar fill, capped at 100. `null` without a reorder point. */
export declare function fillPercent(material: MaterialStockInput): number | null;
/**
 * The status for the card and the colour dot. It derives from `needsRestock`,
 * not from a threshold of its own: with 200 m³ and a minimum of 200 the text
 * said «restock» while the card was green. Without a threshold no status is invented.
 */
export declare function materialStockStatus(material: MaterialStockInput): MaterialStockStatus;
/**
 * The report from the company's materials, ordered by `level` (how the plant
 * names them: primary, secondary, 6/7, confitillo…) and then by name, so each
 * day's message reads like the last.
 */
export declare function buildMaterialsStockReport(materials: MaterialStockInput[]): MaterialsStockReport;
/** A readable quantity: `650`, not `650.00`; `12.5` keeps its decimal. */
export declare function formatQuantity(quantity: number): string;
/** The unit as it is PRINTED: the base holds `M3`, `m3` and `m³` for the same thing. */
export declare function formatUnit(unit: string): string;
