"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumePeriodLabel = exports.consumePeriodTime = void 0;
const tankMovementDates_1 = require("./tankMovementDates");
/**
 * Portal filters consumes by the measured period (`periodEnd`, `createdAt` for
 * legacy ones without it). The list shows and sorts by that same date, so a
 * July consume registered today reads as July (31/10/2026).
 */
const periodEndOf = (consume) => consume.periodEnd ?? consume.createdAt ?? consume.date;
const consumePeriodTime = (consume) => new Date(periodEndOf(consume)).getTime();
exports.consumePeriodTime = consumePeriodTime;
const consumePeriodLabel = (consume) => {
    const end = (0, tankMovementDates_1.formatPeruDate)(periodEndOf(consume));
    if (!consume.periodStart || !consume.periodEnd)
        return end;
    const start = (0, tankMovementDates_1.formatPeruDate)(consume.periodStart);
    return start === end ? end : `${start} – ${end}`;
};
exports.consumePeriodLabel = consumePeriodLabel;
