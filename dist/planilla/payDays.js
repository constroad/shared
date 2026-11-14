"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payDays = exports.REST_DAY_NOTE = exports.PAY_LINE_CONCEPTS = exports.DEFAULT_PAY_POLICY = exports.WEEKLY_REST_POLICIES = void 0;
const exactCents_1 = require("./exactCents");
const salary_1 = require("./salary");
/**
 * The CANONICAL pay of a range of days (SPEC.md). PURE, in whole cents.
 * Pulso, Portal and Inframaq pass their days as `PayDay`; how the hours were
 * counted is each app’s adapter.
 *
 * - Base: by the day or by the hour, 8 h every laborable day, Saturday too
 *   (José): less is paid in proportion, more is overtime. A completed night
 *   shift pays the full jornal (§3.3). Fixed salary = each
 *   calendar day at salary ÷ the days of ITS period, minus absences at the
 *   treintavo (§4); its overtime comes in the `PayDay`.
 * - Weekly rest (daily and hourly only, closed week of 7 days): the company’s
 *   policy (§5). A fixed salary already pays it.
 * - `asOf` (today, for a week still running): later days count for nothing,
 *   and today without work is not an absence yet (§5-bis).
 * - Overtime: hour value (daily rate ÷ 8) × 1.25 the first 2 h of the day,
 *   × 1.35 the rest. Rest day worked: × the company’s surcharge, 100 % by
 *   default («recargo por verificar», §6).
 */
