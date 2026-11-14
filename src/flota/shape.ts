import type { TruckShape } from './cubicage';

/** In Portal `shape` is free text: a row can say «Square», «cóncavo» or nothing at all. */

const SHAPE_BY_TEXT: Readonly<Record<string, TruckShape>> = { cuadrado: 'Cuadrado', square: 'Cuadrado', concavo: 'Concavo', concave: 'Concavo' };

export const SHAPE_LABEL: Readonly<Record<TruckShape, string>> = { Concavo: 'Cóncavo', Cuadrado: 'Cuadrado' };

const plainText = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export const truckShapeOf = (value: unknown): TruckShape | '' => SHAPE_BY_TEXT[plainText(value)] ?? '';

/** The file name of the drawings each app serves at `/img/cubicar/volquete-<drawing>[-result].png`. */
export const drawingOf = (shape: TruckShape): 'concavo' | 'cuadrado' => (shape === 'Concavo' ? 'concavo' : 'cuadrado');
