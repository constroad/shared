/**
 * A dump truck's volume from its tape measures, in meters and m³. Portal and
 * Inframaq cubicate the same fleet, so both read these rules. The field names keep
 * Portal's spelling (`concaveHight`): they are what its documents store.
 */
export type TruckShape = 'Concavo' | 'Cuadrado';
export declare const CUBICAGE_MEASURE_KEYS: readonly ["totalWidth", "totalLength", "totalHeight", "concaveHight", "squareHeight", "leftConcaveWidth", "centralConcaveWidth", "rightConcaveWidth"];
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
export declare const measureFieldsOf: (shape: TruckShape) => readonly CubicageField[];
/** «B4X 836», «T2T-809» and «c9r753» are plates of one form. */
export declare const plateKeyOf: (plate: string | undefined) => string;
/** The hopper is measured outside and at its center; the rest follows from those. */
export declare const deriveConcaveMeasures: (base: CubicageMeasures) => Required<Pick<CubicageMeasures, "concaveHight" | "leftConcaveWidth" | "rightConcaveWidth">>;
/** The measures that count for a shape; a deduced one beats whatever was typed. */
export declare const measuresOf: (shape: TruckShape, measures: CubicageMeasures) => CubicageMeasures;
export declare const cubicageM3: (shape: TruckShape, measures: CubicageMeasures) => number;
/** How high the load reaches for a volume: a concave truck fills its curved part first. */
export declare const dispatchHeight: (shape: TruckShape, measures: CubicageMeasures, requestedM3: number) => DispatchHeight | null;
