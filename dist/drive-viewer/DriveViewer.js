"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriveViewer = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const labels_1 = require("./labels");
const ViewerControls_1 = require("./ViewerControls");
const ViewerActions_1 = require("./ViewerActions");
const MediaViews_1 = require("./MediaViews");
const PagedView_1 = require("./PagedView");
/** A horizontal swipe longer than this moves to the next or previous file. */
const SWIPE_MIN_PX = 60;
const useFileKeys = (enabled, onStep, onClose) => {
    (0, react_1.useEffect)(() => {
        if (!enabled)
            return undefined;
        const onKey = (event) => {
            if (event.target instanceof HTMLInputElement)
                return;
            if (event.key === 'Escape')
                onClose();
            if (event.key === 'ArrowRight')
                onStep(1);
            if (event.key === 'ArrowLeft')
                onStep(-1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [enabled, onStep, onClose]);
};
const useSwipe = (onStep) => {
    const start = (0, react_1.useRef)(null);
    return {
        onTouchStart: (event) => { start.current = event.touches.length === 1 ? event.touches[0].clientX : null; },
        onTouchEnd: (event) => {
            if (start.current === null)
                return;
            const delta = event.changedTouches[0].clientX - start.current;
            start.current = null;
            if (Math.abs(delta) >= SWIPE_MIN_PX)
                onStep(delta < 0 ? 1 : -1);
        },
    };
};
const isPaged = (item) => item.kind === 'pdf' && !item.canDownload && Boolean(item.loadPages);
const ViewerBody = ({ item, labels, zoom, onZoom, onPager, renderPdf }) => {
    if (item.kind === 'video')
        return (0, jsx_runtime_1.jsx)(MediaViews_1.VideoView, { item: item, labels: labels });
    if (item.kind === 'image')
        return (0, jsx_runtime_1.jsx)(MediaViews_1.ImageView, { item: item, labels: labels, zoom: zoom, onZoom: onZoom });
    if (item.kind !== 'pdf')
        return (0, jsx_runtime_1.jsx)(ViewerControls_1.NoPreview, { labels: labels });
    if (isPaged(item) && item.loadPages)
        return (0, jsx_runtime_1.jsx)(PagedView_1.PagedView, { loader: item.loadPages, labels: labels, zoom: zoom, onZoom: onZoom, multiPage: true, onPager: onPager }, item.id);
    if (renderPdf)
        return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: renderPdf(item) });
    return item.src ? (0, jsx_runtime_1.jsx)("iframe", { src: item.src, title: item.name, className: "min-h-0 w-full flex-1 border-0" }) : (0, jsx_runtime_1.jsx)(ViewerControls_1.NoPreview, { labels: labels });
};
/** Page field and zoom in the top bar from `lg` (one bar, Stitch dc02); below, the body draws its own row. */
const BarTools = ({ item, pager, zoom, labels, onZoom }) => {
    if (item.kind !== 'image' && !isPaged(item))
        return null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "hidden shrink-0 items-center gap-2 lg:flex xl:gap-3", children: [pager && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(ViewerControls_1.PageField, { pager: pager, labels: labels }), (0, jsx_runtime_1.jsx)(ViewerControls_1.BarDivider, { name: "tools", className: "" })] }), (0, jsx_runtime_1.jsx)(ViewerControls_1.ZoomControls, { zoom: zoom, labels: labels, onZoom: onZoom })] }));
};
/** The Drive viewer: one shell for PDF (pages or pdf.js), image and video, moving across the folder's files. */
const DriveViewer = ({ items, currentId, onNavigate, onClose, renderActions, renderPdf, renderBadge, onDownload, onPrint, logo, labels: overrides, surfaceClassName }) => {
    const labels = { ...labels_1.DEFAULT_LABELS, ...overrides };
    const index = items.findIndex((item) => item.id === currentId);
    const item = index >= 0 ? items[index] : null;
    const [zoom, setZoom] = (0, react_1.useState)(100);
    const [pager, setPager] = (0, react_1.useState)(null);
    const step = (delta) => {
        const next = items[index + delta];
        if (next) {
            setZoom(100);
            onNavigate(next.id);
        }
    };
    useFileKeys(Boolean(item), step, onClose);
    const swipe = useSwipe(step);
    if (!item || typeof document === 'undefined')
        return null;
    // Portaled to <body>: an ancestor with a transform would trap the fixed overlay inside it.
    return (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsx)("div", { className: surfaceClassName, children: (0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex flex-col bg-background", role: "dialog", "aria-modal": "true", "aria-label": item.name, children: [(0, jsx_runtime_1.jsxs)(ViewerControls_1.ViewerToolbar, { name: item.name, kind: item.kind, kicker: item.kicker, badge: renderBadge?.(item), logo: logo, labels: labels, onClose: onClose, children: [(0, jsx_runtime_1.jsx)(ViewerControls_1.FileNavigator, { index: index, total: items.length, labels: labels, onStep: step, className: "hidden lg:flex" }), (0, jsx_runtime_1.jsx)(BarTools, { item: item, pager: pager, zoom: zoom, labels: labels, onZoom: setZoom }), (0, jsx_runtime_1.jsx)(ViewerActions_1.ViewerActions, { item: item, labels: labels, onDownload: onDownload, onPrint: onPrint, placement: "bar" }), renderActions?.(item)] }), (0, jsx_runtime_1.jsx)(ViewerActions_1.ViewerActions, { item: item, labels: labels, onDownload: onDownload, onPrint: onPrint, placement: "row" }), (0, jsx_runtime_1.jsx)(ViewerControls_1.FileNavigator, { index: index, total: items.length, labels: labels, onStep: step, className: "flex justify-center border-b border-border bg-card lg:hidden" }), (0, jsx_runtime_1.jsx)("div", { className: "flex min-h-0 flex-1 flex-col", ...swipe, children: (0, jsx_runtime_1.jsx)(ViewerBody, { item: item, labels: labels, zoom: zoom, onZoom: setZoom, onPager: setPager, renderPdf: renderPdf }, item.id) })] }) }), document.body);
};
exports.DriveViewer = DriveViewer;