exports.WEEKLY_REST_POLICIES = ['semana_completa', 'proporcional', 'ninguno'];
exports.DEFAULT_PAY_POLICY = { weeklyRest: 'semana_completa', restDayWorkedPercent: 100 };
exports.PAY_LINE_CONCEPTS = ['dias', 'horas', 'sueldo', 'faltas', 'descanso_semanal', 'extra_25', 'extra_35', 'descanso_trabajado'];
exports.REST_DAY_NOTE = 'recargo por verificar';
const PERCENT = 100;
const OVERTIME_PERCENT = { extra_25: 125, extra_35: 135 };
/** The first two hours of overtime of a day go at +25 %. */
const FIRST_OVERTIME_TIER_MIN = 120;
const WEEK_DAYS = 7;
const SHARE_DECIMALS = 10000;
const counted = () => ({ units: 0, sum: new Map() });
const entry = (map, key) => map.get(key) ?? map.set(key, counted()).get(key);
/** Without work nor leave; with `asOf`, only a day already over (today is still running). */
const isAbsence = (day, asOf) => day.scheduled && !day.worked && !day.excused && (!asOf || day.date < asOf);
/** Minutes at a percent of the hour value: daily rate × percent × minutes ÷ (8 h × 100). */
const addMinutes = (target, minutes, rate, percent) => {
    if (minutes <= 0)
        return;
    target.units += minutes;
    (0, exactCents_1.addExact)(target.sum, rate.numerator * percent * minutes, rate.denominator * salary_1.STANDARD_DAY_MIN * PERCENT);
};
/** Each calendar day at salary ÷ the days of its period; an absence, minus salary ÷ the base days. Overtime as it comes. */
const addFixedDay = (totals, day, kind, cents, rate, asOf) => {
    const period = (0, salary_1.settlementPeriodOf)(kind, day.date);
    const paid = entry(totals.salary, period.key);
    paid.units += 1;
    (0, exactCents_1.addExact)(paid.sum, cents, period.days);
    addMinutes(totals.extra_25, day.overtime25Min, rate, OVERTIME_PERCENT.extra_25);
    addMinutes(totals.extra_35, day.overtime35Min, rate, OVERTIME_PERCENT.extra_35);
    if (!isAbsence(day, asOf))
        return;
    const missing = entry(totals.absences, period.key);
    missing.units += 1;
    (0, exactCents_1.addExact)(missing.sum, cents, salary_1.BASE_DAYS[kind]);
};
/** By the day or by the hour: 8 h every laborable day; less in proportion, more as overtime (2 h at +25 %, then +35 %). */
const addDayByHours = (totals, day, salary, rate) => {
    if (!day.scheduled)
        return;
    const paidMin = day.regularMin + day.overtime25Min + day.overtime35Min;
    const baseMin = Math.min(paidMin, salary_1.STANDARD_DAY_MIN);
    const overtimeMin = paidMin - baseMin;
    if (salary.kind === 'hourly') {
        addMinutes(totals.hours, baseMin, rate, PERCENT);
    }
    else if (day.worked) {
        // By the day, a completed night shift is a full jornal; by the hour, it pays its hours.
        const dayMin = day.completedNightShift ? salary_1.STANDARD_DAY_MIN : baseMin;
        totals.days.units += 1;
        (0, exactCents_1.addExact)(totals.days.sum, rate.numerator * dayMin, rate.denominator * salary_1.STANDARD_DAY_MIN);
    }
    addMinutes(totals.extra_25, Math.min(overtimeMin, FIRST_OVERTIME_TIER_MIN), rate, OVERTIME_PERCENT.extra_25);
    addMinutes(totals.extra_35, Math.max(0, overtimeMin - FIRST_OVERTIME_TIER_MIN), rate, OVERTIME_PERCENT.extra_35);
};
const accumulate = (days, salaries, policy, asOf) => {
    const totals = { days: counted(), hours: counted(), salary: new Map(), absences: new Map(), extra_25: counted(), extra_35: counted(), descanso_trabajado: counted() };
    for (const day of days) {
        const salary = (0, salary_1.salaryInForce)(salaries, day.date);
        if (!salary)
            continue;
        const rate = (0, salary_1.dailyRateOf)(salary);
        if ((0, salary_1.isFixedSalary)(salary.kind))
            addFixedDay(totals, day, salary.kind, (0, exactCents_1.toCentimos)(salary.amount), rate, asOf);
        else
            addDayByHours(totals, day, salary, rate);
        addMinutes(totals.descanso_trabajado, day.restDayMin, rate, policy.restDayWorkedPercent);
    }
    return totals;
};
const line = (concept, values) => ({ concept, quantity: null, minutes: null, period: null, note: null, ...values });
/** The weekly rest of a daily or hourly salary: only for a closed week, with the jornal of its last day. */
const weeklyRestLine = (days, salaries, policy) => {
    const salary = days.length === WEEK_DAYS ? (0, salary_1.salaryInForce)(salaries, days[WEEK_DAYS - 1].date) : null;
    if (!salary || (0, salary_1.isFixedSalary)(salary.kind) || policy === 'ninguno')
        return [];
    const laborable = days.filter((day) => day.scheduled);
    const kept = laborable.filter((day) => day.worked || day.excused).length;
    const rate = (0, salary_1.dailyRateOf)(salary);
    if (laborable.length === 0 || (policy === 'semana_completa' && kept < laborable.length) || kept === 0)
        return [];
    const share = policy === 'semana_completa' ? { kept: 1, of: 1 } : { kept, of: laborable.length };
    const sum = new Map();
    (0, exactCents_1.addExact)(sum, rate.numerator * share.kept, rate.denominator * share.of);
    return [line('descanso_semanal', { quantity: Math.round((share.kept / share.of) * SHARE_DECIMALS) / SHARE_DECIMALS, centimos: (0, exactCents_1.roundExact)(sum) })];
};
const periodLines = (concept, map) => [...map].sort(([first], [second]) => first.localeCompare(second)).map(([period, value]) => line(concept, { quantity: value.units, centimos: (concept === 'faltas' ? -1 : 1) * (0, exactCents_1.roundExact)(value.sum), period }));
const minuteLine = (concept, value, note = null) => value.units > 0 ? [line(concept, { minutes: value.units, centimos: (0, exactCents_1.roundExact)(value.sum), note })] : [];
const payDays = ({ days: allDays, salaries, policy: overrides = {}, asOf }) => {
    const days = asOf ? allDays.filter((day) => day.date <= asOf) : allDays;
    if (!days.some((day) => (0, salary_1.salaryInForce)(salaries, day.date)))
        return { mode: 'no_salary', lines: [], totalCentimos: null, absences: [], estimated: true };
    const policy = { ...exports.DEFAULT_PAY_POLICY, ...overrides };
    const totals = accumulate(days, salaries, policy, asOf);
    const lines = [
        ...(totals.days.units > 0 ? [line('dias', { quantity: totals.days.units, centimos: (0, exactCents_1.roundExact)(totals.days.sum) })] : []),
        ...minuteLine('horas', totals.hours),
        ...periodLines('sueldo', totals.salary),
        ...periodLines('faltas', totals.absences),
        ...weeklyRestLine(days, salaries, policy.weeklyRest),
        ...minuteLine('extra_25', totals.extra_25),
        ...minuteLine('extra_35', totals.extra_35),
        ...minuteLine('descanso_trabajado', totals.descanso_trabajado, policy.restDayWorkedPercent === PERCENT ? exports.REST_DAY_NOTE : null),
    ];
    const absences = days.filter((day) => isAbsence(day, asOf) && (0, salary_1.salaryInForce)(salaries, day.date)).map((day) => day.date);
    return { mode: 'salary', lines, totalCentimos: lines.reduce((total, current) => total + current.centimos, 0), absences, estimated: true };
};
exports.payDays = payDays;
