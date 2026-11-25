"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoPreview = exports.blockGesture = exports.FileNavigator = exports.ZoomControls = exports.ViewerToolbar = exports.ViewerButton = exports.VIEWER_BUTTON = void 0;
exports.useVisible = useVisible;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const icons_1 = require("./icons");
const labels_1 = require("./labels");
/** Bar buttons: shadcn tokens, 44 px touch targets. */
exports.VIEWER_BUTTON = 'inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-sm transition-[background-color,box-shadow] hover:shadow-md disabled:pointer-events-none disabled:opacity-40';
const ViewerButton = ({ className, ...props }) => (0, jsx_runtime_1.jsx)("button", { type: "button", className: (0, labels_1.cx)(exports.VIEWER_BUTTON, className), ...props });
exports.ViewerButton = ViewerButton;
/** Top bar: back (never compressed), what is open, then the item's controls. */
const ViewerToolbar = ({ name, kicker, badge, labels, onClose, children }) => ((0, jsx_runtime_1.jsxs)("header", { className: "flex shrink-0 items-center gap-2 border-b border-border bg-card px-2 py-2 shadow-sm sm:gap-3 sm:px-4", children: [(0, jsx_runtime_1.jsxs)(exports.ViewerButton, { onClick: onClose, "aria-label": labels.back, children: [(0, jsx_runtime_1.jsx)(icons_1.ArrowLeftIcon, {}), (0, jsx_runtime_1.jsx)("span", { className: "hidden md:inline", children: labels.back })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 flex-1 items-center gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [kicker && (0, jsx_runtime_1.jsx)("p", { className: "truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground", children: kicker }), (0, jsx_runtime_1.jsx)("p", { className: "truncate text-sm font-semibold text-foreground", children: name })] }), badge] }), children] }));
exports.ViewerToolbar = ViewerToolbar;
const ZoomControls = ({ zoom, labels, onZoom }) => {
    const index = labels_1.ZOOM_STEPS.indexOf(zoom);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex shrink-0 items-center gap-1", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center rounded-lg border border-border bg-card", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "flex h-10 w-10 items-center justify-center disabled:opacity-40", "aria-label": labels.zoomOut, disabled: index <= 0, onClick: () => onZoom(labels_1.ZOOM_STEPS[Math.max(0, index - 1)]), children: (0, jsx_runtime_1.jsx)(icons_1.MinusIcon, {}) }), (0, jsx_runtime_1.jsxs)("span", { className: "w-14 text-center font-mono text-xs tabular-nums text-foreground", children: [zoom, " %"] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "flex h-10 w-10 items-center justify-center disabled:opacity-40", "aria-label": labels.zoomIn, disabled: index >= labels_1.ZOOM_STEPS.length - 1, onClick: () => onZoom(labels_1.ZOOM_STEPS[Math.min(labels_1.ZOOM_STEPS.length - 1, index + 1)]), children: (0, jsx_runtime_1.jsx)(icons_1.PlusIcon, {}) })] }), (0, jsx_runtime_1.jsxs)(exports.ViewerButton, { onClick: () => onZoom(100), "aria-label": labels.fit, children: [(0, jsx_runtime_1.jsx)(icons_1.FitIcon, {}), (0, jsx_runtime_1.jsx)("span", { className: "hidden lg:inline", children: labels.fit })] })] }));
};
exports.ZoomControls = ZoomControls;
/** «‹ 3 de 12 ›»: the files of the folder, one after the other. */
const FileNavigator = ({ index, total, labels, onStep }) => total < 2 ? null : ((0, jsx_runtime_1.jsxs)("div", { className: "flex shrink-0 items-center gap-1", "aria-label": "Archivos", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "flex h-10 w-10 items-center justify-center rounded-lg disabled:opacity-40", "aria-label": labels.previous, disabled: index <= 0, onClick: () => onStep(-1), children: (0, jsx_runtime_1.jsx)(icons_1.ChevronLeftIcon, {}) }), (0, jsx_runtime_1.jsx)("span", { className: "font-mono text-xs tabular-nums text-muted-foreground", children: labels.fileCounter(index + 1, total) }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "flex h-10 w-10 items-center justify-center rounded-lg disabled:opacity-40", "aria-label": labels.next, disabled: index >= total - 1, onClick: () => onStep(1), children: (0, jsx_runtime_1.jsx)(icons_1.ChevronRightIcon, {}) })] }));
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
