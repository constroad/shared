"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PICK_SWITCH_M = void 0;
exports.pickStreet = pickStreet;
exports.tapOnPick = tapOnPick;
exports.pickedRange = pickedRange;
exports.pickedLine = pickedLine;
const streetGeometry_1 = require("./streetGeometry");
/** Farther than this from the picked axis, a tap means another street (half a block). */
exports.PICK_SWITCH_M = 30;
function pickStreet(street) {
    return street.line.length >= 2 ? { name: street.name, axis: street.line, fromM: null, toM: null } : null;
}
/** A tap on the picked street marks the start, then the end; a third starts again. Off it: another street. */
function tapOnPick(pick, tap) {
    const projected = (0, streetGeometry_1.projectToLine)(pick.axis, tap);
    if (!projected || projected.distanceM > exports.PICK_SWITCH_M)
        return { kind: 'other_street' };
    const at = Math.round(projected.measureM);
    if (pick.fromM === null || pick.toM !== null)
        return { kind: 'marked', pick: { ...pick, fromM: at, toM: null } };
    return { kind: 'marked', pick: { ...pick, fromM: Math.min(pick.fromM, at), toM: Math.max(pick.fromM, at) } };
}
/** What is marked, in meters along the street, and what the next tap does. Unmarked = the whole street. */
function pickedRange(pick) {
    const total = Math.round((0, streetGeometry_1.lengthOfLine)(pick.axis));
    if (pick.fromM === null)
        return { fromM: 0, toM: total, step: 'start' };
    if (pick.toM === null)
        return { fromM: pick.fromM, toM: total, step: 'end' };
    return { fromM: pick.fromM, toM: pick.toM, step: 'done' };
}
/** The line that is saved: the stretch between the two taps, or the whole street. */
function pickedLine(pick) {
    const { fromM, toM, step } = pickedRange(pick);
    return step === 'done' ? (0, streetGeometry_1.sliceLine)(pick.axis, fromM, toM) : pick.axis;
}
