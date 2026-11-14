"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nameNearestTo = exports.streetFromBasemapFeatures = exports.growChain = void 0;
const tileGeometry_1 = require("./tileGeometry");
const streetGeometry_1 = require("./streetGeometry");
/** Name keys in OpenFreeMap tiles, in order of preference. */
const NAME_KEYS = ['name', 'name:latin', 'name:es', 'ref'];
const nameOf = (feature) => {
    const properties = feature?.properties ?? {};
    for (const key of NAME_KEYS) {
        const value = properties[key];
        if (typeof value === 'string' && value.trim())
            return value.trim();
    }
    return '';
};
const isCoordPair = (value) => Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1]);
const toLine = (coordinates) => {
    if (!Array.isArray(coordinates) || coordinates.length < 2)
        return null;
    if (!coordinates.every(isCoordPair))
        return null;
    return coordinates.map(([lng, lat]) => ({ lat, lng }));
};
/** The pieces of a feature: one line, or several if it is a MultiLineString. */
const linesOf = (feature) => {
    const geometry = feature?.geometry;
    if (geometry?.type === 'LineString') {
        const line = toLine(geometry.coordinates);
        return line ? [line] : [];
    }
    if (geometry?.type === 'MultiLineString' && Array.isArray(geometry.coordinates)) {
        return geometry.coordinates.map(toLine).filter((line) => line !== null);
    }
    // Blocks, parks and buildings also fall under the finger.
    return [];
};
/** The chain that passes closest to the finger. Ties go to the longest. */
const nearestChain = (chains, tap) => {
    let best = chains[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    chains.forEach((chain) => {
        const projected = (0, streetGeometry_1.projectToLine)(chain, tap);
        if (projected && projected.distanceM < bestDistance) {
            bestDistance = projected.distanceM;
            best = chain;
        }
    });
    return best;
};
/**
 * How far apart two chains can be and still count as the SAME street going on.
 *
 * The tile cuts the road at its edge and at every intersection, and the ends do
 * not land exactly: 25 m covers the width of a crossing without reaching the
 * next block of a parallel street.
 */
const CHAIN_GAP_M = 25;
/**
 * The tapped chain, GROWN with the chains that continue it.
 *
 * "Jirón Los Pinos" goes on past the crossing and the base map delivers it in
 * pieces. Keeping only the one under the finger put half the street into the
 * work and left the handle with nothing to stretch: it was not that it could
 * not be trimmed, the geometry ended at the corner.
 *
 * Only what TOUCHES an end (`CHAIN_GAP_M`) is attached, one at a time, so an
 * avenue that repeats its name in another neighbourhood does not get in just
 * for being in the list.
 */
const growChain = (chains, chosen) => {
    const loose = chains.filter((chain) => chain !== chosen && chain.length >= 2);
    let grown = [...chosen];
    let didGrow = true;
    while (didGrow) {
        didGrow = false;
        for (let index = 0; index < loose.length; index += 1) {
            const attached = (0, tileGeometry_1.attachAtTouchingEnd)(grown, loose[index], CHAIN_GAP_M);
            if (attached) {
                grown = attached;
                loose.splice(index, 1);
                didGrow = true;
                break;
            }
        }
    }
    return grown;
};
exports.growChain = growChain;
/**
 * How many chains were left OUTSIDE the grown street.
 *
 * They are the ones carrying the same name but lying elsewhere —an avenue
 * repeats its name across half the city—. The editor warns with this, and now
 * the warning means something: before, it also counted the chains that really
 * were the continuation.
 */
const chainsLeftOver = (chains, chosen, grown) => chains.filter((chain) => chain !== chosen &&
    chain.length >= 2 &&
    !grown.some((point) => (0, streetGeometry_1.haversineMeters)(point, chain[0]) <= CHAIN_GAP_M)).length;
const sameName = (left, right) => left.toLocaleLowerCase('es-PE') === right.toLocaleLowerCase('es-PE');
/**
 * Axis of the tapped street. `features` comes ordered top to bottom, so the
 * first one with line geometry is the one the finger picked.
 *
 * With `tap`, the chain CLOSEST to the finger is chosen instead of the longest:
 * an avenue repeats its name across half the city, and keeping the longest
 * chunk would return a block in another district.
 */
const streetFromBasemapFeatures = (features, tap) => {
    const usable = (features ?? []).filter((feature) => linesOf(feature).length > 0);
    // Named first: in OpenMapTiles tiles the geometry lives in `transportation`
    // (anonymous) and the name in `transportation_name`, and the anonymous one
    // tends to be on top. Keeping that one would leave the street without a name
    // and without anything to group its tile pieces by.
    const tapped = usable.find((feature) => nameOf(feature) !== '') ?? usable[0];
    if (!tapped)
        return null;
    const name = nameOf(tapped);
    // Without a name there is nothing to group by: joining every anonymous piece
    // in view would build a monster crossing half the city. Only the tapped one.
    const pieces = name
        ? usable.filter((feature) => sameName(nameOf(feature), name)).flatMap(linesOf)
        : linesOf(tapped);
    const chains = (0, tileGeometry_1.joinTileSegments)(pieces);
    if (chains.length === 0 || chains[0].length < 2)
        return null;
    const chosen = tap ? nearestChain(chains, tap) : chains[0];
    // The street goes on past the crossing: the chains that continue it are
    // attached. Whatever stays loose is what really lies elsewhere.
    const line = (0, exports.growChain)(chains, chosen);
    return { name, line, extraChains: chainsLeftOver(chains, chosen, line) };
};
exports.streetFromBasemapFeatures = streetFromBasemapFeatures;
/** How far from the tap the named road is accepted to be. */
const NAME_LOOKUP_RADIUS_M = 25;
/**
 * Name of the named road closest to the tap.
 *
 * Needed because names travel in ANOTHER tile layer (`transportation_name`)
 * and **are only drawn where the label fits**: asking what is painted under the
 * finger for its name returns empty along most of the block. Here the roads of
 * the tiles already loaded are searched, by proximity.
 */
const nameNearestTo = (features, tap, maxDistanceM = NAME_LOOKUP_RADIUS_M) => {
    let best = '';
    let bestDistance = maxDistanceM;
    (features ?? []).forEach((feature) => {
        const name = nameOf(feature);
        if (!name)
            return;
        linesOf(feature).forEach((line) => {
            const projected = (0, streetGeometry_1.projectToLine)(line, tap);
            if (projected && projected.distanceM < bestDistance) {
                bestDistance = projected.distanceM;
                best = name;
            }
        });
    });
    return best;
};
exports.nameNearestTo = nameNearestTo;
