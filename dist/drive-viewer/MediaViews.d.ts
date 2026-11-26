import type { DriveViewerItem, DriveViewerLabels } from './types';
/** An image: the original when it can be downloaded, the watermarked 1600 px derivative otherwise. */
export declare const ImageView: ({ item, labels, zoom, onZoom }: {
    item: DriveViewerItem;
    labels: DriveViewerLabels;
    zoom: number;
    onZoom: (zoom: number) => void;
}) => import("react").JSX.Element;
/** A video: the original with download; without it, a signed stream that only makes downloading harder. */
export declare const VideoView: ({ item, labels }: {
    item: DriveViewerItem;
    labels: DriveViewerLabels;
}) => import("react").JSX.Element;
