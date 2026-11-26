import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { DriveViewerKind, DriveViewerLabels, DriveViewerPager } from './types';
/** Bar buttons: shadcn tokens, 44 px touch targets (Portal portal-premium-ui §2c; Stitch draws 32–38 px). */
export declare const VIEWER_BUTTON = "inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-sm transition-[background-color,box-shadow] hover:shadow-md disabled:pointer-events-none disabled:opacity-40";
export declare const ViewerButton: ({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => import("react").JSX.Element;
/** A 1 px divider of the desktop bar (Stitch dc02/dc03: after «Volver», after the logo, between page and zoom). */
export declare const BarDivider: ({ name, className }: {
    name: string;
    className?: string;
}) => import("react").JSX.Element;
type ToolbarProps = {
    name: string;
    kind: DriveViewerKind;
    kicker?: string;
    badge?: ReactNode;
    logo?: ReactNode;
    labels: DriveViewerLabels;
    onClose: () => void;
    children?: ReactNode;
};
/**
 * The top bar: back, the company logo (desktop), what is open, then the tools. One bar from
 * `lg` (tablet landscape and desktop, Stitch dc02/dc03); on the phone the name wraps to two lines.
 */
export declare const ViewerToolbar: ({ name, kind, kicker, badge, logo, labels, onClose, children }: ToolbarProps) => import("react").JSX.Element;
/**
 * «− 100 % +» in one muted group with a 1 px border (Stitch dc02), then «Ajustar al ancho» from `xl` and «Ajustar»
 * below. Compact under `lg` so the phone row fits 390 px with its 44 px targets (Portal portal-premium-ui §2c).
 */
export declare const ZoomControls: ({ zoom, labels, onZoom }: {
    zoom: number;
    labels: DriveViewerLabels;
    onZoom: (zoom: number) => void;
}) => import("react").JSX.Element;
/** «Página [3] de 12»: the field takes a page number; Enter or leaving it jumps, out of range it goes back. */
export declare const PageField: ({ pager, labels }: {
    pager: DriveViewerPager;
    labels: DriveViewerLabels;
}) => import("react").JSX.Element;
type FileNavProps = {
    index: number;
    total: number;
    labels: DriveViewerLabels;
    onStep: (step: -1 | 1) => void;
    className?: string;
};
/** «‹ Archivo 3 de 12 ›»: the files of the folder, one after the other (never the pages). */
export declare const FileNavigator: ({ index, total, labels, onStep, className }: FileNavProps) => import("react").JSX.Element | null;
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
