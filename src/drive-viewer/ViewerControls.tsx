import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, FitIcon, MinusIcon, PlusIcon } from './icons';
import { ZOOM_STEPS, cx } from './labels';
import type { DriveViewerLabels } from './types';

/** Bar buttons: shadcn tokens, 44 px touch targets. */
export const VIEWER_BUTTON = 'inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-sm transition-[background-color,box-shadow] hover:shadow-md disabled:pointer-events-none disabled:opacity-40';

export const ViewerButton = ({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" className={cx(VIEWER_BUTTON, className)} {...props} />;

type ToolbarProps = { name: string; kicker?: string; badge?: ReactNode; labels: DriveViewerLabels; onClose: () => void; children?: ReactNode };

/** Top bar: back (never compressed), what is open, then the item's controls. */
export const ViewerToolbar = ({ name, kicker, badge, labels, onClose, children }: ToolbarProps) => (
  <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-2 py-2 shadow-sm sm:gap-3 sm:px-4">
    <ViewerButton onClick={onClose} aria-label={labels.back}>
      <ArrowLeftIcon />
      <span className="hidden md:inline">{labels.back}</span>
    </ViewerButton>
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="min-w-0">
        {kicker && <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{kicker}</p>}
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
      </div>
      {badge}
    </div>
    {children}
  </header>
);

export const ZoomControls = ({ zoom, labels, onZoom }: { zoom: number; labels: DriveViewerLabels; onZoom: (zoom: number) => void }) => {
  const index = ZOOM_STEPS.indexOf(zoom as (typeof ZOOM_STEPS)[number]);
  return (
    <div className="flex shrink-0 items-center gap-1">
      <div className="flex items-center rounded-lg border border-border bg-card">
        <button type="button" className="flex h-10 w-10 items-center justify-center disabled:opacity-40" aria-label={labels.zoomOut} disabled={index <= 0} onClick={() => onZoom(ZOOM_STEPS[Math.max(0, index - 1)])}><MinusIcon /></button>
        <span className="w-14 text-center font-mono text-xs tabular-nums text-foreground">{zoom} %</span>
        <button type="button" className="flex h-10 w-10 items-center justify-center disabled:opacity-40" aria-label={labels.zoomIn} disabled={index >= ZOOM_STEPS.length - 1} onClick={() => onZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, index + 1)])}><PlusIcon /></button>
      </div>
      <ViewerButton onClick={() => onZoom(100)} aria-label={labels.fit}>
        <FitIcon />
        <span className="hidden lg:inline">{labels.fit}</span>
      </ViewerButton>
    </div>
  );
};

type FileNavProps = { index: number; total: number; labels: DriveViewerLabels; onStep: (step: -1 | 1) => void };

/** «‹ 3 de 12 ›»: the files of the folder, one after the other. */
export const FileNavigator = ({ index, total, labels, onStep }: FileNavProps) =>
  total < 2 ? null : (
    <div className="flex shrink-0 items-center gap-1" aria-label="Archivos">
      <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg disabled:opacity-40" aria-label={labels.previous} disabled={index <= 0} onClick={() => onStep(-1)}><ChevronLeftIcon /></button>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">{labels.fileCounter(index + 1, total)}</span>
      <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg disabled:opacity-40" aria-label={labels.next} disabled={index >= total - 1} onClick={() => onStep(1)}><ChevronRightIcon /></button>
    </div>
  );

/** Calls `onVisible` the first time the element nears the viewport. */
export function useVisible(ref: { current: Element | null }, onVisible: () => void): void {
  const callback = useRef(onVisible);
  callback.current = onVisible;
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      callback.current();
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && callback.current(), { rootMargin: '200px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
}

/** Blocks the courtesy gestures (save image, drag). Not a protection: the original never reached the browser. */
export const blockGesture = (event: { preventDefault: () => void }) => event.preventDefault();

export const NoPreview = ({ labels }: { labels: DriveViewerLabels }) => (
  <div className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-sm">
    <FileIcon2 />
    <p className="font-semibold text-foreground">{labels.noPreview}</p>
    <p className="text-sm">{labels.noPreviewDetail}</p>
  </div>
);

const FileIcon2 = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-8 w-8" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6" /></svg>;
