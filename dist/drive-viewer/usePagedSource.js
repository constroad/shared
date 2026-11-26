"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePagedSource = exports.PAGE_WINDOW = void 0;
const react_1 = require("react");
/** Page URLs signed per window (lila's PAGE_URLS_PER_REQUEST). */
exports.PAGE_WINDOW = 20;
/** Ask again this long before a window's URLs expire. */
const RENEW_MARGIN_MS = 30000;
const windowStart = (page) => Math.floor((page - 1) / exports.PAGE_WINDOW) * exports.PAGE_WINDOW + 1;
const toStored = (window) => ({
    urls: new Map(window.urls.map((url, index) => [window.from + index, url])),
    expiresAt: Date.parse(window.expiresAt),
});
/**
 * Signed page images by windows, renewed before they expire. Nothing polls:
 * a window is asked for only when the viewer reaches a page without a live URL.
 */
const usePagedSource = (loader, thumbs) => {
    const [pages, setPages] = (0, react_1.useState)(0);
    const [failed, setFailed] = (0, react_1.useState)(false);
    const [windows, setWindows] = (0, react_1.useState)(new Map());
    const pending = (0, react_1.useRef)(new Set());
    const load = (0, react_1.useCallback)((from) => {
        if (!loader || pending.current.has(from))
            return;
        pending.current.add(from);
        loader(from, { thumbs })
            .then((window) => {
            setPages(window.pages);
            setWindows((current) => new Map(current).set(from, toStored(window)));
        })
            .catch(() => setFailed(true))
            .finally(() => pending.current.delete(from));
    }, [loader, thumbs]);
    (0, react_1.useEffect)(() => {
        setPages(0);
        setFailed(false);
        setWindows(new Map());
        load(1);
    }, [load]);
    const ensurePage = (0, react_1.useCallback)((page) => {
        const current = windows.get(windowStart(page));
        if (!current || current.expiresAt - RENEW_MARGIN_MS < Date.now())
            load(windowStart(page));
    }, [load, windows]);
    const urlOf = (0, react_1.useCallback)((page) => windows.get(windowStart(page))?.urls.get(page), [windows]);
    return { pages, failed, urlOf, ensurePage };
};
exports.usePagedSource = usePagedSource;
