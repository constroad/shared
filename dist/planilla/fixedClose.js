"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeFixedPeriod = void 0;
const exactCents_1 = require("./exactCents");
const salary_1 = require("./salary");
const closeFixedPeriod = ({ salaries, date, absences, advancedCentimos, employedFrom, employedTo }) => {
    const current = (0, salary_1.salaryInForce)(salaries, date);
    if (!current || !(0, salary_1.isFixedSalary)(current.kind))
        return null;
    const { kind } = current;
    const period = (0, salary_1.settlementPeriodOf)(kind, date);
    const employed = (day) => day >= period.start && day <= period.end && (!employedFrom || day >= employedFrom) && (!employedTo || day <= employedTo);
    const centsOn = (day) => {
        const salary = (0, salary_1.salaryInForce)(salaries, day);
        return salary?.kind === kind ? (0, exactCents_1.toCentimos)(salary.amount) : null;
    };
    const due = new Map();
    const missing = new Map();
    for (const day of (0, salary_1.datesOf)(period.start, period.end).filter(employed))
        (0, exactCents_1.addExact)(due, centsOn(day) ?? 0, period.days);
    for (const day of new Set(absences))
        if (employed(day))
            (0, exactCents_1.addExact)(missing, centsOn(day) ?? 0, salary_1.BASE_DAYS[kind]);
    const dueCentimos = (0, exactCents_1.roundExact)(due) - (0, exactCents_1.roundExact)(missing);
    return { period, dueCentimos, settlementCentimos: dueCentimos - advancedCentimos };
};
exports.closeFixedPeriod = closeFixedPeriod;
