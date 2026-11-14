/**
 * PURE helpers for the zones of the additional area report (F6b).
 * Extracted from the local logic of `AreaAdicionalForm` (Chakra, untouched until
 * the swap; dedup when it is removed): the area/volume totals per zone are
 * derived from the MEASURED photos whose `category` is the zone id.
 */
import {
  boundedPhotoArea,
  boundedPhotoVolume,
  type MeasurementShape,
} from './photoMeasurement';

export type IaaZoneRow = {
  id: string;
  item: string;
  ubicacion: string;
  descripcion: string;
  area: number | string;
  volumen: number | string;
  observaciones: string;
  /**
   * A person wrote the total, and it stops being derived from the photos.
   *
   * It exists because some measurements cannot be stored by the engine: if the
   * figure was drawn without measuring the sides, the area comes from the pixel
   * scale (`estimada`) and is discarded on purpose. In CHANCAY (17/10/2026) that
   * was 4 of 20, and without this the table fell short with no way out but going
   * back to the field. The screen warns, next to the number, that it no longer
   * matches its photos.
   */
  manual?: boolean;
  /**
   * An area measured in the field from Lilachat (José, 12/11/2026): its sides, thickness, how it was measured and
   * where. It always comes `manual`, because its photos are not measured in Portal and would sum it back to 0.
   * `entradaId` is the phone's id: a retry without signal finds the same row.
   */
  largo?: number;
  ancho?: number;
  espesor?: number;
  metodo?: string;
  point?: { lat: number; lng: number };
  precisionM?: number;
  fuente?: string;
  entradaId?: string;
};

export type IaaMeasuredPhoto = {
  category?: string;
  areaM2?: number;
  volumeM3?: number;
  /** The measured sides. They bound the stored area: see `boundedPhotoArea`. */
  measurement?: Partial<MeasurementShape> | null;
};

export const IAA_TEXT_DEFAULTS: Record<string, string> = {
  objetoInforme: `El presente documento tiene por finalidad sustentar el adicional en los metrados de mezcla asfaltica ejecutados durante las labores de colocacion, bacheo o trabajos complementarios realizados en campo.\nEl incremento en metrados responde a la necesidad de corregir areas deterioradas, zonas con depresiones, fisuras, huecos estructurales u otras afectaciones detectadas durante la ejecucion.`,
  antecedentes: `La planta de asfalto fue convocada para la provision y colocacion de mezcla asfaltica en caliente.\nDurante la ejecucion se identificaron zonas no contempladas dentro del metrado original.\nComo parte del control de calidad y continuidad del servicio, se midieron las areas reales intervenidas y se registro evidencia fotografica.`,
  descripcionTrabajos: `Actividades realizadas:\n1. Inspeccion visual y determinacion de zonas deterioradas.\n2. Demarcacion de cada area a intervenir.\n3. Corte, limpieza y preparacion de superficie.\n4. Aplicacion de imprimante cuando corresponde.\n5. Colocacion y compactacion de mezcla asfaltica.\n6. Verificacion final de continuidad y nivelacion.`,
  justificacionTecnica: `El adicional en area se justifica tecnica y operativamente por la presencia de base deteriorada, depresiones, fallas locales o condiciones reales de campo que requieren mayor intervencion para recuperar nivel, seguridad y calidad del acabado.`,
  conclusiones: `Los trabajos ejecutados en las zonas descritas superaron el metrado inicialmente programado por condiciones reales encontradas en campo.\nLas areas adicionales fueron medidas, registradas y documentadas con evidencia fotografica.\nEl metrado adicional total se solicita para evaluacion y aprobacion correspondiente.`,
};

export const IAA_TEXT_FIELDS: Array<{ key: string; label: string; rows: number }> = [
  { key: 'objetoInforme', label: 'Objeto del informe', rows: 5 },
  { key: 'antecedentes', label: 'Antecedentes', rows: 5 },
  { key: 'descripcionTrabajos', label: 'Descripción de trabajos', rows: 7 },
  { key: 'justificacionTecnica', label: 'Justificación técnica', rows: 5 },
  { key: 'conclusiones', label: 'Conclusiones', rows: 5 },
];

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const emptyIaaZone = (index: number): IaaZoneRow => ({
  id: `area-${Date.now()}-${index}`,
  item: String(index + 1),
  ubicacion: '',
  descripcion: 'Bacheo localizado',
  area: '',
  volumen: '',
  observaciones: '',
});

/**
 * Sums the area/volume of the measured photos per zone (`photo.category` = zone.id).
 *
 * Each photo counts BOUNDED by what its own sides allow: reports captured
 * before 05/09/2026 stored impossible areas (745 m² with a ceiling of 245) and
 * this total goes to the quantities table that is billed.
 */
