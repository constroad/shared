"use strict";
/**
 * Color of each partida on the map.
 *
 * They are HEX on purpose, not brand tokens: MapLibre paints in WebGL and does
 * not resolve `hsl(var(--token))`; above all, **the color here is work data, not
 * branding**. The Civil 3D drawing already uses brown for base and black for
 * asphalt: if the map picked others, the engineer would have to learn a new
 * language to read the same thing. Same criterion as `CONGESTION_COLOR`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.legendForStreets = exports.colorForPartida = exports.NO_PARTIDA_COLOR = void 0;
/** A delimited street that has no partida assigned yet. */
exports.NO_PARTIDA_COLOR = '#94a3b8';
/** Treatments with an established on-site color. Order matters: the first wins. */
const CONVENTIONAL = [
    { match: /imprimacion/, color: '#3b82f6' },
    { match: /fresado/, color: '#6b7280' },
    { match: /(carpeta|asfalt|recapeo)/, color: '#1f2937' },
    { match: /(base|afirmado)/, color: '#a16207' },
    { match: /(sub\s*base|subbase)/, color: '#d97706' },
    { match: /(sardinel|vereda|concreto)/, color: '#0ea5e9' },
];
/** Palette for anything that is not a known treatment. Stable per id. */
const FALLBACK = ['#0d9488', '#7c3aed', '#db2777', '#65a30d', '#ea580c', '#0891b2'];
const normalize = (text) => (text || '')
    .toLocaleLowerCase('es-PE')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
/** Stable hash: the same id always returns the same color. */
const hashOf = (value) => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) % 100000;
    }
    return hash;
};
const colorForPartida = (partidaId, description) => {
    if (!partidaId)
        return exports.NO_PARTIDA_COLOR;
    const text = normalize(description);
    const conventional = CONVENTIONAL.find((entry) => entry.match.test(text));
    if (conventional)
        return conventional.color;
    return FALLBACK[hashOf(partidaId) % FALLBACK.length];
};
exports.colorForPartida = colorForPartida;
/**
 * Map legend: only the partidas someone actually assigned.
 *
 * A budget partida nobody put on any street does NOT go in: in this module
 * "does not apply" and "is at zero" are different things, and listing it would
 * make it look like pending work that was never planned there.
 */
const legendForStreets = (scopes, partidas) => {
    const counts = new Map();
    (scopes ?? []).forEach((scope) => {
        new Set(scope.partidaIds ?? []).forEach((partidaId) => {
            counts.set(partidaId, (counts.get(partidaId) ?? 0) + 1);
        });
    });
    return (partidas ?? [])
        .filter((partida) => counts.has(partida._id))
        .map((partida) => ({
        _id: partida._id,
        description: partida.description || 'Partida',
        color: (0, exports.colorForPartida)(partida._id, partida.description || ''),
        streetCount: counts.get(partida._id) ?? 0,
    }));
};
exports.legendForStreets = legendForStreets;
