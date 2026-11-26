"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoPreview = exports.blockGesture = exports.FileNavigator = exports.PageField = exports.ZoomControls = exports.ViewerToolbar = exports.ViewerButton = exports.VIEWER_BUTTON = void 0;
exports.useVisible = useVisible;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const icons_1 = require("./icons");
const labels_1 = require("./labels");
/** Bar buttons: shadcn tokens, 44 px touch targets (Portal portal-premium-ui §2c; Stitch draws 32–38 px). */
exports.VIEWER_BUTTON = 'inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-sm transition-[background-color,box-shadow] hover:shadow-md disabled:pointer-events-none disabled:opacity-40';
const ViewerButton = ({ className, ...props }) => (0, jsx_runtime_1.jsx)("button", { type: "button", className: (0, labels_1.cx)(exports.VIEWER_BUTTON, className), ...props });
exports.ViewerButton = ViewerButton;
const KIND_ICONS = { pdf: icons_1.FileTextIcon, image: icons_1.ImageFileIcon, video: icons_1.VideoFileIcon };
const FileKindIcon = ({ kind }) => {
    const Icon = KIND_ICONS[kind] ?? icons_1.FileTextIcon;
    return (0, jsx_runtime_1.jsx)("span", { "data-file-kind": kind, className: "hidden shrink-0 text-muted-foreground lg:inline-flex", children: (0, jsx_runtime_1.jsx)(Icon, {}) });
};
/**
 * The top bar: back, the company logo (desktop), what is open, then the tools. One bar from
 * `lg` (tablet landscape and desktop, Stitch dc02/dc03); on the phone the name wraps to two lines.
 */
