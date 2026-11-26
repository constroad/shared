/**
 * Labels for a list of options, adding the hint only where a name REPEATS.
 *
 * Two things can share a name, and it bites: on 23/10/2026 `test` had two
 * «Filler mineral», one of 4,000 kg and one of 580 TM. Two options that read the
 * same make somebody pick the wrong one. A name that does not repeat is left
 * alone: a hint on every option would be noise.
 */
export declare function uniqueOptionLabels(rows: Array<{
    name: string;
    hint?: string;
}>): string[];
/** The material rows' labels: the unit is what tells two of the same name apart. */
export declare function materialOptionLabels(rows: Array<{
    name: string;
    unit: string;
}>): string[];
