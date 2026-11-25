import type { ReactNode } from 'react';
/**
 * The Drive viewer shared by Portal (public link and intranet) and Inframaq.
 * Self-contained on purpose: React and Tailwind classes with shadcn token
 * names only, no app import, so it can move to `@constroad/shared/drive-viewer`.
 */
export type DriveViewerKind = 'pdf' | 'image' | 'video' | 'none';
/** A window of page images (the share contract of lila: 5-minute signed URLs). */
export interface DriveViewerPageWindow {
    pages: number;
    from: number;
    urls: string[];
    /** ISO instant at which the URLs stop working. */
    expiresAt: string;
}
/** Where the page images of a document come from (`thumbs` asks for light ones). */
export type DriveViewerPagesLoader = (from: number, options: {
    thumbs: boolean;
}) => Promise<DriveViewerPageWindow>;
/** A video that must not be downloaded: a short-lived stream and the watermark to lay over it. */
export interface DriveViewerProtectedStream {
    url: string;
    watermark: string;
}
export interface DriveViewerItem {
    id: string;
    name: string;
    kind: DriveViewerKind;
    /** The original may be downloaded: it is shown as is, with the item's actions. */
    canDownload: boolean;
    /** The original (or a signed URL of it) when `canDownload`. */
    src?: string;
    /** Without download, a PDF or an image is shown as watermarked page images. */
    loadPages?: DriveViewerPagesLoader;
    /** Without download, a video plays from a short-lived stream under a watermark. */
    loadStream?: () => Promise<DriveViewerProtectedStream>;
    /** Small text above the name (the folder). */
    kicker?: string;
}
export interface DriveViewerProps {
    items: DriveViewerItem[];
    /** Id of the item open; `null` closes the viewer. */
    currentId: string | null;
    onNavigate: (id: string) => void;
    onClose: () => void;
    /** Buttons of the top bar for the open item (download, print…), app-specific. */
    renderActions?: (item: DriveViewerItem) => ReactNode;
    /** A downloadable PDF in the app's own pdf.js viewer; without it, an iframe. */
    renderPdf?: (item: DriveViewerItem) => ReactNode;
    /** Badge next to the name (e.g. «Solo lectura»). */
    renderBadge?: (item: DriveViewerItem) => ReactNode;
    /** Copy, in the app's language. */
    labels?: Partial<DriveViewerLabels>;
    /**
     * Class of the wrapper the viewer is portaled into (on `document.body`), so the app's theme
     * tokens apply there too (Portal: `shadcn-surface` + `dark`). An ancestor with a transform would
     * otherwise trap the `fixed` overlay inside it.
     */
    surfaceClassName?: string;
}
export interface DriveViewerLabels {
    back: string;
    previous: string;
    next: string;
    zoomIn: string;
    zoomOut: string;
    fit: string;
    thumbnails: string;
    page: (page: number, pages: number) => string;
    fileCounter: (index: number, total: number) => string;
    noPreview: string;
    noPreviewDetail: string;
    readOnly: string;
    videoNotice: string;
}