export const getZonePhotoTotals = (
  photos: IaaMeasuredPhoto[]
): Record<string, { area: number; volume: number }> =>
  photos.reduce<Record<string, { area: number; volume: number }>>((totals, photo) => {
    const category = String(photo.category ?? '').trim();
    if (!category) return totals;
    const current = totals[category] ?? { area: 0, volume: 0 };
    return {
      ...totals,
      [category]: {
        area: current.area + toNumber(boundedPhotoArea(photo)),
        volume: current.volume + toNumber(boundedPhotoVolume(photo)),
      },
    };
  }, {});

/**
 * What the measured photos of ONE zone add up to, or `null` if it has none.
 *
 * It is what is shown to whoever wrote the total by hand: without the measured
 * number next to it, the «no coincide» notice does not say what it differs from.
 */
export const zoneMeasuredTotal = (
  zoneId: string,
  photos: IaaMeasuredPhoto[]
): { area: number; volume: number } | null =>
  getZonePhotoTotals(photos)[String(zoneId)] ?? null;

/** Applies the measured totals to the zones (area/volume read-only unless manual). */
export const applyZonePhotoTotals = (
  rows: IaaZoneRow[],
  photos: IaaMeasuredPhoto[]
): IaaZoneRow[] => {
  const totals = getZonePhotoTotals(photos);
  return rows.map((row) =>
    row.manual
      ? row
      : {
          ...row,
          area: (totals[row.id]?.area ?? 0).toFixed(2),
          volumen: (totals[row.id]?.volume ?? 0).toFixed(3),
        }
  );
};

/**
 * Recomputes the zones' area/volume for the canvas EDITABLE table + the PDF:
 * - zone WITH photos → measured sum (read-only in practice: the photo rules).
 * - zone that LOST its last photo (it was in `prevPhotos`, no longer in `photos`) →
 *   reset to empty (do not leave an orphan total that over-reports).
 * - zone that NEVER had photos → keeps its hand-typed value.
 * - zone marked `manual` → untouched: a person set the number (see `manual`).
 * `prevPhotos` is optional: the server (PDF) recomputes without prev (orphans
 * were already reset by the client and are kept as an empty manual value).
 */
export const recomputeZoneTotals = (
  rows: IaaZoneRow[],
  photos: IaaMeasuredPhoto[],
  prevPhotos?: IaaMeasuredPhoto[]
): IaaZoneRow[] => {
  const totals = getZonePhotoTotals(photos);
  const prevTotals = prevPhotos ? getZonePhotoTotals(prevPhotos) : {};
  return rows.map((row) => {
    if (row.manual) return row;
    const id = String((row as { id?: string }).id ?? '');
    const zoneTotal = totals[id];
    if (zoneTotal) return { ...row, area: zoneTotal.area.toFixed(2), volumen: zoneTotal.volume.toFixed(3) };
    if (prevTotals[id]) return { ...row, area: '', volumen: '' };
    return row;
  });
};

/**
 * Groups photo entries (with their original index) by zone, in the zones' ORDER;
 * those without a zone (or whose `category` no longer matches any zone) go last
 * as "Sin zona". Pure and generic: shared by the admin canvas and the public
 * mobile photo panel. The original index is kept to edit/delete the right photo
 * after grouping.
 */
export const groupPhotosByZone = <T extends { category?: string }>(
  entries: Array<{ photo: T; index: number }>,
  zoneOptions: Array<{ value: string; label: string }>,
  orphanLabel = 'Sin zona'
): Array<{ zoneId: string; zoneLabel: string; entries: Array<{ photo: T; index: number }> }> => {
  const groups = zoneOptions.map((zone) => ({
    zoneId: zone.value,
    zoneLabel: zone.label,
    entries: [] as Array<{ photo: T; index: number }>,
  }));
  const byId = new Map(groups.map((group) => [group.zoneId, group]));
  const orphan = { zoneId: '', zoneLabel: orphanLabel, entries: [] as Array<{ photo: T; index: number }> };
  for (const entry of entries) {
    const category = String(entry.photo.category ?? '').trim();
    (byId.get(category) ?? orphan).entries.push(entry);
  }
  const result = groups.filter((group) => group.entries.length > 0);
  if (orphan.entries.length > 0) result.push(orphan);
  return result;
};

/** Renumbers and casts numerics (parity with the form's `normalizeAreaRows`). */
export const normalizeIaaZones = (rows: IaaZoneRow[]): IaaZoneRow[] =>
  rows.map((row, index) => ({
    ...row,
    item: String(index + 1),
    area: toNumber(row.area),
    volumen: toNumber(row.volumen),
  }));
