"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.certificateViewOf = exports.certificateFigureUrl = void 0;
const cubicage_1 = require("./cubicage");
const dispatchHeights_1 = require("./dispatchHeights");
const shape_1 = require("./shape");
const CM_PER_M = 100;
const meters = (measures, key) => Number(measures[key] ?? 0);
const fixed = (value) => value.toFixed(2);
const round2 = (value) => Math.round(value * CM_PER_M) / CM_PER_M;
const concaveParts = (measures) => {
    const [a1, a2, a5, a4, b2, b1] = ['totalWidth', 'totalLength', 'squareHeight', 'concaveHight', 'centralConcaveWidth', 'leftConcaveWidth'].map((key) => meters(measures, key));
    return [
        { label: 'Parte recta', formula: `A1 × A2 × A5 = ${fixed(a1)} × ${fixed(a2)} × ${fixed(a5)}`, m3: round2(a1 * a2 * a5) },
        { label: 'Fondo plano', formula: `A4 × B2 × A2 = ${fixed(a4)} × ${fixed(b2)} × ${fixed(a2)}`, m3: round2(a4 * b2 * a2) },
        { label: 'Costados curvos', formula: 'π × A4 × B1 / 2 × A2', m3: round2(((a4 * b1 * Math.PI) / 2) * a2) },
    ];
};
const squareParts = (measures) => {
    const [a1, a2, a3] = ['totalWidth', 'totalLength', 'totalHeight'].map((key) => meters(measures, key));
    return [{ label: 'Tolva', formula: `A1 × A2 × A3 = ${fixed(a1)} × ${fixed(a2)} × ${fixed(a3)}`, m3: round2(a1 * a2 * a3) }];
};
const measuresView = (shape, measures) => {
    const fields = (0, cubicage_1.measureFieldsOf)(shape);
    const measured = fields.filter((field) => !field.hint);
    const deduced = fields.filter((field) => field.hint);
    return [...measured, ...deduced].map((field) => {
        const [code, ...words] = field.label.split(' ');
        return { code, label: words.join(' '), meters: meters(measures, field.key), ...(field.hint ? { formula: field.hint } : {}) };
    });
};
const previousOf = (previous) => previous?.m3 ? { previous: { m3: previous.m3, ...(previous.at ? { at: new Date(previous.at).toISOString() } : {}) } } : {};
const certificateFigureUrl = (origin, shape) => `${origin.replace(/\/+$/, '')}/img/cubicar/volquete-${shape === 'Concavo' ? 'concavo' : 'cuadrado'}.png`;
exports.certificateFigureUrl = certificateFigureUrl;
const certificateViewOf = (input, options) => ({
    number: input.number,
    plate: input.plate,
    shape: input.shape,
    shapeLabel: shape_1.SHAPE_LABEL[input.shape],
    cubicator: input.cubicator,
    measuredAt: new Date(input.measuredAt).toISOString(),
    ...previousOf(input.previous),
    issuer: options.issuer,
    ...(options.measuredBy ? { measuredBy: options.measuredBy } : {}),
    figureUrl: (0, exports.certificateFigureUrl)(options.origin, input.shape),
    measures: measuresView(input.shape, input.measures),
    parts: input.shape === 'Concavo' ? concaveParts(input.measures) : squareParts(input.measures),
    m3: input.m3,
    dispatch: (0, dispatchHeights_1.dispatchReference)(input.shape, input.measures, input.m3),
});
exports.certificateViewOf = certificateViewOf;
