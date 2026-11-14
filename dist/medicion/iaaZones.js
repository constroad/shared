"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeIaaZones = exports.groupPhotosByZone = exports.recomputeZoneTotals = exports.applyZonePhotoTotals = exports.zoneMeasuredTotal = exports.getZonePhotoTotals = exports.emptyIaaZone = exports.IAA_TEXT_FIELDS = exports.IAA_TEXT_DEFAULTS = void 0;
/**
 * PURE helpers for the zones of the additional area report (F6b).
 * Extracted from the local logic of `AreaAdicionalForm` (Chakra, untouched until
 * the swap; dedup when it is removed): the area/volume totals per zone are
 * derived from the MEASURED photos whose `category` is the zone id.
 */
const photoMeasurement_1 = require("./photoMeasurement");
exports.IAA_TEXT_DEFAULTS = {
    objetoInforme: `El presente documento tiene por finalidad sustentar el adicional en los metrados de mezcla asfaltica ejecutados durante las labores de colocacion, bacheo o trabajos complementarios realizados en campo.\nEl incremento en metrados responde a la necesidad de corregir areas deterioradas, zonas con depresiones, fisuras, huecos estructurales u otras afectaciones detectadas durante la ejecucion.`,
    antecedentes: `La planta de asfalto fue convocada para la provision y colocacion de mezcla asfaltica en caliente.\nDurante la ejecucion se identificaron zonas no contempladas dentro del metrado original.\nComo parte del control de calidad y continuidad del servicio, se midieron las areas reales intervenidas y se registro evidencia fotografica.`,
    descripcionTrabajos: `Actividades realizadas:\n1. Inspeccion visual y determinacion de zonas deterioradas.\n2. Demarcacion de cada area a intervenir.\n3. Corte, limpieza y preparacion de superficie.\n4. Aplicacion de imprimante cuando corresponde.\n5. Colocacion y compactacion de mezcla asfaltica.\n6. Verificacion final de continuidad y nivelacion.`,
    justificacionTecnica: `El adicional en area se justifica tecnica y operativamente por la presencia de base deteriorada, depresiones, fallas locales o condiciones reales de campo que requieren mayor intervencion para recuperar nivel, seguridad y calidad del acabado.`,
    conclusiones: `Los trabajos ejecutados en las zonas descritas superaron el metrado inicialmente programado por condiciones reales encontradas en campo.\nLas areas adicionales fueron medidas, registradas y documentadas con evidencia fotografica.\nEl metrado adicional total se solicita para evaluacion y aprobacion correspondiente.`,
};
exports.IAA_TEXT_FIELDS = [
    { key: 'objetoInforme', label: 'Objeto del informe', rows: 5 },
    { key: 'antecedentes', label: 'Antecedentes', rows: 5 },
    { key: 'descripcionTrabajos', label: 'Descripción de trabajos', rows: 7 },
    { key: 'justificacionTecnica', label: 'Justificación técnica', rows: 5 },
    { key: 'conclusiones', label: 'Conclusiones', rows: 5 },
];
const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};
const emptyIaaZone = (index) => ({
    id: `area-${Date.now()}-${index}`,
    item: String(index + 1),
    ubicacion: '',
    descripcion: 'Bacheo localizado',
    area: '',
    volumen: '',
    observaciones: '',
});
exports.emptyIaaZone = emptyIaaZone;
/**
 * Sums the area/volume of the measured photos per zone (`photo.category` = zone.id).
 *
 * Each photo counts BOUNDED by what its own sides allow: reports captured
 * before 05/09/2026 stored impossible areas (745 m² with a ceiling of 245) and
 * this total goes to the quantities table that is billed.
 */
const getZonePhotoTotals = (photos) => photos.reduce((totals, photo) => {
    const category = String(photo.category ?? '').trim();
    if (!category)
        return totals;
    const current = totals[category] ?? { area: 0, volume: 0 };
    return {
        ...totals,
        [category]: {
            area: current.area + toNumber((0, photoMeasurement_1.boundedPhotoArea)(photo)),
            volume: current.volume + toNumber((0, photoMeasurement_1.boundedPhotoVolume)(photo)),
        },
    };
}, {});
exports.getZonePhotoTotals = getZonePhotoTotals;
/**
 * What the measured photos of ONE zone add up to, or `null` if it has none.
 *
 * It is what is shown to whoever wrote the total by hand: without the measured
 * number next to it, the «no coincide» notice does not say what it differs from.
 */
const zoneMeasuredTotal = (zoneId, photos) => (0, exports.getZonePhotoTotals)(photos)[String(zoneId)] ?? null;
exports.zoneMeasuredTotal = zoneMeasuredTotal;
/** Applies the measured totals to the zones (area/volume read-only unless manual). */
const applyZonePhotoTotals = (rows, photos) => {
    const totals = (0, exports.getZonePhotoTotals)(photos);
    return rows.map((row) => row.manual
        ? row
        : {
            ...row,
            area: (totals[row.id]?.area ?? 0).toFixed(2),
            volumen: (totals[row.id]?.volume ?? 0).toFixed(3),
        });
};
exports.applyZonePhotoTotals = applyZonePhotoTotals;
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
const recomputeZoneTotals = (rows, photos, prevPhotos) => {
    const totals = (0, exports.getZonePhotoTotals)(photos);
    const prevTotals = prevPhotos ? (0, exports.getZonePhotoTotals)(prevPhotos) : {};
    return rows.map((row) => {
        if (row.manual)
            return row;
        const id = String(row.id ?? '');
        const zoneTotal = totals[id];
        if (zoneTotal)
            return { ...row, area: zoneTotal.area.toFixed(2), volumen: zoneTotal.volume.toFixed(3) };
        if (prevTotals[id])
            return { ...row, area: '', volumen: '' };
        return row;
    });
};
exports.recomputeZoneTotals = recomputeZoneTotals;
/**
 * Groups photo entries (with their original index) by zone, in the zones' ORDER;
 * those without a zone (or whose `category` no longer matches any zone) go last
 * as "Sin zona". Pure and generic: shared by the admin canvas and the public
 * mobile photo panel. The original index is kept to edit/delete the right photo
 * after grouping.
 */
const groupPhotosByZone = (entries, zoneOptions, orphanLabel = 'Sin zona') => {
    const groups = zoneOptions.map((zone) => ({
        zoneId: zone.value,
        zoneLabel: zone.label,
        entries: [],
    }));
    const byId = new Map(groups.map((group) => [group.zoneId, group]));
    const orphan = { zoneId: '', zoneLabel: orphanLabel, entries: [] };
    for (const entry of entries) {
        const category = String(entry.photo.category ?? '').trim();
        (byId.get(category) ?? orphan).entries.push(entry);
    }
    const result = groups.filter((group) => group.entries.length > 0);
    if (orphan.entries.length > 0)
        result.push(orphan);
    return result;
};
exports.groupPhotosByZone = groupPhotosByZone;
/** Renumbers and casts numerics (parity with the form's `normalizeAreaRows`). */
const normalizeIaaZones = (rows) => rows.map((row, index) => ({
    ...row,
    item: String(index + 1),
    area: toNumber(row.area),
    volumen: toNumber(row.volumen),
}));
exports.normalizeIaaZones = normalizeIaaZones;
