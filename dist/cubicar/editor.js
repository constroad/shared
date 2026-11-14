"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CubicageEditor = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const cubicage_1 = require("../flota/cubicage");
const shape_1 = require("../flota/shape");
const cards_1 = require("./cards");
const kit_1 = require("./kit");
const useUnitForm = (unit) => {
    const [shape, setShape] = (0, react_1.useState)((0, shape_1.truckShapeOf)(unit?.shape));
    const [plate, setPlate] = (0, react_1.useState)(unit?.plate ?? '');
    const [cubicator, setCubicator] = (0, react_1.useState)(unit?.cubicator ?? '');
    const [typed, setTyped] = (0, react_1.useState)(unit?.measures ?? {});
    const measures = (0, react_1.useMemo)(() => (shape ? (0, cubicage_1.measuresOf)(shape, typed) : typed), [shape, typed]);
    const type = (key, value) => setTyped((current) => ({ ...current, [key]: value }));
    return { shape, setShape, plate, setPlate, cubicator, setCubicator, measures, type, m3: shape ? (0, cubicage_1.cubicageM3)(shape, measures) : 0 };
};
const CheckIcon = () => ((0, jsx_runtime_1.jsx)("svg", { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { d: "M20 6 9 17l-5-5" }) }));
const lastCubicageLine = (unit) => {
    if (!unit?.cubicageUpdatedAt)
        return unit ? `${unit.plate} · sin cubicaje guardado` : 'Unidad nueva';
    const day = new Date(unit.cubicageUpdatedAt).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${unit.plate} · último cubicaje ${day}`;
};
const SaveBar = ({ disabled, saving, onSave, unit }) => {
    const { Button } = (0, kit_1.useCubicarKit)();
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card p-3 lg:static lg:border-0 lg:bg-transparent lg:p-0", children: [(0, jsx_runtime_1.jsxs)(Button, { type: "button", className: "h-12 w-full text-base", disabled: disabled, onClick: onSave, children: [(0, jsx_runtime_1.jsx)(CheckIcon, {}), saving ? 'Guardando...' : 'Guardar cubicaje'] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-center font-mono text-xs text-muted-foreground", children: lastCubicageLine(unit) })] }));
};
const PlateField = ({ value, locked, onChange }) => {
    const { Input } = (0, kit_1.useCubicarKit)();
    return ((0, jsx_runtime_1.jsxs)("label", { className: "block space-y-1.5 text-sm font-semibold", children: [(0, jsx_runtime_1.jsx)("span", { children: "Placa" }), (0, jsx_runtime_1.jsx)(Input, { "aria-label": "Placa", placeholder: "ABC-123", className: "font-mono", disabled: locked, value: value, onChange: (event) => onChange(event.target.value.toUpperCase()) })] }));
};
const CubicageEditor = ({ unit, responsible, saving, onSave, picker, notice }) => {
    const form = useUnitForm(unit);
    const { shape, plate, cubicator, measures, m3 } = form;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4 pb-28 lg:pb-0", children: [unit?.pendingCubicageRegularization ? (0, jsx_runtime_1.jsx)("p", { className: "rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm font-medium text-warning", children: "Provisorio: naci\u00F3 de un despacho. M\u00EDdela para regularizarla." }) : null, (0, jsx_runtime_1.jsxs)("div", { className: "grid gap-4 lg:grid-cols-[minmax(0,62fr)_minmax(0,38fr)] lg:items-start", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [picker, (0, jsx_runtime_1.jsx)(cards_1.ShapeCard, { shape: shape, onPick: form.setShape, children: shape ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PlateField, { value: plate, locked: Boolean(responsible && unit), onChange: form.setPlate }), (0, jsx_runtime_1.jsx)(cards_1.ResponsibleRow, { responsible: responsible, value: cubicator, onChange: form.setCubicator })] })) : null }), shape ? (0, jsx_runtime_1.jsx)(cards_1.MeasuresCard, { shape: shape, measures: measures, onType: form.type, m3: m3 }) : null, shape && m3 <= 0 && unit?.m3 ? (0, jsx_runtime_1.jsx)("p", { className: "text-center text-sm text-muted-foreground", children: `Cubicaje guardado: ${(0, cards_1.formatM3)(unit.m3)}. Ingresa las medidas para actualizarlo.` }) : null] }), shape ? ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4 lg:sticky lg:top-4", children: [notice, m3 > 0 ? (0, jsx_runtime_1.jsx)(cards_1.DispatchCard, { shape: shape, measures: measures, m3: m3 }) : null, (0, jsx_runtime_1.jsx)(SaveBar, { disabled: saving || m3 <= 0, saving: saving, onSave: () => onSave({ plate, cubicator, shape, measures }), unit: unit })] })) : null] })] }));
};
exports.CubicageEditor = CubicageEditor;
