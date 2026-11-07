/**
 * A dump truck's volume from its tape measures, in meters and m³. Portal and
 * Inframaq cubicate the same fleet, so both read these rules. The field names keep
 * Portal's spelling (`concaveHight`): they are what its documents store.
 */

export type TruckShape = 'Concavo' | 'Cuadrado';

export const CUBICAGE_MEASURE_KEYS = ['totalWidth', 'totalLength', 'totalHeight', 'concaveHight', 'squareHeight', 'leftConcaveWidth', 'centralConcaveWidth', 'rightConcaveWidth'] as const;

export type CubicageMeasureKey = (typeof CUBICAGE_MEASURE_KEYS)[number];
export type CubicageMeasures = Partial<Record<CubicageMeasureKey, string>>;

export interface CubicageField {
  key: CubicageMeasureKey;
  label: string;
  /** How a measure nobody types is deduced. */
  hint?: string;
}

export interface DispatchHeight {
  loadHeight: number;
  fromTop: number;
}

const SQUARE_FIELDS: readonly CubicageField[] = [
  { key: 'totalWidth', label: 'A1 Ancho' },
  { key: 'totalLength', label: 'A2 Largo' },
  { key: 'totalHeight', label: 'A3 Alto' },
];

const CONCAVE_FIELDS: readonly CubicageField[] = [
  ...SQUARE_FIELDS,
  { key: 'concaveHight', label: 'A4 Alto cóncavo', hint: 'A3 − A5' },
  { key: 'squareHeight', label: 'A5 Alto cuadrado' },
  { key: 'leftConcaveWidth', label: 'B1 Ancho cóncavo', hint: '(A1 − B2) / 2' },
  { key: 'centralConcaveWidth', label: 'B2 Ancho centro' },
  { key: 'rightConcaveWidth', label: 'B3 Ancho derecho', hint: '(A1 − B2) / 2' },
];

/** Millimeters: how a tape reads. */
const MEASURE_DECIMALS = 3;

export const measureFieldsOf = (shape: TruckShape): readonly CubicageField[] => (shape === 'Cuadrado' ? SQUARE_FIELDS : CONCAVE_FIELDS);

/** «B4X 836», «T2T-809» and «c9r753» are plates of one form. */
export const plateKeyOf = (plate: string | undefined): string =>
  String(plate ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const numberOf = (measure: string | undefined): number => {
  const parsed = Number(String(measure ?? '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const measureOf = (value: number): string => (value > 0 ? String(Number(value.toFixed(MEASURE_DECIMALS))) : '0');

/** The hopper is measured outside and at its center; the rest follows from those. */
export const deriveConcaveMeasures = (base: CubicageMeasures): Required<Pick<CubicageMeasures, 'concaveHight' | 'leftConcaveWidth' | 'rightConcaveWidth'>> => {
  const sideWidth = measureOf((numberOf(base.totalWidth) - numberOf(base.centralConcaveWidth)) / 2);
  return { concaveHight: measureOf(numberOf(base.totalHeight) - numberOf(base.squareHeight)), leftConcaveWidth: sideWidth, rightConcaveWidth: sideWidth };
};

/** The measures that count for a shape; a deduced one beats whatever was typed. */
export const measuresOf = (shape: TruckShape, measures: CubicageMeasures): CubicageMeasures => {
  if (shape === 'Concavo') return { ...measures, ...deriveConcaveMeasures(measures) };
  const { totalWidth, totalLength, totalHeight } = measures;
  return { totalWidth, totalLength, totalHeight };
};

const concaveParts = (measures: CubicageMeasures): { straight: number; curved: number } => {
  const known = measuresOf('Concavo', measures);
  const [length, curveHeight] = [numberOf(known.totalLength), numberOf(known.concaveHight)];
  const flatBottom = curveHeight * numberOf(known.centralConcaveWidth) * length;
  const curvedSides = ((curveHeight * numberOf(known.leftConcaveWidth) * Math.PI) / 2) * length;
  return { straight: numberOf(known.totalWidth) * length * numberOf(known.squareHeight), curved: flatBottom + curvedSides };
};

export const cubicageM3 = (shape: TruckShape, measures: CubicageMeasures): number => {
  if (shape === 'Cuadrado') return numberOf(measures.totalWidth) * numberOf(measures.totalLength) * numberOf(measures.totalHeight);
  const { straight, curved } = concaveParts(measures);
  return straight + curved;
};

const heightOf = (loadHeight: number, totalHeight: number): DispatchHeight | null =>
  Number.isFinite(loadHeight) ? { loadHeight, fromTop: totalHeight - loadHeight } : null;

/** How high the load reaches for a volume: a concave truck fills its curved part first. */
export const dispatchHeight = (shape: TruckShape, measures: CubicageMeasures, requestedM3: number): DispatchHeight | null => {
  if (!Number.isFinite(requestedM3) || requestedM3 <= 0) return null;
  const totalHeight = numberOf(measures.totalHeight);
  if (shape === 'Cuadrado') {
    const total = cubicageM3(shape, measures);
    return total > 0 ? heightOf((requestedM3 * totalHeight) / total, totalHeight) : null;
  }
  const { straight, curved } = concaveParts(measures);
  if (straight <= 0) return null;
  const known = measuresOf('Concavo', measures);
  return heightOf(((requestedM3 - curved) * numberOf(known.squareHeight)) / straight + numberOf(known.concaveHight), totalHeight);
};
