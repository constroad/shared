import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { DriveViewerLabels } from './types';
/** Bar buttons: shadcn tokens, 44 px touch targets. */
export declare const VIEWER_BUTTON = "inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-sm transition-[background-color,box-shadow] hover:shadow-md disabled:pointer-events-none disabled:opacity-40";
export declare const ViewerButton: ({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => import("react").JSX.Element;
type ToolbarProps = {
    name: string;
    kicker?: string;
    badge?: ReactNode;
    labels: DriveViewerLabels;
    onClose: () => void;
    children?: ReactNode;
};
/** Top bar: back (never compressed), what is open, then the item's controls. */
export declare const ViewerToolbar: ({ name, kicker, badge, labels, onClose, children }: ToolbarProps) => import("react").JSX.Element;
export declare const ZoomControls: ({ zoom, labels, onZoom }: {
    zoom: number;
    labels: DriveViewerLabels;
    onZoom: (zoom: number) => void;
}) => import("react").JSX.Element;
type FileNavProps = {
    index: number;
    total: number;
    labels: DriveViewerLabels;
    onStep: (step: -1 | 1) => void;
};
/** «‹ 3 de 12 ›»: the files of the folder, one after the other. */
export declare const FileNavigator: ({ index, total, labels, onStep }: FileNavProps) => import("react").JSX.Element | null;
/** Calls `onVisible` the first time the element nears the viewport. */
export declare function useVisible(ref: {
    current: Element | null;
}, onVisible: () => void): void;
/** Blocks the courtesy gestures (save image, drag). Not a protection: the original never reached the browser. */
export declare const blockGesture: (event: {
    preventDefault: () => void;
}) => void;
export declare const NoPreview: ({ labels }: {
    labels: DriveViewerLabels;
}) => import("react").JSX.Element;
export {};
