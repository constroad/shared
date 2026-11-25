import type { DriveViewerLabels, DriveViewerPagesLoader } from './types';
type PagedViewProps = {
    loader: DriveViewerPagesLoader;
    labels: DriveViewerLabels;
    zoom: number;
    onZoom: (zoom: number) => void;
    multiPage: boolean;
};
/** A PDF (or an image) without download: watermarked page images, thumbnails, zoom, page n of N. */
export declare const PagedView: ({ loader, labels, zoom, onZoom, multiPage }: PagedViewProps) => import("react").JSX.Element;
export {};
