import { type Salary } from './salary';
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
export declare const WEEKLY_REST_POLICIES: readonly ["semana_completa", "proporcional", "ninguno"];
export type WeeklyRestPolicy = (typeof WEEKLY_REST_POLICIES)[number];
export interface PayPolicy {
    weeklyRest: WeeklyRestPolicy;
    /** 100 = hour value without surcharge. */
    restDayWorkedPercent: number;
}
export declare const DEFAULT_PAY_POLICY: PayPolicy;
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
export declare const PAY_LINE_CONCEPTS: readonly ["dias", "horas", "sueldo", "faltas", "descanso_semanal", "extra_25", "extra_35", "descanso_trabajado"];
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
export declare const REST_DAY_NOTE = "recargo por verificar";
export interface PayInput {
    days: readonly PayDay[];
    salaries: readonly Salary[];
    policy?: Partial<PayPolicy>;
    /** Today, for a week still running: later days are left out and today is not an absence yet. Without it, every day is over. */
    asOf?: string;
}
export declare const payDays: ({ days: allDays, salaries, policy: overrides, asOf }: PayInput) => PayResult;
