/**
 * CTL-PIS: each truck has its gallery in a section of its own,
 * `unitPhotos_<dispatchId>`. The prefix only groups the refs in `schemaData`.
 * Pure.
 */
export const UNIT_PHOTO_SECTION_PREFIX = 'unitPhotos_';

export const buildUnitPhotoSectionKey = (dispatchId: string): string => `${UNIT_PHOTO_SECTION_PREFIX}${dispatchId}`;

export const parseUnitPhotoDispatchId = (sectionKey: string): string | null =>
  sectionKey.startsWith(UNIT_PHOTO_SECTION_PREFIX) ? sectionKey.slice(UNIT_PHOTO_SECTION_PREFIX.length) : null;
