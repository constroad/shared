import { type Salary, type SettlementPeriod } from './salary';
/**
 * The close of a fixed salary’s period (SPEC.md §4). PURE.
 * What is due = each employed day at salary ÷ the days of the period − the
 * absences at the treintavo; the settlement = due − what the weekly payments
 * already advanced for THIS period (`sueldo` + `faltas` with its `period`).
 * A full period pays exactly the salary: the advances only leave rounding.
 */
export interface FixedCloseInput {
    salaries: readonly Salary[];
    /** Any date inside the period; the kind in force that day decides it. */
    date: string;
    absences: readonly string[];
    advancedCentimos: number;
    /** Hired or left inside the period: only the employed days count. */
    employedFrom?: string;
    employedTo?: string;
}
export interface FixedClose {
    period: SettlementPeriod;
    dueCentimos: number;
    settlementCentimos: number;
}
export declare const closeFixedPeriod: ({ salaries, date, absences, advancedCentimos, employedFrom, employedTo }: FixedCloseInput) => FixedClose | null;
