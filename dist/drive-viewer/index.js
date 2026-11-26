"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewerButton = exports.VIEWER_BUTTON = exports.formatFileSize = exports.DEFAULT_LABELS = exports.DriveViewer = void 0;
/**
 * Drive viewer (José, 25/11/2026): Portal's public link, Portal's intranet and Inframaq.
 * Self-contained: React (+ react-dom for the portal) and Tailwind classes with shadcn token
 * names only. The app's Tailwind must scan `dist/drive-viewer` (README).
 */
var DriveViewer_1 = require("./DriveViewer");
Object.defineProperty(exports, "DriveViewer", { enumerable: true, get: function () { return DriveViewer_1.DriveViewer; } });
var labels_1 = require("./labels");
Object.defineProperty(exports, "DEFAULT_LABELS", { enumerable: true, get: function () { return labels_1.DEFAULT_LABELS; } });
Object.defineProperty(exports, "formatFileSize", { enumerable: true, get: function () { return labels_1.formatFileSize; } });
var ViewerControls_1 = require("./ViewerControls");
Object.defineProperty(exports, "VIEWER_BUTTON", { enumerable: true, get: function () { return ViewerControls_1.VIEWER_BUTTON; } });
Object.defineProperty(exports, "ViewerButton", { enumerable: true, get: function () { return ViewerControls_1.ViewerButton; } });
