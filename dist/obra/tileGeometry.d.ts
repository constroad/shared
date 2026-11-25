import { type LatLng } from './streetGeometry';
/**
 * The chain with `piece` attached at whichever end touches, or null.
 *
 * The tail is tried before the head, and the piece's own start before its end,
 * so a piece that could fit either way always lands in the same place. Shared
 * by `joinTileSegments` (2 m, tile clipping) and `growChain` (25 m, a crossing).
 */
export declare const attachAtTouchingEnd: (chain: LatLng[], piece: LatLng[], toleranceM: number) => LatLng[] | null;
/**
 * Joins the pieces that touch into continuous chains.
 *
 * Returns the chains sorted from longest to shortest: the UI takes the first
 * one, and that one has to be the road, not a loose sliver of the tile. If
 * several are left, the pieces were NOT from the same street.
 */
export declare const joinTileSegments: (pieces: LatLng[][], toleranceM?: number) => LatLng[][];
