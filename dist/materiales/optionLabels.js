"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniqueOptionLabels = uniqueOptionLabels;
exports.materialOptionLabels = materialOptionLabels;
/**
 * Labels for a list of options, adding the hint only where a name REPEATS.
 *
 * Two things can share a name, and it bites: on 23/10/2026 `test` had two
 * «Filler mineral», one of 4,000 kg and one of 580 TM. Two options that read the
 * same make somebody pick the wrong one. A name that does not repeat is left
 * alone: a hint on every option would be noise.
 */
function uniqueOptionLabels(rows) {
    const seen = rows.reduce((count, row) => ({ ...count, [row.name]: (count[row.name] ?? 0) + 1 }), {});
    return rows.map((row) => (seen[row.name] > 1 && row.hint?.trim() ? `${row.name} (${row.hint.trim()})` : row.name));
}
/** The material rows' labels: the unit is what tells two of the same name apart. */
function materialOptionLabels(rows) {
    return uniqueOptionLabels(rows.map((row) => ({ name: row.name, hint: row.unit })));
}
