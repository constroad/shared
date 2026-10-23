import { addExact, roundExact, toCentimos, type ExactSum } from './exactCents';
import { BASE_DAYS, datesOf, isFixedSalary, salaryInForce, settlementPeriodOf, type Salary, type SettlementPeriod } from './salary';

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

export const closeFixedPeriod = ({ salaries, date, absences, advancedCentimos, employedFrom, employedTo }: FixedCloseInput): FixedClose | null => {
  const current = salaryInForce(salaries, date);
  if (!current || !isFixedSalary(current.kind)) return null;
  const { kind } = current;
  const period = settlementPeriodOf(kind, date);
  const employed = (day: string): boolean => day >= period.start && day <= period.end && (!employedFrom || day >= employedFrom) && (!employedTo || day <= employedTo);
  const centsOn = (day: string): number | null => {
    const salary = salaryInForce(salaries, day);
    return salary?.kind === kind ? toCentimos(salary.amount) : null;
  };
  const due: ExactSum = new Map();
  const missing: ExactSum = new Map();
  for (const day of datesOf(period.start, period.end).filter(employed)) addExact(due, centsOn(day) ?? 0, period.days);
  for (const day of new Set(absences)) if (employed(day)) addExact(missing, centsOn(day) ?? 0, BASE_DAYS[kind]);
  const dueCentimos = roundExact(due) - roundExact(missing);
  return { period, dueCentimos, settlementCentimos: dueCentimos - advancedCentimos };
};
