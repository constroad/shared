"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.streetTotals = exports.scopeMetrics = exports.effectiveWidthM = void 0;
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
const effectiveWidthM = (scope, street) => {
    const ownWidth = Number(scope?.widthM);
    if (Number.isFinite(ownWidth) && ownWidth > 0)
        return ownWidth;
    const streetWidth = Number(street?.widthM);
    return Number.isFinite(streetWidth) && streetWidth > 0 ? streetWidth : null;
};
exports.effectiveWidthM = effectiveWidthM;
/** Round to 2 decimals: the drawing gets signed, not estimated. */
const round2 = (value) => Math.round(value * 100) / 100;
const scopeMetrics = (params) => {
    const lengthM = Math.max(0, params.toM - params.fromM);
    const widthM = params.widthM ?? null;
    const thicknessM = params.thicknessM ?? params.partidaThicknessM ?? null;
    const areaM2 = widthM ? round2(lengthM * widthM) : null;
    const volumeM3 = areaM2 !== null && thicknessM ? round2(areaM2 * thicknessM) : null;
    return {
        lengthM,
        areaM2,
        thicknessM,
        volumeM3,
        missing: areaM2 === null ? 'ancho' : volumeM3 === null ? 'espesor' : null,
    };
};
exports.scopeMetrics = scopeMetrics;
/**
 * A street's total, for its detail header.
 *
 * If some scope could not be measured, the total still adds up those that
 * could —the engineer needs to see that half the street is already loaded— but
 * `incompleteScopes` records that the number is short. With ALL scopes
 * incomplete the total is `null`: there is nothing to show then.
 */
const streetTotals = (params) => {
    let areaM2 = 0;
    let volumeM3 = 0;
    let scopesWithArea = 0;
    let scopesWithVolume = 0;
    let incompleteScopes = 0;
    for (const scope of params.scopes) {
        const partidaId = (scope.partidaIds ?? [])[0];
        const metrics = (0, exports.scopeMetrics)({
            fromM: scope.fromM,
            toM: scope.toM,
            widthM: (0, exports.effectiveWidthM)(scope, { widthM: params.widthM }),
            thicknessM: scope.thicknessM,
            partidaThicknessM: partidaId ? params.thicknessOfPartida?.(partidaId) : undefined,
        });
        if (metrics.areaM2 !== null) {
            areaM2 += metrics.areaM2;
            scopesWithArea += 1;
        }
        if (metrics.volumeM3 !== null) {
            volumeM3 += metrics.volumeM3;
            scopesWithVolume += 1;
        }
        if (metrics.missing)
            incompleteScopes += 1;
    }
    return {
        areaM2: scopesWithArea > 0 ? round2(areaM2) : null,
        volumeM3: scopesWithVolume > 0 ? round2(volumeM3) : null,
        incompleteScopes,
    };
};
exports.streetTotals = streetTotals;
