"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.photoSpotTitle = exports.PHOTO_PIN_PREFIX = exports.PHOTO_STREET_REACH_M = exports.PHOTO_SPOT_M = void 0;
exports.placeOnStreets = placeOnStreets;
exports.photoSpotsOf = photoSpotsOf;
exports.photoLayerFiles = photoLayerFiles;
const kmStrip_1 = require("./kmStrip");
const streetGeometry_1 = require("./streetGeometry");
/** Photos closer than this along a street are one spot: a dump truck empties over a few meters. */
exports.PHOTO_SPOT_M = 15;
/** Farther than this from the axis, a photo is not of that street (the same reach the units use). */
exports.PHOTO_STREET_REACH_M = 30;
/** The id a photo spot's pin carries: `fotos-<spot id>`. */
exports.PHOTO_PIN_PREFIX = 'fotos-';
const OFF_THE_WORK = 'Fuera de las calles de la obra';
const LOOSE_SPOT_PREFIX = 'fuera-';
function placeOnStreets(streets, photo) {
    let best = { photo, streetId: null, atM: 0 };
    let bestDistance = exports.PHOTO_STREET_REACH_M;
    for (const street of streets) {
        const foot = (0, streetGeometry_1.projectToLine)(street.geometry, photo);
        // A tie keeps the first street: two streets drawn over the same road stay in the map's order.
        if (foot && (best.streetId === null ? foot.distanceM <= bestDistance : foot.distanceM < bestDistance)) {
            best = { photo, streetId: street._id, atM: foot.measureM };
            bestDistance = foot.distanceM;
        }
    }
    return best;
}
/** ISO instants order as text: newest first. */
const newestFirst = (photos) => [...photos].sort((left, right) => (left.at < right.at ? 1 : left.at > right.at ? -1 : 0));
function streetSpots(street, placed) {
    const groups = [];
    for (const one of [...placed].sort((left, right) => left.atM - right.atM)) {
        const last = groups[groups.length - 1];
        if (last && one.atM - last[0].atM <= exports.PHOTO_SPOT_M)
            last.push(one);
        else
            groups.push([one]);
    }
    return groups.map((group) => {
        const atM = Math.round(group.reduce((total, one) => total + one.atM, 0) / group.length);
        const point = (0, streetGeometry_1.pointAtMeasure)(street.geometry, atM) ?? group[0].photo;
        return { id: `${street._id}-${atM}`, lat: point.lat, lng: point.lng, streetId: street._id, streetName: street.name, atM, photos: newestFirst(group.map((one) => one.photo)) };
    });
}
function looseSpots(photos) {
    const groups = [];
    for (const photo of photos) {
        const near = groups.find((group) => (0, streetGeometry_1.haversineMeters)(group[0], photo) <= exports.PHOTO_SPOT_M);
        if (near)
            near.push(photo);
        else
            groups.push([photo]);
    }
    return groups.map((group) => ({ id: `${LOOSE_SPOT_PREFIX}${group[0].id}`, lat: group[0].lat, lng: group[0].lng, streetId: null, streetName: null, atM: null, photos: newestFirst(group) }));
}
/** Street by street in the map's order, along each one from 0+000; the loose ones last. */
function photoSpotsOf(streets, photos) {
    const placed = photos.map((photo) => placeOnStreets(streets, photo));
    const onStreets = streets.flatMap((street) => {
        const mine = placed.filter((one) => one.streetId === street._id);
        return mine.length ? streetSpots(street, mine) : [];
    });
    return [...onStreets, ...looseSpots(placed.filter((one) => one.streetId === null).map((one) => one.photo))];
}
/** «Jr. Los Pinos · 0+044», or that it fell off the work. */
const photoSpotTitle = (spot) => spot.streetName !== null && spot.atM !== null ? `${spot.streetName} · ${(0, kmStrip_1.stationLabel)(spot.atM)}` : OFF_THE_WORK;
exports.photoSpotTitle = photoSpotTitle;
/**
 * A marker opens its own spot first, and the viewer swipes through every spot of the
 * layer, in the map's order. `sourceLabel` names where a photo comes from («Control de
 * pista · QAA-001»): each app has its own report names. `null` when the pin is not of the layer.
 */
function photoLayerFiles(spots, pinId, sourceLabel) {
    const at = spots.findIndex((spot) => `${exports.PHOTO_PIN_PREFIX}${spot.id}` === pinId);
    if (at < 0 || !spots[at].photos.length)
        return null;
    const files = spots.flatMap((spot) => spot.photos.map((photo) => ({
        url: photo.url,
        thumbUrl: photo.thumbnailUrl,
        mime: photo.kind === 'video' ? 'video/mp4' : 'image/jpeg',
        title: `${sourceLabel(photo)} · ${(0, exports.photoSpotTitle)(spot)}`,
        at: photo.at,
    })));
    const startIndex = spots.slice(0, at).reduce((sum, spot) => sum + spot.photos.length, 0);
    return { startIndex, files };
}
