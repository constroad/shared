"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIGURES = exports.KICKER = exports.drawingSrc = exports.useCubicarKit = exports.CubicarKitProvider = exports.classes = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
/** Joins the classes that are set. The form never passes two classes that fight each other. */
const classes = (...names) => names.filter(Boolean).join(' ');
exports.classes = classes;
const PlainButton = ({ variant: _variant, size: _size, className, ...props }) => (0, jsx_runtime_1.jsx)("button", { className: (0, exports.classes)('rounded-md border px-3 py-2', className), ...props });
const PlainCard = ({ className, ...props }) => (0, jsx_runtime_1.jsx)("div", { className: (0, exports.classes)('rounded-xl border bg-card', className), ...props });
const PlainContent = (props) => (0, jsx_runtime_1.jsx)("div", { ...props });
const PlainInput = ({ className, ...props }) => (0, jsx_runtime_1.jsx)("input", { className: (0, exports.classes)('w-full rounded-md border px-3 py-2', className), ...props });
const PLAIN_KIT = { Button: PlainButton, Card: PlainCard, CardContent: PlainContent, Input: PlainInput, assetOrigin: '' };
const KitContext = (0, react_1.createContext)(PLAIN_KIT);
const CubicarKitProvider = ({ kit, children }) => (0, jsx_runtime_1.jsx)(KitContext.Provider, { value: kit, children: children });
exports.CubicarKitProvider = CubicarKitProvider;
const useCubicarKit = () => (0, react_1.useContext)(KitContext);
exports.useCubicarKit = useCubicarKit;
const drawingSrc = (kit, drawing) => `${kit.assetOrigin ?? ''}/img/cubicar/volquete-${drawing}.png`;
exports.drawingSrc = drawingSrc;
/** The label of a block: mono, uppercase and wide, without needing the app's `.kicker` utility. */
exports.KICKER = 'font-mono text-[11px] font-medium uppercase tracking-[0.18em]';
/** Digits of the same width, so columns do not dance. */
exports.FIGURES = 'tabular-nums';
