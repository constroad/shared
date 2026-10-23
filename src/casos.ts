import type { FixedCloseInput } from './fixedClose';
import type { PayDay, PayLineConcept, PayPolicy } from './payDays';
import type { Salary } from './salary';

/**
 * The golden cases (`casos.json`, shipped in the package): input → expected
 * cents. Each app runs them through ITS adapter (its attendance → `PayDay`):
 * sharing the code does not guarantee the same number if an adapter maps
 * differently; these cases do.
 */

export interface GoldenPayCase {
  id: string;
  description: string;
  fn: 'payDays';
  input: { days: PayDay[]; salaries: Salary[]; policy?: Partial<PayPolicy> };
  expected: { totalCentimos: number; lines: { concept: PayLineConcept; centimos: number; period: string | null }[] };
}

export interface GoldenCloseCase {
  id: string;
  description: string;
  fn: 'closeFixedPeriod';
  input: FixedCloseInput;
  expected: { dueCentimos: number; periodDays?: number };
}

export type GoldenCase = GoldenPayCase | GoldenCloseCase;

export interface GoldenCases {
  version: number;
  description: string;
  cases: GoldenCase[];
}
