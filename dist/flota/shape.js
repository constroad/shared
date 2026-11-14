"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawingOf = exports.truckShapeOf = exports.SHAPE_LABEL = void 0;
/** In Portal `shape` is free text: a row can say «Square», «cóncavo» or nothing at all. */
const SHAPE_BY_TEXT = { cuadrado: 'Cuadrado', square: 'Cuadrado', concavo: 'Concavo', concave: 'Concavo' };
exports.SHAPE_LABEL = { Concavo: 'Cóncavo', Cuadrado: 'Cuadrado' };
const plainText = (value) => String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
const truckShapeOf = (value) => SHAPE_BY_TEXT[plainText(value)] ?? '';
exports.truckShapeOf = truckShapeOf;
/** The file name of the drawings each app serves at `/img/cubicar/volquete-<drawing>[-result].png`. */
const drawingOf = (shape) => (shape === 'Concavo' ? 'concavo' : 'cuadrado');
exports.drawingOf = drawingOf;
