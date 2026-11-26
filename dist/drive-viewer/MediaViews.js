"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoView = exports.ImageView = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ViewerControls_1 = require("./ViewerControls");
/** An image: the original when it can be downloaded, the watermarked 1600 px derivative otherwise. */
const ImageView = ({ item, labels, zoom, onZoom }) => {
    const [src, setSrc] = (0, react_1.useState)(item.canDownload ? item.src : undefined);
    const [failed, setFailed] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        setFailed(false);
        if (item.canDownload)
            return setSrc(item.src);
        setSrc(undefined);
        item.loadPages?.(1, { thumbs: false }).then((window) => setSrc(window.urls[0])).catch(() => setFailed(true));
    }, [item]);
    if (failed || (item.canDownload && !item.src))
        return (0, jsx_runtime_1.jsx)(ViewerControls_1.NoPreview, { labels: labels });
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex min-h-0 flex-1 flex-col", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex justify-end border-b border-border bg-card px-4 py-2 lg:hidden", children: (0, jsx_runtime_1.jsx)(ViewerControls_1.ZoomControls, { zoom: zoom, labels: labels, onZoom: onZoom }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex min-h-0 flex-1 items-center justify-center overflow-auto p-4", children: src ? ((0, jsx_runtime_1.jsx)("img", { src: src, alt: item.name, draggable: false, referrerPolicy: "no-referrer", crossOrigin: item.canDownload ? undefined : 'anonymous', onContextMenu: item.canDownload ? undefined : ViewerControls_1.blockGesture, className: "max-w-none select-none rounded-lg shadow-sm", style: { width: zoom === 100 ? 'auto' : `${zoom}%`, maxHeight: zoom === 100 ? '100%' : undefined, maxWidth: zoom === 100 ? '100%' : undefined } })) : (0, jsx_runtime_1.jsx)("div", { className: "aspect-[4/3] w-full max-w-3xl animate-pulse rounded-lg bg-muted" }) })] }));
};
exports.ImageView = ImageView;
/** The watermark over a protected video: the same text lila stamps on pages, tiled. */
/** Enough repeats to tile twice the player (the rotated grid is `-inset-1/2`) on a wide screen. */
const WATERMARK_REPEATS = 240;
const WatermarkLayer = ({ text }) => ((0, jsx_runtime_1.jsx)("div", { className: "pointer-events-none absolute inset-0 overflow-hidden select-none", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("div", { className: "absolute -inset-1/2 flex rotate-[-24deg] flex-wrap content-start gap-x-16 gap-y-12 opacity-30", children: Array.from({ length: WATERMARK_REPEATS }, (_, index) => (0, jsx_runtime_1.jsx)("span", { className: "whitespace-nowrap text-sm font-semibold text-white [text-shadow:0_0_2px_rgba(0,0,0,0.8)]", children: text }, index)) }) }));
/** A short-lived stream, asked again when it expires mid-playback (Range requests then fail). */
const useProtectedStream = (item) => {
    const [stream, setStream] = (0, react_1.useState)(null);
    const [failed, setFailed] = (0, react_1.useState)(false);
    const load = (0, react_1.useCallback)(() => { item.loadStream?.().then(setStream).catch(() => setFailed(true)); }, [item]);
    (0, react_1.useEffect)(() => { setStream(null); setFailed(false); if (!item.canDownload)
        load(); }, [item, load]);
    return { stream, failed, reload: load };
};
/** A video: the original with download; without it, a signed stream that only makes downloading harder. */
const VideoView = ({ item, labels }) => {
    const video = (0, react_1.useRef)(null);
    const resumeAt = (0, react_1.useRef)(0);
    const { stream, failed, reload } = useProtectedStream(item);
    const src = item.canDownload ? item.src : stream?.url;
    const onError = () => { resumeAt.current = video.current?.currentTime ?? 0; if (!item.canDownload)
        reload(); };
    const onLoaded = () => { if (video.current && resumeAt.current)
        video.current.currentTime = resumeAt.current; };
    if (failed || (item.canDownload && !item.src))
        return (0, jsx_runtime_1.jsx)(ViewerControls_1.NoPreview, { labels: labels });
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-auto bg-background p-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "relative w-full max-w-5xl overflow-hidden rounded-lg bg-black shadow-sm", onContextMenu: item.canDownload ? undefined : ViewerControls_1.blockGesture, children: [src ? ((0, jsx_runtime_1.jsx)("video", { ref: video, src: src, controls: true, playsInline: true, preload: "metadata", className: "block max-h-[75vh] w-full", onError: onError, onLoadedMetadata: onLoaded, ...(item.canDownload ? {} : { controlsList: 'nodownload noremoteplayback', disablePictureInPicture: true, disableRemotePlayback: true }) })) : (0, jsx_runtime_1.jsx)("div", { className: "aspect-video w-full animate-pulse bg-muted" }), !item.canDownload && stream && (0, jsx_runtime_1.jsx)(WatermarkLayer, { text: stream.watermark })] }), !item.canDownload && (0, jsx_runtime_1.jsx)("p", { className: "text-center text-sm text-muted-foreground", children: labels.videoNotice })] }));
};
exports.VideoView = VideoView;
