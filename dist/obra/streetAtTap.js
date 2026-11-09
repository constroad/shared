"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRoadFeature = isRoadFeature;
exports.streetAtTap = streetAtTap;
const basemapStreet_1 = require("./basemapStreet");
/**
 * The street under the finger (audit 07/11, José: «audítalo y mejóralo»). `streetFromBasemapFeatures`
 * takes the first named feature as the tapped one; a map asked for everything in view hands back any
 * street first. Here the features under the finger decide which road it is, and the ones around
 * only give it its name and its continuation. Rivers and canals, which are lines too, never count.
 *
 * PURE: Portal and Lilachat ask their maps and pass the features here.
 */
const ROAD_CLASSES = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service', 'track', 'path', 'busway', 'raceway', 'motorway_construction', 'trunk_construction', 'primary_construction', 'secondary_construction', 'tertiary_construction', 'minor_construction']);
/** A road of the OpenMapTiles `transportation` layers, by its class; no class at all is taken as a road. */
function isRoadFeature(feature) {
    const kind = feature?.properties?.class;
    return typeof kind !== 'string' || ROAD_CLASSES.has(kind);
}
const nameOfFirst = (features) => {
    for (const feature of features) {
        const name = feature?.properties?.name;
        if (typeof name === 'string' && name.trim())
            return name.trim();
    }
    return '';
};
function streetAtTap({ underFinger, nearby, tap }) {
    const roads = underFinger.filter(isRoadFeature);
    const around = nearby.filter(isRoadFeature);
    const name = nameOfFirst(roads) || (0, basemapStreet_1.nameNearestTo)(around, tap);
    if (!roads.length)
        return null;
    if (!name)
        return (0, basemapStreet_1.streetFromBasemapFeatures)(roads, tap);
    const named = (feature) => ({ ...feature, properties: { ...(feature.properties ?? {}), name } });
    // The anonymous pieces under the finger take the street's name, so they join its named pieces around.
    const sameStreet = around.filter((feature) => feature?.properties?.name === name);
    return (0, basemapStreet_1.streetFromBasemapFeatures)(withoutRepeats([...roads.map(named), ...sameStreet]), tap);
}
const lineKey = (feature) => {
    const coordinates = feature?.geometry?.coordinates;
    if (!Array.isArray(coordinates))
        return '';
    const forward = JSON.stringify(coordinates);
    const backward = JSON.stringify([...coordinates].reverse());
    return forward < backward ? forward : backward;
};
/**
 * The drawn road and its name label are the SAME line in the tiles (`transportation` and
 * `transportation_name`), and a tile edge repeats it too. Joined twice, the street doubles back on
 * itself and its length doubles: each line enters once, whichever way it runs.
 */
function withoutRepeats(features) {
    const seen = new Set();
    return features.filter((feature) => {
        const key = lineKey(feature);
        if (!key || seen.has(key))
            return !key;
        seen.add(key);
        return true;
    });
}
