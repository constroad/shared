"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_RECEPTION_PHOTOS = exports.MIN_RECEPTION_PHOTOS = exports.MAX_RECEPTION_M3 = void 0;
exports.receptionFromPicks = receptionFromPicks;
exports.validateReceptionFields = validateReceptionFields;
const inputArrivalDate_1 = require("../kardex/inputArrivalDate");
/**
 * A material reception (an `Input` in `Pending`) built from what a person
 * picked from lists, and the rules that decide whether it is complete. Portal's
 * zod schema and Inframaq's model must agree on both, so they live here.
 */
/** One reception is one truck: beyond this many cubic metres it is a typo, not a load. */
exports.MAX_RECEPTION_M3 = 500;
/** The evidence of a reception: at least one photo of the load, at most six. */
exports.MIN_RECEPTION_PHOTOS = 1;
exports.MAX_RECEPTION_PHOTOS = 6;
/** The reception as the form would persist it: the material's name plus its description, and the quarry copied where the notice reads it. */
function receptionFromPicks(picks, now = new Date()) {
    const name = String(picks.material.name ?? '').trim();
    const description = String(picks.material.description ?? '').trim();
    return {
        _id: picks.inputId,
        materialId: picks.material.id,
        material: [name, description].filter(Boolean).join(' '),
        materialName: name,
        // Level 0 (sand) is a level: `|| undefined` dropped it and the «in transit» list never showed it.
        level: typeof picks.material.level === 'number' ? picks.material.level : undefined,
        driver: picks.driver,
        m3: picks.m3,
        // The picked day keeps the Lima time of day of `now`, as the form's date picker builds it.
        arriveDate: (0, inputArrivalDate_1.buildInputArrivalISOString)(picks.day, now),
        providerId: picks.carrier.id,
        providerName: picks.carrier.name,
        vendorProviderId: picks.quarry.id,
        vendorProviderName: picks.quarry.name,
        chancadora: picks.quarry.name,
        ...(picks.locationId ? { locationId: picks.locationId } : {}),
        ...(picks.notes ? { notes: picks.notes } : {}),
        unit: String(picks.material.unit ?? '').trim() || 'm³',
    };
}
const MEASURED_STATES = ['banco', 'suelto'];
const REQUIRED_TEXT = ['driver', 'providerId', 'providerName', 'arriveDate'];
const ANY_TEXT = ['materialId', 'material'];
const OPTIONAL_NUMBERS = ['m3', 'level'];
const isNonEmptyText = (value) => typeof value === 'string' && value.length > 0;
const isNumber = (value) => typeof value === 'number' && !Number.isNaN(value);
const isPercentage = (value) => isNumber(value) && value >= 0 && value <= 100;
/** The keys of `keys` whose value fails `isValid`. */
const failing = (reception, keys, isValid) => keys.filter((key) => !isValid(reception[key]));
/** An optional field may be absent, but a present one must pass. */
const optional = (isValid) => (value) => value === undefined || isValid(value);
/** The fields a reception cannot be saved without (the form's schema), by path. */
function validateReceptionFields(reception) {
    const invalidPaths = [
        ...failing(reception, REQUIRED_TEXT, isNonEmptyText),
        ...failing(reception, ANY_TEXT, (value) => typeof value === 'string'),
        ...failing(reception, OPTIONAL_NUMBERS, optional(isNumber)),
        ...failing(reception, ['esponjamientoPct'], optional(isPercentage)),
        ...failing(reception, ['measuredState'], optional((value) => MEASURED_STATES.includes(String(value)))),
    ];
    return invalidPaths.length > 0 ? { ok: false, invalidPaths } : { ok: true };
}
