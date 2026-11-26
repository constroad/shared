"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MATERIAL_STATUS_LABEL = void 0;
exports.isLiquidMaterial = isLiquidMaterial;
exports.needsRestock = needsRestock;
exports.fillPercent = fillPercent;
exports.materialStockStatus = materialStockStatus;
exports.buildMaterialsStockReport = buildMaterialsStockReport;
exports.formatQuantity = formatQuantity;
exports.formatUnit = formatUnit;
/** From this level on a material is a LIQUID (see `MaterialLevel` in Portal's material model). */
const FIRST_LIQUID_LEVEL = 5;
/** Liquid volume units: the other sign that the row belongs to a tank. */
const LIQUID_UNITS = new Set(['gl', 'gls', 'gal', 'galon', 'galones']);
/** The aggregate's canonical unit, compared lowercase and without spaces. */
const CUBIC_METER_UNITS = new Set(['m3', 'm³']);
exports.MATERIAL_STATUS_LABEL = {
    healthy: 'Saludable',
    medium: 'Stock medio',
    low: 'Reponer',
    unknown: 'Sin umbral',
};
const normalizeUnit = (unit) => String(unit ?? '').trim().toLowerCase().replace(/\s+/g, '');
/** A usable number, or 0: a Mongo `null` must not become `NaN` in a message. */
const toQuantity = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};
/** Is this row a liquid the tank control already reports? Two signs, because neither alone is reliable. */
function isLiquidMaterial(material) {
    if (typeof material.level === 'number' && material.level >= FIRST_LIQUID_LEVEL)
        return true;
    return LIQUID_UNITS.has(normalizeUnit(material.unit));
}
/** A usable reorder point, or `null` when the company did not configure one. */
function readReorderPoint(material) {
    const reorderPoint = Number(material.reorderPoint);
    return Number.isFinite(reorderPoint) && reorderPoint > 0 ? reorderPoint : null;
}
/** `true` when the quantity reached or fell below the reorder point. No point, no opinion. */
function needsRestock(material) {
    const reorderPoint = readReorderPoint(material);
    return reorderPoint !== null && toQuantity(material.quantity) <= reorderPoint;
}
/** The bar's reference: double the minimum, so the minimum falls at 50 %. */
const FILL_REFERENCE_FACTOR = 2;
/** The margin over the minimum below which it is worth keeping an eye on. */
const MEDIUM_MARGIN_FACTOR = 1.5;
/** The bar fill, capped at 100. `null` without a reorder point. */
function fillPercent(material) {
    const reorderPoint = readReorderPoint(material);
    if (reorderPoint === null)
        return null;
    const ratio = (toQuantity(material.quantity) / (reorderPoint * FILL_REFERENCE_FACTOR)) * 100;
    return Math.max(0, Math.min(100, Math.round(ratio)));
}
/**
 * The status for the card and the colour dot. It derives from `needsRestock`,
 * not from a threshold of its own: with 200 m³ and a minimum of 200 the text
 * said «restock» while the card was green. Without a threshold no status is invented.
 */
function materialStockStatus(material) {
    const reorderPoint = readReorderPoint(material);
    if (reorderPoint === null)
        return 'unknown';
    if (needsRestock(material))
        return 'low';
    return toQuantity(material.quantity) <= reorderPoint * MEDIUM_MARGIN_FACTOR ? 'medium' : 'healthy';
}
/** The declared level of the material, or the bottom of the list when it has none. */
function levelOf(material) {
    const level = Number(material?.level);
    return Number.isFinite(level) ? level : Number.MAX_SAFE_INTEGER;
}
const hasName = (material) => Boolean(String(material.name || '').trim());
/**
 * The report from the company's materials, ordered by `level` (how the plant
 * names them: primary, secondary, 6/7, confitillo…) and then by name, so each
 * day's message reads like the last.
 */
function buildMaterialsStockReport(materials) {
    const included = materials.filter((material) => hasName(material) && !isLiquidMaterial(material));
    // The level is kept while mapping, not looked up by name afterwards: with two
    // materials of the same name that lookup took the other one's.
    const ordered = included
        .map((material) => ({
        level: levelOf(material),
        row: {
            id: material._id === undefined || material._id === null ? undefined : String(material._id),
            name: String(material.name).trim(),
            quantity: toQuantity(material.quantity),
            unit: String(material.unit ?? '').trim() || 'm³',
            needsRestock: needsRestock(material),
            reorderPoint: readReorderPoint(material),
            fillPercent: fillPercent(material),
            status: materialStockStatus(material),
        },
    }))
        .sort((left, right) => left.level - right.level || left.row.name.localeCompare(right.row.name, 'es'))
        .map((entry) => entry.row);
    const totalCubicMeters = ordered
        .filter((row) => CUBIC_METER_UNITS.has(normalizeUnit(row.unit)))
        .reduce((total, row) => total + row.quantity, 0);
    return {
        rows: ordered,
        totalCubicMeters: Math.round(totalCubicMeters * 100) / 100,
        restockCount: ordered.filter((row) => row.needsRestock).length,
        excludedAsLiquid: materials.filter((material) => hasName(material) && isLiquidMaterial(material)).map((material) => String(material.name).trim()),
    };
}
/** A readable quantity: `650`, not `650.00`; `12.5` keeps its decimal. */
function formatQuantity(quantity) {
    return new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(quantity);
}
/** The unit as it is PRINTED: the base holds `M3`, `m3` and `m³` for the same thing. */
function formatUnit(unit) {
    return CUBIC_METER_UNITS.has(normalizeUnit(unit)) ? 'm³' : unit;
}
