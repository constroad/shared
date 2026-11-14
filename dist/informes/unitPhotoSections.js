"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUnitPhotoDispatchId = exports.buildUnitPhotoSectionKey = exports.UNIT_PHOTO_SECTION_PREFIX = void 0;
/**
 * CTL-PIS: each truck has its gallery in a section of its own,
 * `unitPhotos_<dispatchId>`. The prefix only groups the refs in `schemaData`.
 * Pure.
 */
exports.UNIT_PHOTO_SECTION_PREFIX = 'unitPhotos_';
const buildUnitPhotoSectionKey = (dispatchId) => `${exports.UNIT_PHOTO_SECTION_PREFIX}${dispatchId}`;
exports.buildUnitPhotoSectionKey = buildUnitPhotoSectionKey;
const parseUnitPhotoDispatchId = (sectionKey) => sectionKey.startsWith(exports.UNIT_PHOTO_SECTION_PREFIX) ? sectionKey.slice(exports.UNIT_PHOTO_SECTION_PREFIX.length) : null;
exports.parseUnitPhotoDispatchId = parseUnitPhotoDispatchId;
