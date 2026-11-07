import { parseUnitPhotoDispatchId } from './unitPhotoSections';

/**
 * The four photos a unit of a CTL-PIS needs (José, 06/11/2026): it came in, its
 * temperature, it left empty, and the tape showing the thickness. A photo with no
 * position does not count: without GPS there is no photo in this report. Pure.
 */

export const CTL_PIS_PHOTO_KINDS = ['ingreso', 'temperatura', 'vacia', 'escantillon'] as const;
export type CtlPisPhotoKind = (typeof CTL_PIS_PHOTO_KINDS)[number];

export const CTL_PIS_PHOTO_LABELS: Record<CtlPisPhotoKind, string> = {
  ingreso: 'ingreso',
  temperatura: 'temperatura',
  vacia: 'unidad vacía',
  escantillon: 'escantillón',
};

/** What each photo is called where a person picks it. */
export const CTL_PIS_PHOTO_TITLES: Record<CtlPisPhotoKind, string> = {
  ingreso: 'Ingreso de la unidad',
  temperatura: 'Temperatura',
  vacia: 'Unidad vacía',
  escantillon: 'Escantillón',
};

/** The order of a unit's row in the PDF. */
const PRINT_ORDER: readonly CtlPisPhotoKind[] = ['ingreso', 'temperatura', 'escantillon', 'vacia'];

/**
 * Optional photos of a unit, beyond its four (José, 07/11/2026, for engineer
 * Jeremy): they never count as missing, never block publishing, and print after
 * every unit so they cannot shift a unit's row.
 */
export const CTL_PIS_EXTRA_PHOTO = 'adicional' as const;
export const MAX_EXTRA_PHOTOS_PER_UNIT = 10;
export const CTL_PIS_EXTRA_PHOTO_TITLE = 'Fotos adicionales';
/** A unit photo's class: one of the four, or an extra one. */
export type CtlPisPhotoClass = CtlPisPhotoKind | typeof CTL_PIS_EXTRA_PHOTO;

export const isCtlPisPhotoKind = (value: unknown): value is CtlPisPhotoKind => (CTL_PIS_PHOTO_KINDS as readonly unknown[]).includes(value);

/**
 * Reports born with this mark must hold a unit's four photos and its thickness.
 * Drafts from before it were filled under the old rules and stay publishable.
 */
export const requiresUnitEvidence = (schemaData: unknown): boolean =>
  (schemaData as { control?: { unitEvidence?: unknown } } | null | undefined)?.control?.unitEvidence === true;

type PhotoPosition = { lat?: unknown; lon?: unknown; lng?: unknown };
export type CtlPisUnitPhoto = { tipoFoto?: string; stampContext?: { location?: PhotoPosition | null } | null };

const isCoordinate = (value: unknown): boolean => typeof value === 'number' && Number.isFinite(value);

export const hasPhotoPosition = (photo: CtlPisUnitPhoto): boolean => {
  const location = photo.stampContext?.location;
  return Boolean(location) && isCoordinate(location?.lat) && isCoordinate(location?.lon ?? location?.lng);
};

/** The kinds this unit has no valid photo of. */
export const missingUnitPhotoKinds = (photos: readonly CtlPisUnitPhoto[]): CtlPisPhotoKind[] =>
  CTL_PIS_PHOTO_KINDS.filter((kind) => !photos.some((photo) => photo.tipoFoto === kind && hasPhotoPosition(photo)));

/**
 * A unit's row of the PDF: the latest photo of each kind, always in the same
 * columns. A photo taken again goes in `rest`, so it cannot shift the rows below.
 */
export function printRowOf<T extends { tipoFoto?: string }>(photos: readonly T[]): { row: T[]; rest: T[] } {
  const row = PRINT_ORDER.flatMap((kind) => photos.filter((photo) => photo.tipoFoto === kind).slice(-1));
  return { row, rest: photos.filter((photo) => !row.includes(photo)) };
}

/** Whether a unit is still «terminó» after taking this photo away. */
export const keepsEmptyPhoto = (photos: readonly { tipoFoto?: string; mediaId?: unknown }[], removedMediaId: string): boolean =>
  photos.some((photo) => photo.tipoFoto === 'vacia' && String(photo.mediaId) !== removedMediaId);

export const isUnitOfReport = (schemaData: unknown, dispatchId: string): boolean => {
  const rows = (schemaData as { controlPista?: unknown } | null | undefined)?.controlPista;
  return Boolean(dispatchId) && Array.isArray(rows) && rows.some((row) => String((row as { _dispatchId?: unknown })?._dispatchId) === dispatchId);
};

/** Each unit's gallery, for its thumbnails and its buttons. */
export const unitPhotosByDispatchOf = <T,>(schemaData: Record<string, unknown>): Record<string, T[]> =>
  Object.fromEntries(
    Object.keys(schemaData).flatMap((key) => {
      const dispatchId = parseUnitPhotoDispatchId(key);
      if (dispatchId === null) return [];
      const photos = (schemaData[key] as { fotos?: unknown } | undefined)?.fotos;
      return [[dispatchId, Array.isArray(photos) ? (photos as T[]) : []]];
    })
  );
