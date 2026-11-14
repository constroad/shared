/**
 * Exact sums in whole cents. Each pay line adds exact fractions grouped by
 * denominator and rounds once per group, half a cent up: no floats, and a
 * full period of a fixed salary (one denominator) adds up with no residue.
 */
export declare const toCentimos: (amount: number) => number;
/** n ÷ d rounded to the integer, half up; exact for non-negative integers (no float division). */
export declare const divideRounded: (numerator: number, denominator: number) => number;
/** Denominator → numerator. */
export type ExactSum = Map<number, number>;
export declare const addExact: (sum: ExactSum, numerator: number, denominator: number) => void;
export declare const roundExact: (sum: ExactSum) => number;
