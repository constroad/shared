import type { DriveViewerLabels, DriveViewerPager, DriveViewerPagesLoader } from './types';
type PagedViewProps = {
    loader: DriveViewerPagesLoader;
    labels: DriveViewerLabels;
    zoom: number;
    onZoom: (zoom: number) => void;
    multiPage: boolean;
    onPager?: (pager: DriveViewerPager | null) => void;
};
/**
 * A PDF (or an image) without download: watermarked page images, thumbnails, zoom, page n of N.
 * Thumbnails: a side column on desktop (`xl`), a strip at the bottom on tablet (`lg`), a strip on
 * top on the phone. The page field and zoom live in the top bar from `lg`, in their own row below.
 */
export declare const PagedView: ({ loader, labels, zoom, onZoom, multiPage, onPager }: PagedViewProps) => import("react").JSX.Element;
export {};
