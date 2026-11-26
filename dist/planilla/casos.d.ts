import type { FixedCloseInput } from './fixedClose';
import type { PayDay, PayLineConcept, PayPolicy } from './payDays';
import type { Salary } from './salary';
/**
 * The golden cases (`casos.json`, shipped in the package): input → expected
 * cents. Each app runs them through ITS adapter (its attendance → `PayDay`):
 * sharing the code does not guarantee the same number if an adapter maps
 * differently; these cases do.
 */
/** A shift as it happened, in Lima time (`YYYY-MM-DDTHH:mm`); a shift that crosses midnight belongs to the day it STARTED. */
export interface GoldenShift {
    start: string;
    end: string;
    breakMin: number;
}
/**
 * The attendance behind a case, for an app to test ITS adapter: from these
 * shifts it must build the case’s `PayDay`s. `jornadaMin` is the app’s own
 * jornada that day (it splits regular from overtime before the package).
 */
export interface GoldenAttendance {
    days: {
        date: string;
        jornadaMin: number;
        shifts: GoldenShift[];
    }[];
}
export interface GoldenPayCase {
    id: string;
    description: string;
    fn: 'payDays';
    input: {
        days: PayDay[];
        salaries: Salary[];
        policy?: Partial<PayPolicy>;
        asOf?: string;
    };
    attendance?: GoldenAttendance;
    expected: {
        totalCentimos: number;
        lines: {
            concept: PayLineConcept;
            centimos: number;
            period: string | null;
        }[];
    };
}
export interface GoldenCloseCase {
    id: string;
    description: string;
    fn: 'closeFixedPeriod';
    input: FixedCloseInput;
    expected: {
        dueCentimos: number;
        periodDays?: number;
    };
}
export type GoldenCase = GoldenPayCase | GoldenCloseCase;
export interface GoldenCases {
    version: number;
    description: string;
    /** Decisions still open: no case fixes them yet (SPEC.md §8). */
    pending: string[];
    cases: GoldenCase[];
}
