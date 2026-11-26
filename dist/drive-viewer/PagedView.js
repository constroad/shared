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
    return ((0, jsx_runtime_1.jsx)("div", { ref: (node) => { ref.current = node; register(page, node); }, "data-page": page, className: "mx-auto overflow-hidden rounded-sm border border-border bg-card shadow-sm", style: { width: `${zoom}%`, maxWidth: zoom <= 100 ? '56rem' : undefined }, children: url ? (0, jsx_runtime_1.jsx)("img", { src: url, alt: `Página ${page}`, loading: "lazy", draggable: false, referrerPolicy: "no-referrer", crossOrigin: "anonymous", onContextMenu: ViewerControls_1.blockGesture, onDragStart: ViewerControls_1.blockGesture, className: "block h-auto w-full select-none" }) : (0, jsx_runtime_1.jsx)("div", { className: "aspect-[1/1.414] w-full animate-pulse bg-muted" }) }));
};
const PageRail = ({ source, current, placement, onPick }) => {
    const vertical = placement === 'side';
    return ((0, jsx_runtime_1.jsx)("ol", { className: (0, labels_1.cx)('flex gap-3', vertical ? 'flex-col items-center p-4' : 'snap-x overflow-x-auto px-4 pb-3', placement === 'bottom' && 'justify-center gap-8 pt-3'), children: Array.from({ length: source.pages }, (_, index) => index + 1).map((page) => ((0, jsx_runtime_1.jsxs)("li", { className: (0, labels_1.cx)('flex shrink-0 flex-col items-center gap-1', !vertical && 'snap-start'), children: [(0, jsx_runtime_1.jsx)(RailThumb, { page: page, active: page === current, url: source.urlOf(page), vertical: vertical, onVisible: () => source.ensurePage(page), onPick: () => onPick(page) }), (0, jsx_runtime_1.jsxs)("span", { className: (0, labels_1.cx)('flex items-center gap-1 text-xs tabular-nums', page === current ? 'font-semibold text-foreground' : 'text-muted-foreground'), children: [page === current && (0, jsx_runtime_1.jsx)("span", { className: "h-1.5 w-1.5 rounded-full bg-accent", "aria-hidden": "true" }), page] })] }, page))) }));
};
const RailThumb = ({ page, active, url, vertical, onVisible, onPick }) => {
    const ref = (0, react_1.useRef)(null);
    (0, ViewerControls_1.useVisible)(ref, onVisible);
    (0, react_1.useEffect)(() => { if (active)
        ref.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }, [active]);
    return ((0, jsx_runtime_1.jsx)("button", { ref: ref, type: "button", onClick: onPick, "aria-current": active ? 'page' : undefined, "aria-label": `Ir a la página ${page}`, className: (0, labels_1.cx)('aspect-[1/1.414] overflow-hidden rounded-sm border bg-card shadow-sm', vertical ? 'w-[120px]' : 'w-11', active ? 'border-foreground ring-2 ring-accent/40' : 'border-border'), children: url ? (0, jsx_runtime_1.jsx)("img", { src: url, alt: "", loading: "lazy", draggable: false, referrerPolicy: "no-referrer", crossOrigin: "anonymous", className: "h-full w-full select-none object-contain" }) : (0, jsx_runtime_1.jsx)("span", { className: "block h-full w-full animate-pulse bg-muted" }) }));
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
/** Reports the page state up (the top bar shows it on wide screens) with a stable `goTo`. */
const usePagerReport = (current, pages, goTo, onPager) => {
    const goToRef = (0, react_1.useRef)(goTo);
    goToRef.current = goTo;
    const stableGoTo = (0, react_1.useCallback)((page) => goToRef.current(page), []);
    (0, react_1.useEffect)(() => { onPager?.(pages > 0 ? { current, pages, goTo: stableGoTo } : null); }, [current, pages, stableGoTo, onPager]);
    (0, react_1.useEffect)(() => () => onPager?.(null), [onPager]);
    return stableGoTo;
};
/** «Miniaturas (12 páginas) · Pág. 3 activa» over the phone strip. */
const StripHeading = ({ labels, pages, current }) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between px-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground", children: [(0, jsx_runtime_1.jsx)("span", { children: labels.thumbnailsCount(pages) }), (0, jsx_runtime_1.jsx)("span", { className: "font-mono normal-case tracking-normal", children: labels.activePage(current) })] }));
/** Phone paginator: «‹ Anterior · PÁGINAS 3 / 12 · Siguiente ›». */
const PhonePaginator = ({ labels, current, pages, goTo }) => ((0, jsx_runtime_1.jsxs)("nav", { className: "flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-4 py-2 lg:hidden", "aria-label": labels.pagesLabel, children: [(0, jsx_runtime_1.jsxs)(ViewerControls_1.ViewerButton, { className: "h-12", disabled: current <= 1, onClick: () => goTo(current - 1), children: [(0, jsx_runtime_1.jsx)(icons_1.ChevronLeftIcon, {}), labels.previous] }), (0, jsx_runtime_1.jsxs)("p", { className: "flex flex-col items-center leading-tight", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground", children: labels.pagesLabel }), (0, jsx_runtime_1.jsxs)("span", { className: "text-base font-semibold tabular-nums text-foreground", children: [current, " / ", pages] })] }), (0, jsx_runtime_1.jsxs)(ViewerControls_1.ViewerButton, { className: "h-12 border-primary bg-primary text-primary-foreground", disabled: current >= pages, onClick: () => goTo(current + 1), children: [labels.next, (0, jsx_runtime_1.jsx)(icons_1.ChevronRightIcon, {})] })] }));
/**
 * A PDF (or an image) without download: watermarked page images, thumbnails, zoom, page n of N.
 * Thumbnails: a side column on desktop (`xl`), a strip at the bottom on tablet (`lg`), a strip on
 * top on the phone. The page field and zoom live in the top bar from `lg`, in their own row below.
 */
const PagedView = ({ loader, labels, zoom, onZoom, multiPage, onPager }) => {
    const main = (0, usePagedSource_1.usePagedSource)(loader, false);
    const thumbs = (0, usePagedSource_1.usePagedSource)(multiPage ? loader : undefined, true);
    const scrollRef = (0, react_1.useRef)(null);
    const pageRefs = (0, react_1.useRef)(new Map());
    const [current, setCurrent] = useCurrentPage(scrollRef, pageRefs);
    const register = (0, react_1.useCallback)((page, node) => (node ? pageRefs.current.set(page, node) : pageRefs.current.delete(page)), []);
    const goTo = usePagerReport(current, main.pages, (page) => { setCurrent(page); main.ensurePage(page); pageRefs.current.get(page)?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }); }, onPager);
    if (main.failed)
        return (0, jsx_runtime_1.jsx)(ViewerControls_1.NoPreview, { labels: labels });
    const showRail = main.pages > 1;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex min-h-0 flex-1 flex-col print:hidden", onContextMenu: ViewerControls_1.blockGesture, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2 lg:hidden", children: [main.pages > 0 ? (0, jsx_runtime_1.jsx)(ViewerControls_1.PageField, { pager: { current, pages: main.pages, goTo }, labels: labels }) : (0, jsx_runtime_1.jsx)("span", {}), (0, jsx_runtime_1.jsx)(ViewerControls_1.ZoomControls, { zoom: zoom, labels: labels, onZoom: onZoom })] }), showRail && (0, jsx_runtime_1.jsxs)("div", { className: "border-b border-border bg-card pt-3 lg:hidden", "aria-label": labels.thumbnails, children: [(0, jsx_runtime_1.jsx)(StripHeading, { labels: labels, pages: main.pages, current: current }), (0, jsx_runtime_1.jsx)(PageRail, { source: thumbs, current: current, placement: "top", onPick: goTo })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex min-h-0 flex-1", children: [showRail && ((0, jsx_runtime_1.jsxs)("aside", { className: "hidden w-[200px] shrink-0 overflow-y-auto border-r border-border bg-card xl:block", "aria-label": labels.thumbnails, children: [(0, jsx_runtime_1.jsxs)("p", { className: "flex items-center justify-between border-b border-border px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground", children: [(0, jsx_runtime_1.jsx)("span", { children: labels.thumbnails }), (0, jsx_runtime_1.jsx)("span", { className: "font-mono normal-case tracking-normal", children: labels.pagesShort(main.pages) })] }), (0, jsx_runtime_1.jsx)(PageRail, { source: thumbs, current: current, placement: "side", onPick: goTo })] })), (0, jsx_runtime_1.jsx)("div", { ref: scrollRef, className: "min-w-0 flex-1 overflow-auto bg-muted/40", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-4 p-4 sm:p-6 xl:p-8", children: [main.pages === 0 ? (0, jsx_runtime_1.jsx)("div", { className: "mx-auto aspect-[1/1.414] w-full max-w-4xl animate-pulse rounded-sm bg-muted" }) : Array.from({ length: main.pages }, (_, index) => index + 1).map((page) => ((0, jsx_runtime_1.jsx)(PageImage, { page: page, url: main.urlOf(page), zoom: zoom, onVisible: () => main.ensurePage(page), register: register }, page))), main.pages > 0 && (0, jsx_runtime_1.jsxs)("p", { className: "mx-auto flex max-w-md items-start gap-2 px-4 py-4 text-center text-sm text-muted-foreground", children: [(0, jsx_runtime_1.jsx)(icons_1.LockIcon, {}), labels.readOnly] })] }) })] }), showRail && (0, jsx_runtime_1.jsx)("div", { className: "hidden border-t border-border bg-card lg:block xl:hidden", "aria-label": labels.thumbnails, children: (0, jsx_runtime_1.jsx)(PageRail, { source: thumbs, current: current, placement: "bottom", onPick: goTo }) }), main.pages > 1 && (0, jsx_runtime_1.jsx)(PhonePaginator, { labels: labels, current: current, pages: main.pages, goTo: goTo })] }));
};
exports.PagedView = PagedView;
