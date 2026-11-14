import type { TruckShape } from './cubicage';
export declare const SHAPE_LABEL: Readonly<Record<TruckShape, string>>;
export declare const truckShapeOf: (value: unknown) => TruckShape | "";
/** The file name of the drawings each app serves at `/img/cubicar/volquete-<drawing>[-result].png`. */
export declare const drawingOf: (shape: TruckShape) => "concavo" | "cuadrado";
