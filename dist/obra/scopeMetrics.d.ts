/**
 * A scope's metrado: length × width = m², × thickness = m³.
 *
 * It lives on its own because **the same calculation is done in two places that
 * must not disagree**: the PDF table (`workStreetsPdf`) and the street detail
 * header, where the engineer types the width and expects to see the m² move.
 * When the formula was duplicated, any fix to one had to remember the other.
 *
 * WHAT IS MISSING IS RETURNED AS `null`, NEVER AS ZERO. A scope without width
 * does not measure 0 m²: it measures an amount we do not know yet. A zero adds
 * into the totals and makes the drawing say the work is smaller than it is;
 * `null` comes out as dashes and is visible.
 */
/**
 * The width that WINS for a scope: its own if it has one, otherwise its street's.
 *
 * Width used to live only on the street, and that does not describe reality: a
 * road can measure 6 m at the start and 5 m halfway (José, 30/08/2026). Without
 * this, that scope was measured with the wrong width and the whole error went
 * into the drawing's m².
 *
 * It is inherited rather than copied: changing the street's general width must
 * move every scope that did not override it. A `0` on the scope is NOT a width,
 * it means "not loaded" — which is why it falls back to inheriting.
 */
export declare const effectiveWidthM: (scope: {
    widthM?: number | null;
}, street: {
    widthM?: number | null;
}) => number | null;
export interface ScopeMetrics {
    lengthM: number;
    /** `null` when the street has no roadway width loaded. */
    areaM2: number | null;
    /** The one used: the scope's own or, if it has none, its partida's. */
    thicknessM: number | null;
    volumeM3: number | null;
    /** Which value must be loaded to complete the row. */
    missing: 'ancho' | 'espesor' | null;
}
export declare const scopeMetrics: (params: {
    fromM: number;
    toM: number;
    /** The width that wins for THIS scope. Resolve it with `effectiveWidthM`. */
    widthM?: number | null;
    /** The scope's own thickness. It overrides the partida's. */
    thicknessM?: number | null;
    /** Thickness inherited from its partida, if the scope has none of its own. */
    partidaThicknessM?: number | null;
}) => ScopeMetrics;
export interface StreetTotals {
    areaM2: number | null;
    volumeM3: number | null;
    /** Scopes that could not be measured: they explain a short total. */
    incompleteScopes: number;
}
/**
 * A street's total, for its detail header.
 *
 * If some scope could not be measured, the total still adds up those that
 * could —the engineer needs to see that half the street is already loaded— but
 * `incompleteScopes` records that the number is short. With ALL scopes
 * incomplete the total is `null`: there is nothing to show then.
 */
export declare const streetTotals: (params: {
    scopes: Array<{
        fromM: number;
        toM: number;
        thicknessM?: number;
        /** The scope's own width. Without it, it inherits the street's. */
        widthM?: number | null;
        partidaIds?: string[];
    }>;
    /** The street's general width: inherited by scopes without their own. */
    widthM?: number | null;
    thicknessOfPartida?: (partidaId: string) => number | undefined;
}) => StreetTotals;
