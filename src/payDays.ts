import { addExact, roundExact, toCentimos, type ExactSum } from './exactCents';
import { BASE_DAYS, STANDARD_DAY_MIN, dailyRateOf, isFixedSalary, salaryInForce, settlementPeriodOf, type CentsFraction, type FixedSalaryKind, type Salary } from './salary';

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
 * - Overtime: hour value (daily rate ÷ 8) × 1.25 the first 2 h of the day,
 *   × 1.35 the rest. Rest day worked: × the company’s surcharge, 100 % by
 *   default («recargo por verificar», §6).
 */

export const WEEKLY_REST_POLICIES = ['semana_completa', 'proporcional', 'ninguno'] as const;
export type WeeklyRestPolicy = (typeof WEEKLY_REST_POLICIES)[number];

export interface PayPolicy {
  weeklyRest: WeeklyRestPolicy;
  /** 100 = hour value without surcharge. */
  restDayWorkedPercent: number;
}

export const DEFAULT_PAY_POLICY: PayPolicy = { weeklyRest: 'semana_completa', restDayWorkedPercent: 100 };

export interface PayDay {
  date: string;
  /** Laborable by the schedule. */
  scheduled: boolean;
  worked: boolean;
  /** Paid leave or holiday: not an absence, and it counts for the weekly rest. */
  excused: boolean;
  /** Worked minutes inside the app’s own jornada. */
  regularMin: number;
  /**
   * PAID overtime over the app’s jornada (a rejected one comes as 0). A fixed
   * salary pays it as it comes; by the day or by the hour, regular + overtime
   * are re-split at 8 h.
   */
  overtime25Min: number;
  overtime35Min: number;
  /** Worked on the rest day. */
  restDayMin: number;
  /**
   * Worked its WHOLE scheduled night shift (José, 23/10/2026): a daily wage
   * pays the full jornal even under 8 effective hours. Only night shifts: a
   * short day shift (Saturday) still pays in proportion.
   */
  completedNightShift: boolean;
}

export const PAY_LINE_CONCEPTS = ['dias', 'horas', 'sueldo', 'faltas', 'descanso_semanal', 'extra_25', 'extra_35', 'descanso_trabajado'] as const;
export type PayLineConcept = (typeof PAY_LINE_CONCEPTS)[number];

export interface PayLine {
  concept: PayLineConcept;
  /** Days (`dias`, `sueldo`, `faltas`) or the share of a jornal (`descanso_semanal`). */
  quantity: number | null;
  minutes: number | null;
  /** Negative for `faltas`. */
  centimos: number;
  /** The settlement period of `sueldo` and `faltas`, to close it (`closeFixedPeriod`). */
  period: string | null;
  note: string | null;
}

export interface PayResult {
  mode: 'salary' | 'no_salary';
  lines: PayLine[];
  /** `null` without a salary in force on any day. */
  totalCentimos: number | null;
  /** Laborable days without work nor leave. */
  absences: string[];
  estimated: true;
}

export const REST_DAY_NOTE = 'recargo por verificar';

const PERCENT = 100;
const OVERTIME_PERCENT = { extra_25: 125, extra_35: 135 } as const;
/** The first two hours of overtime of a day go at +25 %. */
const FIRST_OVERTIME_TIER_MIN = 120;
const WEEK_DAYS = 7;
const SHARE_DECIMALS = 10_000;

interface Counted {
  units: number;
  sum: ExactSum;
}

interface Totals {
  days: Counted;
  hours: Counted;
  salary: Map<string, Counted>;
  absences: Map<string, Counted>;
  extra_25: Counted;
  extra_35: Counted;
  descanso_trabajado: Counted;
}

const counted = (): Counted => ({ units: 0, sum: new Map() });
const entry = (map: Map<string, Counted>, key: string): Counted => map.get(key) ?? map.set(key, counted()).get(key)!;

const isAbsence = (day: PayDay): boolean => day.scheduled && !day.worked && !day.excused;

/** Minutes at a percent of the hour value: daily rate × percent × minutes ÷ (8 h × 100). */
const addMinutes = (target: Counted, minutes: number, rate: CentsFraction, percent: number): void => {
  if (minutes <= 0) return;
  target.units += minutes;
  addExact(target.sum, rate.numerator * percent * minutes, rate.denominator * STANDARD_DAY_MIN * PERCENT);
};

/** Each calendar day at salary ÷ the days of its period; an absence, minus salary ÷ the base days. Overtime as it comes. */
const addFixedDay = (totals: Totals, day: PayDay, kind: FixedSalaryKind, cents: number, rate: CentsFraction): void => {
  const period = settlementPeriodOf(kind, day.date);
  const paid = entry(totals.salary, period.key);
  paid.units += 1;
  addExact(paid.sum, cents, period.days);
  addMinutes(totals.extra_25, day.overtime25Min, rate, OVERTIME_PERCENT.extra_25);
  addMinutes(totals.extra_35, day.overtime35Min, rate, OVERTIME_PERCENT.extra_35);
  if (!isAbsence(day)) return;
  const missing = entry(totals.absences, period.key);
  missing.units += 1;
  addExact(missing.sum, cents, BASE_DAYS[kind]);
};

