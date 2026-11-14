"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinTileSegments = exports.attachAtTouchingEnd = void 0;
const streetGeometry_1 = require("./streetGeometry");
/**
 * Stitching of the geometry the BASE MAP returns.
 *
 * When the engineer taps a street, MapLibre's `queryRenderedFeatures` does not
 * return the road: it returns the pieces that fall in each rendered tile,
 * clipped at the tile edge, sometimes reversed and almost never in order.
 * Saving that as is splits the street into chunks and ruins every chainage —
 * from then on "from 40 to 150" means nothing.
 *
 * This module joins those pieces into continuous chains. It is pure: it knows
 * nothing about MapLibre or tiles, only about ends that touch.
 */
/** Tile clipping leaves ends that are almost equal, not identical. */
const DEFAULT_TOLERANCE_M = 2;
const isUsable = (piece) => Array.isArray(piece) && piece.length >= 2;
const reversed = (piece) => [...piece].reverse();
const touches = (from, to, toleranceM) => (0, streetGeometry_1.haversineMeters)(from, to) <= toleranceM;
/**
 * The chain with `piece` attached at whichever end touches, or null.
 *
 * The tail is tried before the head, and the piece's own start before its end,
 * so a piece that could fit either way always lands in the same place. Shared
 * by `joinTileSegments` (2 m, tile clipping) and `growChain` (25 m, a crossing).
 */
const attachAtTouchingEnd = (chain, piece, toleranceM) => {
    const head = chain[0];
    const tail = chain[chain.length - 1];
    if (touches(tail, piece[0], toleranceM))
        return [...chain, ...piece.slice(1)];
    if (touches(tail, piece[piece.length - 1], toleranceM)) {
        return [...chain, ...reversed(piece).slice(1)];
    }
    if (touches(head, piece[piece.length - 1], toleranceM))
        return [...piece.slice(0, -1), ...chain];
    if (touches(head, piece[0], toleranceM))
        return [...reversed(piece).slice(0, -1), ...chain];
    return null;
};
exports.attachAtTouchingEnd = attachAtTouchingEnd;
/**
 * Joins the pieces that touch into continuous chains.
 *
 * Returns the chains sorted from longest to shortest: the UI takes the first
 * one, and that one has to be the road, not a loose sliver of the tile. If
 * several are left, the pieces were NOT from the same street.
 */
const joinTileSegments = (pieces, toleranceM = DEFAULT_TOLERANCE_M) => {
    const pending = (pieces ?? []).filter(isUsable).map((piece) => [...piece]);
    const chains = [];
    while (pending.length > 0) {
        let chain = pending.shift();
        let grew = true;
        // Retry until no end finds a partner: a piece that did not fit at first
        // can fit after the chain has grown.
        while (grew) {
            grew = false;
            for (let index = 0; index < pending.length; index += 1) {
                const merged = (0, exports.attachAtTouchingEnd)(chain, pending[index], toleranceM);
                if (merged) {
                    chain = merged;
                    pending.splice(index, 1);
                    grew = true;
                    break;
                }
            }
        }
        chains.push(chain);
    }
    return chains.sort((left, right) => (0, streetGeometry_1.lengthOfLine)(right) - (0, streetGeometry_1.lengthOfLine)(left));
};
exports.joinTileSegments = joinTileSegments;
