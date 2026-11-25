"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PagedView = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const icons_1 = require("./icons");
const labels_1 = require("./labels");
const ViewerControls_1 = require("./ViewerControls");
const usePagedSource_1 = require("./usePagedSource");
/**
 * Page images load in CORS mode (`crossOrigin`). lila answered `/api/drive/share/*` with
 * `Cross-Origin-Resource-Policy: same-origin` until 25/11/2026 (now `cross-origin`); a CORS <img>
 * works with both, so an app pointed at an older lila still shows its pages.
 */
const PageImage = ({ page, url, zoom, onVisible, register }) => {
    const ref = (0, react_1.useRef)(null);
    (0, ViewerControls_1.useVisible)(ref, onVisible);
    return ((0, jsx_runtime_1.jsx)("div", { ref: (node) => { ref.current = node; register(page, node); }, "data-page": page, className: "mx-auto overflow-hidden rounded-lg border border-border bg-card shadow-sm", style: { width: `${zoom}%`, maxWidth: zoom <= 100 ? '56rem' : undefined }, children: url ? (0, jsx_runtime_1.jsx)("img", { src: url, alt: `Página ${page}`, loading: "lazy", draggable: false, referrerPolicy: "no-referrer", crossOrigin: "anonymous", onContextMenu: ViewerControls_1.blockGesture, onDragStart: ViewerControls_1.blockGesture, className: "block h-auto w-full select-none" }) : (0, jsx_runtime_1.jsx)("div", { className: "aspect-[1/1.414] w-full animate-pulse bg-muted" }) }));
};
const PageRail = ({ source, current, vertical, onPick }) => ((0, jsx_runtime_1.jsx)("ol", { className: (0, labels_1.cx)('flex gap-3', vertical ? 'flex-col p-4' : 'snap-x overflow-x-auto px-4 pb-3'), children: Array.from({ length: source.pages }, (_, index) => index + 1).map((page) => ((0, jsx_runtime_1.jsxs)("li", { className: (0, labels_1.cx)('flex shrink-0 flex-col items-center gap-1', !vertical && 'snap-start'), children: [(0, jsx_runtime_1.jsx)(RailThumb, { page: page, active: page === current, url: source.urlOf(page), vertical: vertical, onVisible: () => source.ensurePage(page), onPick: () => onPick(page) }), (0, jsx_runtime_1.jsx)("span", { className: (0, labels_1.cx)('text-xs tabular-nums', page === current ? 'font-semibold text-foreground' : 'text-muted-foreground'), children: page })] }, page))) }));
const RailThumb = ({ page, active, url, vertical, onVisible, onPick }) => {
    const ref = (0, react_1.useRef)(null);
    (0, ViewerControls_1.useVisible)(ref, onVisible);
    (0, react_1.useEffect)(() => { if (active)
        ref.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }, [active]);
    return ((0, jsx_runtime_1.jsx)("button", { ref: ref, type: "button", onClick: onPick, "aria-current": active ? 'page' : undefined, "aria-label": `Ir a la página ${page}`, className: (0, labels_1.cx)('aspect-[1/1.414] overflow-hidden rounded-md border bg-card shadow-sm', vertical ? 'w-36' : 'w-14', active ? 'border-foreground ring-2 ring-accent/40' : 'border-border'), children: url ? (0, jsx_runtime_1.jsx)("img", { src: url, alt: "", loading: "lazy", draggable: false, referrerPolicy: "no-referrer", crossOrigin: "anonymous", className: "h-full w-full select-none object-contain" }) : (0, jsx_runtime_1.jsx)("span", { className: "block h-full w-full animate-pulse bg-muted" }) }));
};
/** Which page sits at the top of the scroll area. */
const useCurrentPage = (scrollRef, pageRefs) => {
    const [current, setCurrent] = (0, react_1.useState)(1);
    (0, react_1.useEffect)(() => {
        const root = scrollRef.current;
        if (!root || typeof IntersectionObserver === 'undefined')
            return undefined;
        const observer = new IntersectionObserver((entries) => {
            const visible = entries.filter((entry) => entry.isIntersecting).map((entry) => Number(entry.target.dataset.page));
            if (visible.length)
                setCurrent(Math.min(...visible));
        }, { root, threshold: 0.5 });
        pageRefs.current.forEach((node) => observer.observe(node));
        return () => observer.disconnect();
    });
    return [current, setCurrent];
};
/** A PDF (or an image) without download: watermarked page images, thumbnails, zoom, page n of N. */
const PagedView = ({ loader, labels, zoom, onZoom, multiPage }) => {
    const main = (0, usePagedSource_1.usePagedSource)(loader, false);
    const thumbs = (0, usePagedSource_1.usePagedSource)(multiPage ? loader : undefined, true);
    const scrollRef = (0, react_1.useRef)(null);
    const pageRefs = (0, react_1.useRef)(new Map());
    const [current, setCurrent] = useCurrentPage(scrollRef, pageRefs);
    const register = (0, react_1.useCallback)((page, node) => (node ? pageRefs.current.set(page, node) : pageRefs.current.delete(page)), []);
    const goTo = (page) => { setCurrent(page); main.ensurePage(page); pageRefs.current.get(page)?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }); };
    if (main.failed)
        return (0, jsx_runtime_1.jsx)(ViewerControls_1.NoPreview, { labels: labels });
    const showRail = main.pages > 1;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex min-h-0 flex-1 flex-col print:hidden", onContextMenu: ViewerControls_1.blockGesture, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-semibold tabular-nums text-foreground", "aria-live": "polite", children: main.pages ? labels.page(current, main.pages) : '' }), (0, jsx_runtime_1.jsx)(ViewerControls_1.ZoomControls, { zoom: zoom, labels: labels, onZoom: onZoom })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex min-h-0 flex-1", children: [showRail && (0, jsx_runtime_1.jsx)("aside", { className: "hidden w-48 shrink-0 overflow-y-auto border-r border-border bg-card md:block", "aria-label": labels.thumbnails, children: (0, jsx_runtime_1.jsx)(PageRail, { source: thumbs, current: current, vertical: true, onPick: goTo }) }), (0, jsx_runtime_1.jsxs)("div", { ref: scrollRef, className: "min-w-0 flex-1 overflow-auto", children: [showRail && (0, jsx_runtime_1.jsx)("div", { className: "border-b border-border bg-card pt-3 md:hidden", "aria-label": labels.thumbnails, children: (0, jsx_runtime_1.jsx)(PageRail, { source: thumbs, current: current, vertical: false, onPick: goTo }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-4 p-4 sm:p-6", children: [main.pages === 0 ? (0, jsx_runtime_1.jsx)("div", { className: "mx-auto aspect-[1/1.414] w-full max-w-4xl animate-pulse rounded-lg bg-muted" }) : Array.from({ length: main.pages }, (_, index) => index + 1).map((page) => ((0, jsx_runtime_1.jsx)(PageImage, { page: page, url: main.urlOf(page), zoom: zoom, onVisible: () => main.ensurePage(page), register: register }, page))), main.pages > 0 && (0, jsx_runtime_1.jsxs)("p", { className: "mx-auto flex max-w-md items-start gap-2 px-4 py-4 text-center text-sm text-muted-foreground", children: [(0, jsx_runtime_1.jsx)(icons_1.LockIcon, {}), labels.readOnly] })] })] })] }), main.pages > 1 && ((0, jsx_runtime_1.jsxs)("nav", { className: "flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 md:hidden", children: [(0, jsx_runtime_1.jsxs)(ViewerControls_1.ViewerButton, { disabled: current <= 1, onClick: () => goTo(current - 1), children: [(0, jsx_runtime_1.jsx)(icons_1.ChevronLeftIcon, {}), labels.previous] }), (0, jsx_runtime_1.jsxs)("p", { className: "text-base font-semibold tabular-nums text-foreground", children: [current, " / ", main.pages] }), (0, jsx_runtime_1.jsxs)(ViewerControls_1.ViewerButton, { className: "bg-primary text-primary-foreground", disabled: current >= main.pages, onClick: () => goTo(current + 1), children: [labels.next, (0, jsx_runtime_1.jsx)(icons_1.ChevronRightIcon, {})] })] }))] }));
};
exports.PagedView = PagedView;
