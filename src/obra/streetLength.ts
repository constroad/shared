/**
 * Two lengths per street, and which one wins.
 *
 * `lengthM` is the TRACE length: the server computes it with `lengthOfLine` and
 * it never comes from the client. `measuredLengthM` is what the engineer
 * measured on site. When it is loaded, **the measured one wins** for the whole
 * metrado.
 *
 * WHY BOTH ARE NEEDED (José, 29/08/2026). The trace comes from the base map or
 * the GPS and gets it wrong: it says 212 m where the block measures 198. Until
 * now the length was read-only, so that 7 % error went straight into the
 * drawing's m² with no way to correct it. Overwriting `lengthM` did not work
 * —the trace must be kept to DRAW, and the server recomputes it on every
 * geometry change—, so the measured length lives in its own field.
 *
 * ## Scopes are measured in REAL metres
 *
 * `fromM`/`toM` are on the effective scale, the one the person typing them
 * thinks in: if the street measures 198, a «0 – 198» scope is the whole street.
 * To draw them they must be converted to trace metres (`toTraceRange`), and that
 * conversion is the ONLY place where the factor appears.
 *
 * And when the measured length changes, existing scopes are rescaled: if a
 * scope covered the whole street at 212, it must still cover it at 198.
 * Otherwise they would point outside the street.
 */

const round2 = (value: number): number => Math.round(value * 100) / 100;

export interface StreetLengths {
  /** Trace length, computed on the server. */
  lengthM: number;
  /** Length measured on site. It overrides the trace's for the metrado. */
  measuredLengthM?: number;
}

/** The length that wins: the measured one if present, the trace's otherwise. */
export const effectiveLengthM = (street: StreetLengths): number =>
  street.measuredLengthM && street.measuredLengthM > 0
    ? street.measuredLengthM
    : street.lengthM;

/** Whether the shown length is NOT the trace's: the UI flags it so it is noticed. */
export const isMeasured = (street: StreetLengths): boolean =>
  Boolean(street.measuredLengthM && street.measuredLengthM > 0);

/**
 * A scope's range, converted to TRACE metres so it can be sliced.
 *
 * Without this, a «0 – 198» scope on a 212 trace would draw 93 % of the street
 * and the last block would be left unpainted.
 */
export const toTraceRange = (params: {
  fromM: number;
  toM: number;
  effectiveM: number;
  traceM: number;
}): { fromM: number; toM: number } => {
  const { fromM, toM, effectiveM, traceM } = params;
  // Without a measured length —or with absurd data— there is nothing to convert.
  if (!effectiveM || !traceM || effectiveM === traceM) return { fromM, toM };
  const factor = traceM / effectiveM;
  return { fromM: fromM * factor, toM: toM * factor };
};

/**
 * The scopes, carried from one length to another.
 *
 * Proportional, not a trim: trimming would leave the last scope short and the
 * rest intact, i.e. it would put all the error into a single block. The one
 * that covered half the street still covers half.
 *
 * It returns ONLY those that change: the section sends one PUT per scope, and
 * sending the unchanged ones would be pointless writes.
 */
export const rescaleScopes = <T extends { _id: string; fromM: number; toM: number }>(params: {
  scopes: T[];
  fromLengthM: number;
  toLengthM: number;
}): Array<{ _id: string; fromM: number; toM: number }> => {
  const { scopes, fromLengthM, toLengthM } = params;
  if (!fromLengthM || !toLengthM || fromLengthM === toLengthM) return [];

  const factor = toLengthM / fromLengthM;
  return scopes
    .map((scope) => ({
      _id: scope._id,
      fromM: round2(scope.fromM * factor),
      toM: round2(scope.toM * factor),
    }))
    .filter((next, index) => {
      const previous = scopes[index];
      return next.fromM !== previous.fromM || next.toM !== previous.toM;
    });
};
