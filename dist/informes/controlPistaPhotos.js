"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitPhotosByDispatchOf = exports.isUnitOfReport = exports.keepsEmptyPhoto = exports.missingUnitPhotoKinds = exports.hasPhotoPosition = exports.requiresUnitEvidence = exports.isCtlPisPhotoKind = exports.CTL_PIS_EXTRA_PHOTO_TITLE = exports.MAX_EXTRA_PHOTOS_PER_UNIT = exports.CTL_PIS_EXTRA_PHOTO = exports.CTL_PIS_PHOTO_TITLES = exports.CTL_PIS_PHOTO_LABELS = exports.CTL_PIS_PHOTO_KINDS = void 0;
exports.printRowOf = printRowOf;
const unitPhotoSections_1 = require("./unitPhotoSections");
/**
 * The four photos a unit of a CTL-PIS needs (José, 06/11/2026): it came in, its
 * temperature, it left empty, and the tape showing the thickness. A photo with no
 * position does not count: without GPS there is no photo in this report. Pure.
 */
exports.CTL_PIS_PHOTO_KINDS = ['ingreso', 'temperatura', 'vacia', 'escantillon'];
exports.CTL_PIS_PHOTO_LABELS = {
    ingreso: 'ingreso',
    temperatura: 'temperatura',
    vacia: 'unidad vacía',
    escantillon: 'escantillón',
};
/** What each photo is called where a person picks it. */
exports.CTL_PIS_PHOTO_TITLES = {
    ingreso: 'Ingreso de la unidad',
    temperatura: 'Temperatura',
    vacia: 'Unidad vacía',
    escantillon: 'Escantillón',
};
/** The order of a unit's row in the PDF. */
const PRINT_ORDER = ['ingreso', 'temperatura', 'escantillon', 'vacia'];
/**
 * Optional photos of a unit, beyond its four (José, 07/11/2026, for engineer
 * Jeremy): they never count as missing, never block publishing, and print after
 * every unit so they cannot shift a unit's row.
 */
exports.CTL_PIS_EXTRA_PHOTO = 'adicional';
exports.MAX_EXTRA_PHOTOS_PER_UNIT = 10;
exports.CTL_PIS_EXTRA_PHOTO_TITLE = 'Fotos adicionales';
const isCtlPisPhotoKind = (value) => exports.CTL_PIS_PHOTO_KINDS.includes(value);
exports.isCtlPisPhotoKind = isCtlPisPhotoKind;
/**
 * Reports born with this mark must hold a unit's four photos and its thickness.
 * Drafts from before it were filled under the old rules and stay publishable.
 */
const requiresUnitEvidence = (schemaData) => schemaData?.control?.unitEvidence === true;
exports.requiresUnitEvidence = requiresUnitEvidence;
const isCoordinate = (value) => typeof value === 'number' && Number.isFinite(value);
const hasPhotoPosition = (photo) => {
    const location = photo.stampContext?.location;
    return Boolean(location) && isCoordinate(location?.lat) && isCoordinate(location?.lon ?? location?.lng);
};
exports.hasPhotoPosition = hasPhotoPosition;
/** The kinds this unit has no valid photo of. */
const missingUnitPhotoKinds = (photos) => exports.CTL_PIS_PHOTO_KINDS.filter((kind) => !photos.some((photo) => photo.tipoFoto === kind && (0, exports.hasPhotoPosition)(photo)));
exports.missingUnitPhotoKinds = missingUnitPhotoKinds;
/**
 * A unit's row of the PDF: the latest photo of each kind, always in the same
 * columns. A photo taken again goes in `rest`, so it cannot shift the rows below.
 */
function printRowOf(photos) {
    const row = PRINT_ORDER.flatMap((kind) => photos.filter((photo) => photo.tipoFoto === kind).slice(-1));
    return { row, rest: photos.filter((photo) => !row.includes(photo)) };
}
/** Whether a unit is still «terminó» after taking this photo away. */
const keepsEmptyPhoto = (photos, removedMediaId) => photos.some((photo) => photo.tipoFoto === 'vacia' && String(photo.mediaId) !== removedMediaId);
exports.keepsEmptyPhoto = keepsEmptyPhoto;
const isUnitOfReport = (schemaData, dispatchId) => {
    const rows = schemaData?.controlPista;
    return Boolean(dispatchId) && Array.isArray(rows) && rows.some((row) => String(row?._dispatchId) === dispatchId);
};
exports.isUnitOfReport = isUnitOfReport;
/** Each unit's gallery, for its thumbnails and its buttons. */
const unitPhotosByDispatchOf = (schemaData) => Object.fromEntries(Object.keys(schemaData).flatMap((key) => {
    const dispatchId = (0, unitPhotoSections_1.parseUnitPhotoDispatchId)(key);
    if (dispatchId === null)
        return [];
    const photos = schemaData[key]?.fotos;
    return [[dispatchId, Array.isArray(photos) ? photos : []]];
}));
exports.unitPhotosByDispatchOf = unitPhotosByDispatchOf;
