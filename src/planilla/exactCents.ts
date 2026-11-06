/**
 * Exact sums in whole cents. Each pay line adds exact fractions grouped by
 * denominator and rounds once per group, half a cent up: no floats, and a
 * full period of a fixed salary (one denominator) adds up with no residue.
 */

const CENTS_PER_SOL = 100;

export const toCentimos = (amount: number): number => Math.round(amount * CENTS_PER_SOL);

/** n ÷ d rounded to the integer, half up; exact for non-negative integers (no float division). */
export const divideRounded = (numerator: number, denominator: number): number => {
  const twice = 2 * numerator + denominator;
  const base = 2 * denominator;
  return (twice - (twice % base)) / base;
};

/** Denominator → numerator. */
export type ExactSum = Map<number, number>;

export const addExact = (sum: ExactSum, numerator: number, denominator: number): void => {
  if (numerator <= 0) return;
  sum.set(denominator, (sum.get(denominator) ?? 0) + numerator);
};

export const roundExact = (sum: ExactSum): number => [...sum].reduce((total, [denominator, numerator]) => total + divideRounded(numerator, denominator), 0);
