import type { DriveViewerProps } from './types';
/** The Drive viewer: one shell for PDF (pages or pdf.js), image and video, moving across the folder's files. */
export declare const DriveViewer: ({ items, currentId, onNavigate, onClose, renderActions, renderPdf, renderBadge, onDownload, onPrint, logo, labels: overrides, surfaceClassName }: DriveViewerProps) => import("react").ReactPortal | null;
