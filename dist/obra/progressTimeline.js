"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressDays = void 0;
const progressDays = (events) => {
    const dates = new Set();
    (events ?? [])
        .filter((event) => event.status === 'approved')
        .forEach((event) => {
        if (event.date)
            dates.add(event.date);
    });
    // Sort by STRING: comparing ISO date-only values is safe and avoids the
    // one-day shift that building a `Date` causes (portal-pitfalls §1).
    return Array.from(dates)
        .sort((left, right) => left.localeCompare(right))
        .map((date, index) => ({ date, dayNumber: index + 1 }));
};
exports.progressDays = progressDays;
