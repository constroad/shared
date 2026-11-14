"use strict";
/**
 * Exact sums in whole cents. Each pay line adds exact fractions grouped by
 * denominator and rounds once per group, half a cent up: no floats, and a
 * full period of a fixed salary (one denominator) adds up with no residue.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.roundExact = exports.addExact = exports.divideRounded = exports.toCentimos = void 0;
const CENTS_PER_SOL = 100;
const toCentimos = (amount) => Math.round(amount * CENTS_PER_SOL);
exports.toCentimos = toCentimos;
/** n ÷ d rounded to the integer, half up; exact for non-negative integers (no float division). */
const divideRounded = (numerator, denominator) => {
    const twice = 2 * numerator + denominator;
    const base = 2 * denominator;
    return (twice - (twice % base)) / base;
};
exports.divideRounded = divideRounded;
const addExact = (sum, numerator, denominator) => {
    if (numerator <= 0)
        return;
    sum.set(denominator, (sum.get(denominator) ?? 0) + numerator);
};
exports.addExact = addExact;
const roundExact = (sum) => [...sum].reduce((total, [denominator, numerator]) => total + (0, exports.divideRounded)(numerator, denominator), 0);
exports.roundExact = roundExact;
