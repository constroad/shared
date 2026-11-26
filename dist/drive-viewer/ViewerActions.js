"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewerActions = exports.actionsOf = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const icons_1 = require("./icons");
const labels_1 = require("./labels");
const ViewerControls_1 = require("./ViewerControls");
/** Whether the item gets «Imprimir» / «Descargar»: never without download (printing needs the original). */
const actionsOf = (item, handlers) => ({
    print: Boolean(handlers.onPrint && item.canDownload && item.canPrint),
    download: Boolean((item.downloadHref || handlers.onDownload) && item.canDownload),
});
exports.actionsOf = actionsOf;
const downloadClass = 'border-primary bg-primary text-primary-foreground';
/** «Imprimir» and «Descargar PDF · 1,1 MB», as the link allows them. */
const ViewerActions = ({ item, labels, onDownload, onPrint, placement }) => {
    const shown = (0, exports.actionsOf)(item, { onDownload, onPrint });
    if (!shown.print && !shown.download)
        return null;
    const row = placement === 'row';
    const downloadText = labels.download(item.kind, (0, labels_1.formatFileSize)(item.sizeBytes));
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, labels_1.cx)('items-center gap-2', row ? 'flex border-b border-border bg-card px-4 py-2 lg:hidden' : 'hidden shrink-0 lg:flex'), children: [shown.print && ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: (0, labels_1.cx)(ViewerControls_1.VIEWER_BUTTON, row && 'shrink-0'), onClick: () => onPrint?.(item), "aria-label": labels.print, children: [(0, jsx_runtime_1.jsx)(icons_1.PrinterIcon, {}), labels.print] })), shown.download && (item.downloadHref ? ((0, jsx_runtime_1.jsxs)("a", { href: item.downloadHref, className: (0, labels_1.cx)(ViewerControls_1.VIEWER_BUTTON, downloadClass, row && 'min-w-0 flex-1'), "aria-label": downloadText, children: [(0, jsx_runtime_1.jsx)(icons_1.DownloadIcon, {}), (0, jsx_runtime_1.jsx)("span", { className: "truncate", children: downloadText })] })) : ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: (0, labels_1.cx)(ViewerControls_1.VIEWER_BUTTON, downloadClass, row && 'min-w-0 flex-1'), onClick: () => onDownload?.(item), "aria-label": downloadText, children: [(0, jsx_runtime_1.jsx)(icons_1.DownloadIcon, {}), (0, jsx_runtime_1.jsx)("span", { className: "truncate", children: downloadText })] })))] }));
};
exports.ViewerActions = ViewerActions;