const ViewerToolbar = ({ name, kind, kicker, badge, logo, labels, onClose, children }) => ((0, jsx_runtime_1.jsxs)("header", { className: "flex shrink-0 items-center gap-2 border-b border-border bg-card px-2 py-2 shadow-sm sm:gap-3 sm:px-4", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: onClose, "aria-label": labels.back, className: "inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold text-foreground hover:bg-muted xl:border xl:border-border xl:bg-card xl:px-3 xl:shadow-sm", children: [(0, jsx_runtime_1.jsx)(icons_1.ArrowLeftIcon, {}), (0, jsx_runtime_1.jsx)("span", { className: "hidden xl:inline", children: labels.back })] }), logo && (0, jsx_runtime_1.jsxs)("span", { className: "hidden shrink-0 items-center gap-3 xl:flex", children: [logo, (0, jsx_runtime_1.jsx)("span", { className: "h-6 w-px bg-border", "aria-hidden": "true" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 flex-1 items-center gap-2", children: [(0, jsx_runtime_1.jsx)(FileKindIcon, { kind: kind }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [kicker && (0, jsx_runtime_1.jsx)("p", { className: "truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground", children: kicker }), (0, jsx_runtime_1.jsx)("p", { className: "line-clamp-2 break-words text-sm font-semibold leading-snug text-foreground lg:line-clamp-1", title: name, children: name })] }), badge] }), children] }));
exports.ViewerToolbar = ViewerToolbar;
const zoomStep = (zoom, delta) => {
    const index = labels_1.ZOOM_STEPS.indexOf(zoom);
    return labels_1.ZOOM_STEPS[Math.min(labels_1.ZOOM_STEPS.length - 1, Math.max(0, index + delta))];
};
/** «− 100 % +» in one muted group, then «Ajustar al ancho» («Ajustar» on the phone). */
const ZoomControls = ({ zoom, labels, onZoom }) => {
    const index = labels_1.ZOOM_STEPS.indexOf(zoom);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex shrink-0 items-center gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center rounded-lg border border-border bg-muted", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "flex h-11 w-11 items-center justify-center rounded-l-lg text-foreground disabled:opacity-40", "aria-label": labels.zoomOut, disabled: index <= 0, onClick: () => onZoom(zoomStep(zoom, -1)), children: (0, jsx_runtime_1.jsx)(icons_1.MinusIcon, {}) }), (0, jsx_runtime_1.jsxs)("span", { className: "w-14 border-x border-border bg-card text-center font-mono text-xs leading-[44px] tabular-nums text-foreground", children: [zoom, " %"] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "flex h-11 w-11 items-center justify-center rounded-r-lg text-foreground disabled:opacity-40", "aria-label": labels.zoomIn, disabled: index >= labels_1.ZOOM_STEPS.length - 1, onClick: () => onZoom(zoomStep(zoom, 1)), children: (0, jsx_runtime_1.jsx)(icons_1.PlusIcon, {}) })] }), (0, jsx_runtime_1.jsxs)(exports.ViewerButton, { onClick: () => onZoom(100), "aria-label": labels.fit, children: [(0, jsx_runtime_1.jsx)(icons_1.FitIcon, {}), (0, jsx_runtime_1.jsx)("span", { className: "lg:hidden", children: labels.fitShort }), (0, jsx_runtime_1.jsx)("span", { className: "hidden lg:inline", children: labels.fit })] })] }));
};
exports.ZoomControls = ZoomControls;
/** «Página [3] de 12»: the field takes a page number; Enter or leaving it jumps, out of range it goes back. */
const PageField = ({ pager, labels }) => {
    const [typed, setTyped] = (0, react_1.useState)(String(pager.current));
    (0, react_1.useEffect)(() => setTyped(String(pager.current)), [pager.current]);
    const commit = () => {
        const page = Number(typed);
        if (Number.isInteger(page) && page >= 1 && page <= pager.pages && page !== pager.current)
            pager.goTo(page);
        else
            setTyped(String(pager.current));
    };
    const onKeyDown = (event) => { if (event.key === 'Enter')
        commit(); };
    return ((0, jsx_runtime_1.jsxs)("label", { className: "flex shrink-0 items-center gap-2 text-sm text-muted-foreground", children: [(0, jsx_runtime_1.jsx)("span", { children: labels.pageField }), (0, jsx_runtime_1.jsx)("input", { type: "number", inputMode: "numeric", min: 1, max: pager.pages, value: typed, "aria-label": labels.pageField, onChange: (event) => setTyped(event.target.value), onBlur: commit, onKeyDown: onKeyDown, className: "h-11 w-12 rounded-md border border-border bg-background text-center font-mono text-sm font-semibold tabular-nums text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" }), (0, jsx_runtime_1.jsx)("span", { className: "font-semibold tabular-nums text-foreground", children: labels.pageOf(pager.pages) })] }));
};
exports.PageField = PageField;
/** «‹ Archivo 3 de 12 ›»: the files of the folder, one after the other (never the pages). */
const FileNavigator = ({ index, total, labels, onStep, className }) => total < 2 ? null : ((0, jsx_runtime_1.jsxs)("nav", { className: (0, labels_1.cx)('shrink-0 items-center gap-1', className), "aria-label": labels.files, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40", "aria-label": labels.previousFile, disabled: index <= 0, onClick: () => onStep(-1), children: (0, jsx_runtime_1.jsx)(icons_1.ChevronLeftIcon, {}) }), (0, jsx_runtime_1.jsx)("span", { className: "whitespace-nowrap text-xs font-semibold tabular-nums text-muted-foreground", children: labels.fileCounter(index + 1, total) }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40", "aria-label": labels.nextFile, disabled: index >= total - 1, onClick: () => onStep(1), children: (0, jsx_runtime_1.jsx)(icons_1.ChevronRightIcon, {}) })] }));
exports.FileNavigator = FileNavigator;
/** Calls `onVisible` the first time the element nears the viewport. */
function useVisible(ref, onVisible) {
    const callback = (0, react_1.useRef)(onVisible);
    callback.current = onVisible;
    (0, react_1.useEffect)(() => {
        const element = ref.current;
        if (!element || typeof IntersectionObserver === 'undefined') {
            callback.current();
            return undefined;
        }
        const observer = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && callback.current(), { rootMargin: '200px' });
        observer.observe(element);
        return () => observer.disconnect();
    }, [ref]);
}
/** Blocks the courtesy gestures (save image, drag). Not a protection: the original never reached the browser. */
const blockGesture = (event) => event.preventDefault();
exports.blockGesture = blockGesture;
const NoPreview = ({ labels }) => ((0, jsx_runtime_1.jsxs)("div", { className: "mx-auto mt-16 flex max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-sm", children: [(0, jsx_runtime_1.jsx)(FileIcon2, {}), (0, jsx_runtime_1.jsx)("p", { className: "font-semibold text-foreground", children: labels.noPreview }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm", children: labels.noPreviewDetail })] }));
exports.NoPreview = NoPreview;
const FileIcon2 = () => (0, jsx_runtime_1.jsx)("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, className: "h-8 w-8", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { d: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6" }) });
