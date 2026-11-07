/**
 * CTL-PIS: each truck has its gallery in a section of its own,
 * `unitPhotos_<dispatchId>`. The prefix only groups the refs in `schemaData`.
 * Pure.
 */
export declare const UNIT_PHOTO_SECTION_PREFIX = "unitPhotos_";
export declare const buildUnitPhotoSectionKey: (dispatchId: string) => string;
export declare const parseUnitPhotoDispatchId: (sectionKey: string) => string | null;
