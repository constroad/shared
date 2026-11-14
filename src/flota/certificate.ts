import { measureFieldsOf, measuresOf, type CubicageMeasures, type TruckShape } from './cubicage';
import { dispatchReference, type DispatchCm } from './dispatchHeights';
import { SHAPE_LABEL } from './shape';

/**
 * The cubicage certificate (Stitch `p02`, José 13/11/2026), the same in Portal and Inframaq. The
 * parts of the volume are the page's own formula split in three, and the dispatch table asks
 * `dispatchHeight` for whole m³ below the volume. The logo is the one of the company that issues
 * the page (José, 14/11/2026: the one that dispatches); when another company measured the truck,
 * `measuredBy` says which and when.
 */

export interface CubicageCertificateMeasure {
  code: string;
  label: string;
  meters: number;
  /** How a measure nobody types is deduced, e.g. «A3 − A5». Absent when it was measured. */
  formula?: string;
}

export interface CubicageCertificatePart {
  label: string;
  formula: string;
  m3: number;
}

export interface CubicageCertificateIssuer {
  name: string;
  address: string;
  logoUrl: string;
  /** RUC, printed under the name when the company has it. */
  taxId?: string;
  /** The company's brand color (its own data, e.g. `#0f766e`): the accent of the sheet. */
  accent?: string;
}

export interface CubicageCertificateView {
  number: string;
  plate: string;
  shape: TruckShape;
  shapeLabel: string;
  cubicator: string;
  measuredAt: string;
  previous?: { m3: number; at?: string };
  issuer: CubicageCertificateIssuer;
  /** Another company measured the truck: its frozen name. */
  measuredBy?: { companyName: string };
  /** Absolute: the print sheet loads without a base address, so a relative image breaks. */
  figureUrl: string;
  measures: CubicageCertificateMeasure[];
  /** The measures that count for the shape, for drawing the hopper with its dimensions. */
  figure: CubicageMeasures;
  parts: CubicageCertificatePart[];
  m3: number;
  dispatch: DispatchCm[];
}

export interface CubicageCertificateInput {
  number: string;
  plate: string;
  shape: TruckShape;
  cubicator: string;
  measuredAt: Date | string;
  m3: number;
  measures: CubicageMeasures;
  previous?: { m3?: number; at?: Date | string };
}

export interface CubicageCertificateOptions {
  issuer: CubicageCertificateIssuer;
  /** Where the issuing app serves its drawings, e.g. `https://inframaq.constroad.com`. */
  origin: string;
  measuredBy?: { companyName: string };
}

const CM_PER_M = 100;

const meters = (measures: CubicageMeasures, key: keyof CubicageMeasures): number => Number(measures[key] ?? 0);
const fixed = (value: number): string => value.toFixed(2);
const round2 = (value: number): number => Math.round(value * CM_PER_M) / CM_PER_M;

const concaveParts = (measures: CubicageMeasures): CubicageCertificatePart[] => {
  const [a1, a2, a5, a4, b2, b1] = (['totalWidth', 'totalLength', 'squareHeight', 'concaveHight', 'centralConcaveWidth', 'leftConcaveWidth'] as const).map((key) => meters(measures, key));
  return [
    { label: 'Parte recta', formula: `A1 × A2 × A5 = ${fixed(a1)} × ${fixed(a2)} × ${fixed(a5)}`, m3: round2(a1 * a2 * a5) },
    { label: 'Fondo plano', formula: `A4 × B2 × A2 = ${fixed(a4)} × ${fixed(b2)} × ${fixed(a2)}`, m3: round2(a4 * b2 * a2) },
    { label: 'Costados curvos', formula: 'π × A4 × B1 / 2 × A2', m3: round2(((a4 * b1 * Math.PI) / 2) * a2) },
  ];
};

const squareParts = (measures: CubicageMeasures): CubicageCertificatePart[] => {
  const [a1, a2, a3] = (['totalWidth', 'totalLength', 'totalHeight'] as const).map((key) => meters(measures, key));
  return [{ label: 'Tolva', formula: `A1 × A2 × A3 = ${fixed(a1)} × ${fixed(a2)} × ${fixed(a3)}`, m3: round2(a1 * a2 * a3) }];
};

const measuresView = (shape: TruckShape, measures: CubicageMeasures): CubicageCertificateMeasure[] => {
  const fields = measureFieldsOf(shape);
  const measured = fields.filter((field) => !field.hint);
  const deduced = fields.filter((field) => field.hint);
  return [...measured, ...deduced].map((field) => {
    const [code, ...words] = field.label.split(' ');
    return { code, label: words.join(' '), meters: meters(measures, field.key), ...(field.hint ? { formula: field.hint } : {}) };
  });
};

const previousOf = (previous: CubicageCertificateInput['previous']) =>
  previous?.m3 ? { previous: { m3: previous.m3, ...(previous.at ? { at: new Date(previous.at).toISOString() } : {}) } } : {};

export const certificateFigureUrl = (origin: string, shape: TruckShape): string =>
  `${origin.replace(/\/+$/, '')}/img/cubicar/volquete-${shape === 'Concavo' ? 'concavo' : 'cuadrado'}.png`;

/** The deduced measures are worked out here too: a stored row may carry only the measured ones. */
export const certificateViewOf = (input: CubicageCertificateInput, options: CubicageCertificateOptions): CubicageCertificateView => {
  const measures = measuresOf(input.shape, input.measures);
  return {
  number: input.number,
  plate: input.plate,
  shape: input.shape,
  shapeLabel: SHAPE_LABEL[input.shape],
  cubicator: input.cubicator,
  measuredAt: new Date(input.measuredAt).toISOString(),
  ...previousOf(input.previous),
  issuer: options.issuer,
  ...(options.measuredBy ? { measuredBy: options.measuredBy } : {}),
  figureUrl: certificateFigureUrl(options.origin, input.shape),
  measures: measuresView(input.shape, measures),
  figure: measures,
  parts: input.shape === 'Concavo' ? concaveParts(measures) : squareParts(measures),
  m3: input.m3,
  dispatch: dispatchReference(input.shape, measures, input.m3),
  };
};