/** By the day or by the hour: 8 h every laborable day; less in proportion, more as overtime (2 h at +25 %, then +35 %). */
const addDayByHours = (totals: Totals, day: PayDay, salary: Salary, rate: CentsFraction): void => {
  if (!day.scheduled) return;
  const paidMin = day.regularMin + day.overtime25Min + day.overtime35Min;
  const baseMin = Math.min(paidMin, STANDARD_DAY_MIN);
  const overtimeMin = paidMin - baseMin;
  if (salary.kind === 'hourly') {
    addMinutes(totals.hours, baseMin, rate, PERCENT);
  } else if (day.worked) {
    // By the day, a completed night shift is a full jornal; by the hour, it pays its hours.
    const dayMin = day.completedNightShift ? STANDARD_DAY_MIN : baseMin;
    totals.days.units += 1;
    addExact(totals.days.sum, rate.numerator * dayMin, rate.denominator * STANDARD_DAY_MIN);
  }
  addMinutes(totals.extra_25, Math.min(overtimeMin, FIRST_OVERTIME_TIER_MIN), rate, OVERTIME_PERCENT.extra_25);
  addMinutes(totals.extra_35, Math.max(0, overtimeMin - FIRST_OVERTIME_TIER_MIN), rate, OVERTIME_PERCENT.extra_35);
};

const accumulate = (days: readonly PayDay[], salaries: readonly Salary[], policy: PayPolicy): Totals => {
  const totals: Totals = { days: counted(), hours: counted(), salary: new Map(), absences: new Map(), extra_25: counted(), extra_35: counted(), descanso_trabajado: counted() };
  for (const day of days) {
    const salary = salaryInForce(salaries, day.date);
    if (!salary) continue;
    const rate = dailyRateOf(salary);
    if (isFixedSalary(salary.kind)) addFixedDay(totals, day, salary.kind, toCentimos(salary.amount), rate);
    else addDayByHours(totals, day, salary, rate);
    addMinutes(totals.descanso_trabajado, day.restDayMin, rate, policy.restDayWorkedPercent);
  }
  return totals;
};

const line = (concept: PayLineConcept, values: Partial<PayLine> & { centimos: number }): PayLine => ({ concept, quantity: null, minutes: null, period: null, note: null, ...values });

/** The weekly rest of a daily or hourly salary: only for a closed week, with the jornal of its last day. */
const weeklyRestLine = (days: readonly PayDay[], salaries: readonly Salary[], policy: WeeklyRestPolicy): PayLine[] => {
  const salary = days.length === WEEK_DAYS ? salaryInForce(salaries, days[WEEK_DAYS - 1].date) : null;
  if (!salary || isFixedSalary(salary.kind) || policy === 'ninguno') return [];
  const laborable = days.filter((day) => day.scheduled);
  const kept = laborable.filter((day) => day.worked || day.excused).length;
  const rate = dailyRateOf(salary);
  if (laborable.length === 0 || (policy === 'semana_completa' && kept < laborable.length) || kept === 0) return [];
  const share = policy === 'semana_completa' ? { kept: 1, of: 1 } : { kept, of: laborable.length };
  const sum: ExactSum = new Map();
  addExact(sum, rate.numerator * share.kept, rate.denominator * share.of);
  return [line('descanso_semanal', { quantity: Math.round((share.kept / share.of) * SHARE_DECIMALS) / SHARE_DECIMALS, centimos: roundExact(sum) })];
};

const periodLines = (concept: 'sueldo' | 'faltas', map: Map<string, Counted>): PayLine[] =>
  [...map].sort(([first], [second]) => first.localeCompare(second)).map(([period, value]) => line(concept, { quantity: value.units, centimos: (concept === 'faltas' ? -1 : 1) * roundExact(value.sum), period }));

const minuteLine = (concept: 'horas' | 'extra_25' | 'extra_35' | 'descanso_trabajado', value: Counted, note: string | null = null): PayLine[] =>
  value.units > 0 ? [line(concept, { minutes: value.units, centimos: roundExact(value.sum), note })] : [];

export const payDays = ({ days, salaries, policy: overrides = {} }: { days: readonly PayDay[]; salaries: readonly Salary[]; policy?: Partial<PayPolicy> }): PayResult => {
  if (!days.some((day) => salaryInForce(salaries, day.date))) return { mode: 'no_salary', lines: [], totalCentimos: null, absences: [], estimated: true };
  const policy = { ...DEFAULT_PAY_POLICY, ...overrides };
  const totals = accumulate(days, salaries, policy);
  const lines: PayLine[] = [
    ...(totals.days.units > 0 ? [line('dias', { quantity: totals.days.units, centimos: roundExact(totals.days.sum) })] : []),
    ...minuteLine('horas', totals.hours),
    ...periodLines('sueldo', totals.salary),
    ...periodLines('faltas', totals.absences),
    ...weeklyRestLine(days, salaries, policy.weeklyRest),
    ...minuteLine('extra_25', totals.extra_25),
    ...minuteLine('extra_35', totals.extra_35),
    ...minuteLine('descanso_trabajado', totals.descanso_trabajado, policy.restDayWorkedPercent === PERCENT ? REST_DAY_NOTE : null),
  ];
  const absences = days.filter((day) => isAbsence(day) && salaryInForce(salaries, day.date)).map((day) => day.date);
  return { mode: 'salary', lines, totalCentimos: lines.reduce((total, current) => total + current.centimos, 0), absences, estimated: true };
};
