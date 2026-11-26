"use strict";
/**
 * How the map is painted when there are work tags, and what the legend says.
 *
 * ## The rule, and why it is this one
 *
 * A scope can have a partida (what is contracted) and a tag (how the work is
 * grouped). When it has both, **the tag wins**: if the engineer took the
 * trouble to create «FRESADO DÍA 1» and paint it red, it is because today they
 * want to view the work by day, not by partida. The partida color remains the
 * default for everything untagged, so a half-tagged map does not suddenly turn
 * grey.
 *
 * With SEVERAL tags on a scope, the one with the lowest `order` wins: the
 * drawing's legend has an order and the map respects it. Picking "the first in
 * the array" would make the color change depending on the order in which the
 * checkboxes were clicked.
 *
 * It comes from the Pachacámac drawing José brought (28/08/2026), where the
 * groups are «FRESADO DÍA 1» and «FRESADO DÍA 2-3» — the same partida, split in two.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.unusedTags = exports.untaggedUsage = exports.tagUsage = exports.buildWorkLegend = exports.colorForScope = exports.dominantTag = void 0;
const partidaColors_1 = require("./partidaColors");
const byOrder = (tags) => [...tags].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
/** The tag that wins on a scope, if it has any. */
const dominantTag = (scope, tags) => {
    const ids = new Set((scope.tagIds ?? []).map(String));
    if (ids.size === 0)
        return null;
    return byOrder(tags).find((tag) => ids.has(String(tag._id))) ?? null;
};
exports.dominantTag = dominantTag;
/**
 * A scope's color: tag > partida > unassigned.
 *
 * `focusTagId` dims everything that is not that tag, just like the partida
 * focus: looking at a layer means looking at ONE, not seeing all with one
 * highlighted.
 *
 * **With focus, HAVING the tag is what counts, not winning the color**
 * (01/09/2026). A maintenance block carries milling, priming and asphalt at
 * once; the line can only have one color and the lowest order wins, but turning
 * on the «Asfaltado» layer must still show its scopes. Before, it asked for the
 * DOMINANT one and the whole map went dark: the layer existed and could not be seen.
 */
const colorForScope = (params) => {
    const tag = (0, exports.dominantTag)(params.scope, params.tags);
    if (params.focusTagId) {
        const focusedTag = (params.scope.tagIds ?? [])
            .map(String)
            .includes(params.focusTagId)
            ? params.tags.find((candidate) => String(candidate._id) === params.focusTagId)
            : null;
        return focusedTag ? focusedTag.color : partidaColors_1.NO_PARTIDA_COLOR;
    }
    if (tag)
        return tag.color;
    const partidaId = (params.scope.partidaIds ?? [])[0];
    return partidaId ? (0, partidaColors_1.colorForPartida)(partidaId, params.partidaName(partidaId)) : partidaColors_1.NO_PARTIDA_COLOR;
};
exports.colorForScope = colorForScope;
/**
 * The legend: first the tags in their order, then the partidas still painting
 * something.
 *
 * Only what is ACTUALLY on a scope goes in. A legend listing colors that are
 * not on the map sends people looking for something that does not exist — and
 * on a printed drawing, that search ends in a phone call.
 *
 * **The count is per tag, not per color** (01/09/2026). A scope with milling +
 * priming + asphalt counts in all THREE: they are three layers of work on the
 * same block. Counting only the color winner gave «Fresado 5 · Imprimación 0 ·
 * Asfaltado 0» with all three applied to the five streets, and a zero tells the
 * engineer that layer does not exist.
 */
const buildWorkLegend = (params) => {
    const countByTag = new Map();
    const countByPartida = new Map();
    for (const scope of params.scopes) {
        const scopeTagIds = (scope.tagIds ?? []).map(String);
        if (scopeTagIds.length > 0) {
            scopeTagIds.forEach((id) => countByTag.set(id, (countByTag.get(id) ?? 0) + 1));
            continue;
        }
        const partidaId = (scope.partidaIds ?? [])[0];
        if (partidaId)
            countByPartida.set(partidaId, (countByPartida.get(partidaId) ?? 0) + 1);
    }
    const tagEntries = byOrder(params.tags)
        .filter((tag) => params.includeUnusedTags || countByTag.has(String(tag._id)))
        .map((tag) => ({
        _id: String(tag._id),
        description: tag.name,
        color: tag.color,
        kind: 'tag',
        streetCount: countByTag.get(String(tag._id)) ?? 0,
    }));
    // `Array.from` rather than spreading the iterator: the tsconfig `target` does
    // not allow iterating an `IterableIterator` without `downlevelIteration`.
    const partidas = Array.from(countByPartida.entries()).map(([partidaId, count]) => ({
        _id: partidaId,
        description: params.partidaName(partidaId),
        color: (0, partidaColors_1.colorForPartida)(partidaId, params.partidaName(partidaId)),
        kind: 'partida',
        streetCount: count,
    }));
    return [...tagEntries, ...partidas];
};
exports.buildWorkLegend = buildWorkLegend;
const tagUsage = (params) => {
    const usage = new Map();
    for (const scope of params.scopes) {
        const width = params.widthOfScope(scope);
        const length = Math.max(0, scope.toM - scope.fromM);
        for (const rawId of scope.tagIds ?? []) {
            const id = String(rawId);
            const current = usage.get(id) ?? { scopeCount: 0, areaM2: 0, withoutWidth: 0 };
            usage.set(id, {
                scopeCount: current.scopeCount + 1,
                areaM2: current.areaM2 + (width ? length * width : 0),
                withoutWidth: current.withoutWidth + (width ? 0 : 1),
            });
        }
    }
    return usage;
};
exports.tagUsage = tagUsage;
/**
 * What was left UNTAGGED: the grey row that closes the list.
 *
 * It is not a tag —it cannot be edited or deleted— but it is the most watched
 * one: it says how much of the work has no color yet and will fall under «Sin
 * clasificar» in the drawing's table.
 */
const untaggedUsage = (params) => {
    const untaggedScopes = params.scopes.filter((scope) => (scope.tagIds ?? []).length === 0);
    return untaggedScopes.reduce((acc, scope) => {
        const width = params.widthOfScope(scope);
        return {
            scopeCount: acc.scopeCount + 1,
            areaM2: acc.areaM2 + (width ? Math.max(0, scope.toM - scope.fromM) * width : 0),
            withoutWidth: acc.withoutWidth + (width ? 0 : 1),
        };
    }, { scopeCount: 0, areaM2: 0, withoutWidth: 0 });
};
exports.untaggedUsage = untaggedUsage;
/** Tags that paint nothing yet: the UI still offers them for assignment. */
const unusedTags = (params) => {
    const usedTagIds = new Set(params.scopes.flatMap((scope) => (scope.tagIds ?? []).map(String)));
    return byOrder(params.tags).filter((tag) => !usedTagIds.has(String(tag._id)));
};
exports.unusedTags = unusedTags;
