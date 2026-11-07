"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.datesOf = exports.settlementPeriodOf = exports.dailyRateOf = exports.salaryInForce = exports.isFixedSalary = exports.STANDARD_DAY_MIN = exports.BASE_DAYS = exports.SALARY_KINDS = void 0;
const dates_1 = require("./dates");
const exactCents_1 = require("./exactCents");
/**
 * Salary kinds (SPEC.md §3–4). PURE. The same values Portal uses
 * (`SalaryPeriod`). A salary is a HISTORY by date: each day is paid with the
 * one in force that day.
 */
exports.SALARY_KINDS = ['daily', 'hourly', 'weekly', 'biweekly', 'monthly'];
/** The «treintavo»: the days a fixed salary is divided by for its daily rate and its absences. */
exports.BASE_DAYS = { weekly: 7, biweekly: 15, monthly: 30 };
/** The jornada every kind pays against: the hour value is the daily rate ÷ 8 h (José, 23/10/2026). */
exports.STANDARD_DAY_MIN = 8 * 60;
const HOURS_PER_DAY = exports.STANDARD_DAY_MIN / 60;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FIRST_HALF_LAST_DAY = 15;
const isFixedSalary = (kind) => kind === 'weekly' || kind === 'biweekly' || kind === 'monthly';
exports.isFixedSalary = isFixedSalary;
/** The one with the latest `from` not past the date; with two of the same day, the last loaded (a correction). */
const salaryInForce = (salaries, date) => {
    if (!ISO_DATE.test(date))
        return null;
    return salaries.reduce((current, salary) => (salary.from > date ? current : !current || salary.from >= current.from ? salary : current), null);
};
exports.salaryInForce = salaryInForce;
const dailyRateOf = (salary) => {
    const cents = (0, exactCents_1.toCentimos)(salary.amount);
    if ((0, exports.isFixedSalary)(salary.kind))
        return { numerator: cents, denominator: exports.BASE_DAYS[salary.kind] };
    return { numerator: salary.kind === 'hourly' ? cents * HOURS_PER_DAY : cents, denominator: 1 };
};
exports.dailyRateOf = dailyRateOf;
const daysInMonth = (date) => new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).getUTCDate();
const settlementPeriodOf = (kind, date) => {
    const month = date.slice(0, 7);
    const lastDay = daysInMonth(date);
    if (kind === 'weekly') {
        const start = (0, dates_1.mondayOf)(date);
        return { key: start, start, end: (0, dates_1.addDaysIso)(start, 6), days: 7 };
    }
    if (kind === 'monthly')
        return { key: month, start: `${month}-01`, end: `${month}-${lastDay}`, days: lastDay };
    return Number(date.slice(8, 10)) <= FIRST_HALF_LAST_DAY
        ? { key: `${month}-Q1`, start: `${month}-01`, end: `${month}-${FIRST_HALF_LAST_DAY}`, days: FIRST_HALF_LAST_DAY }
        : { key: `${month}-Q2`, start: `${month}-${FIRST_HALF_LAST_DAY + 1}`, end: `${month}-${lastDay}`, days: lastDay - FIRST_HALF_LAST_DAY };
};
exports.settlementPeriodOf = settlementPeriodOf;
/** Every date from `start` to `end`, both included. */
const datesOf = (start, end) => {
    const dates = [];
    for (let date = start; date <= end; date = (0, dates_1.addDaysIso)(date, 1))
        dates.push(date);
    return dates;
};
exports.datesOf = datesOf;
