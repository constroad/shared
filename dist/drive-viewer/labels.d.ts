import type { DriveViewerLabels } from './types';
/** Neutral Spanish copy; an app may override any of it through `labels`. */
export declare const DEFAULT_LABELS: DriveViewerLabels;
/** «1,1 MB» (comma decimal); empty for a missing or zero size. */
export declare const formatFileSize: (bytes?: number) => string;
export declare const ZOOM_STEPS: readonly [50, 75, 100, 125, 150, 200];
export declare const cx: (...classes: Array<string | false | null | undefined>) => string;
