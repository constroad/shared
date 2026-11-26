import type { DriveViewerItem, DriveViewerLabels } from './types';
type ViewerActionsProps = {
    item: DriveViewerItem;
    labels: DriveViewerLabels;
    onDownload?: (item: DriveViewerItem) => void;
    onPrint?: (item: DriveViewerItem) => void;
    /** `bar`: in the top bar (wide screens); `row`: its own full-width row under it (phone, Stitch dc03). */
    placement: 'bar' | 'row';
};
/** Whether the item gets «Imprimir» / «Descargar»: never without download (printing needs the original). */
export declare const actionsOf: (item: DriveViewerItem, handlers: Pick<ViewerActionsProps, "onDownload" | "onPrint">) => {
    print: boolean;
    download: boolean;
};
/** «Imprimir» and «Descargar PDF · 1,1 MB», as the link allows them. */
export declare const ViewerActions: ({ item, labels, onDownload, onPrint, placement }: ViewerActionsProps) => import("react").JSX.Element | null;
export {};
