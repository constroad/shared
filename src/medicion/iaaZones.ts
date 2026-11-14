/**
 * Helpers PUROS de las zonas del informe de área adicional (F6b).
 * Extraídos de la lógica local de `AreaAdicionalForm` (Chakra, que no se toca
 * hasta el swap — dedup al eliminarlo): los totales de área/volumen por zona
 * se derivan de las fotos MEDIDAS cuya `category` es el id de la zona.
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
   * El total lo escribió una persona y deja de derivarse de las fotos.
   *
   * Existe porque hay mediciones que el motor no puede guardar: si la figura se
   * dibujó sin medir los lados, el área sale de la escala en píxeles (`estimada`)
   * y se descarta a propósito. En CHANCAY (17/10/2026) fueron 4 de 20, y sin
   * esto el cuadro quedaba corto sin más salida que volver al campo. La pantalla
   * avisa, al lado del número, que ya no coincide con sus fotos.
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
  /** Los lados medidos. Acotan el área guardada: ver `boundedPhotoArea`. */
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
 * Suma área/volumen de las fotos medidas por zona (`photo.category` = zona.id).
 *
 * Cada foto entra ACOTADA por lo que sus propios lados permiten: los informes
 * capturados antes del 05/09/2026 guardaron áreas imposibles (745 m² con un techo
 * de 245) y este total va al cuadro de metrado que se presenta a cobro.
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
 * Lo que suman las fotos medidas de UNA zona, o `null` si no tiene ninguna.
 *
 * Es lo que se le muestra a quien escribió el total a mano: sin el número
 * medido al lado, el aviso de «no coincide» no dice con qué no coincide.
 */
export const zoneMeasuredTotal = (
  zoneId: string,
  photos: IaaMeasuredPhoto[]
): { area: number; volume: number } | null =>
  getZonePhotoTotals(photos)[String(zoneId)] ?? null;

/** Aplica los totales medidos a las zonas (área/volumen readonly salvo manual). */
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
 * Recalcula area/volumen de las zonas para la tabla EDITABLE del canvas + el PDF:
 * - zona CON fotos → suma medida (readonly de facto: la manda la foto).
 * - zona que PERDIÓ su última foto (estaba en `prevPhotos`, ya no en `photos`) →
 *   se resetea a vacío (no dejar un total huérfano que sobre-reporte).
 * - zona que NUNCA tuvo fotos → conserva su valor tecleado a mano.
 * - zona marcada `manual` → intacta: el número lo puso una persona (ver `manual`).
 * `prevPhotos` es opcional: el server (PDF) recomputa sin prev (las huérfanas ya
 * quedaron reseteadas por el cliente y se conservan como manual vacío).
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
 * Agrupa entradas de foto (con su índice original) por zona, en el ORDEN de las
 * zonas; las que no tienen zona (o con `category` que ya no matchea ninguna zona)
 * van al final como "Sin zona". Puro y genérico — lo comparten el canvas admin y
 * el panel fotográfico móvil público. El índice original se preserva para editar/
 * borrar la foto correcta tras agrupar.
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

/** Re-enumera y castea numéricos (paridad con `normalizeAreaRows` del form). */
export const normalizeIaaZones = (rows: IaaZoneRow[]): IaaZoneRow[] =>
  rows.map((row, index) => ({
    ...row,
    item: String(index + 1),
    area: toNumber(row.area),
    volumen: toNumber(row.volumen),
  }));
