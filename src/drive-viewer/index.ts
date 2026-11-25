/**
 * Drive viewer (José, 25/11/2026): Portal's public link, Portal's intranet and Inframaq.
 * Self-contained: React (+ react-dom for the portal) and Tailwind classes with shadcn token
 * names only. The app's Tailwind must scan `dist/drive-viewer` (README).
 */
export { DriveViewer } from './DriveViewer';
export { DEFAULT_LABELS } from './labels';
export { VIEWER_BUTTON, ViewerButton } from './ViewerControls';
export type { DriveViewerItem, DriveViewerKind, DriveViewerLabels, DriveViewerPageWindow, DriveViewerPagesLoader, DriveViewerProps, DriveViewerProtectedStream } from './types';
