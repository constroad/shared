import type { DriveViewerPagesLoader } from './types';
/** Page URLs signed per window (lila's PAGE_URLS_PER_REQUEST). */
export declare const PAGE_WINDOW = 20;
export type PagedSource = {
    pages: number;
    failed: boolean;
    urlOf: (page: number) => string | undefined;
    ensurePage: (page: number) => void;
};
/**
 * Signed page images by windows, renewed before they expire. Nothing polls:
 * a window is asked for only when the viewer reaches a page without a live URL.
 */
export declare const usePagedSource: (loader: DriveViewerPagesLoader | undefined, thumbs: boolean) => PagedSource;
