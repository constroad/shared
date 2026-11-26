import { useEffect, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, FileTextIcon, FitIcon, ImageFileIcon, MinusIcon, PlusIcon, VideoFileIcon } from './icons';
import { ZOOM_STEPS, cx } from './labels';
import type { DriveViewerKind, DriveViewerLabels, DriveViewerPager } from './types';

/** Bar buttons: shadcn tokens, 44 px touch targets (Portal portal-premium-ui §2c; Stitch draws 32–38 px). */
export const VIEWER_BUTTON = 'inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-sm transition-[background-color,box-shadow] hover:shadow-md disabled:pointer-events-none disabled:opacity-40';

export const ViewerButton = ({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" className={cx(VIEWER_BUTTON, className)} {...props} />;

const KIND_ICONS: Partial<Record<DriveViewerKind, () => JSX.Element>> = { pdf: FileTextIcon, image: ImageFileIcon, video: VideoFileIcon };

const FileKindIcon = ({ kind }: { kind: DriveViewerKind }) => {
  const Icon = KIND_ICONS[kind] ?? FileTextIcon;
  return <span data-file-kind={kind} className="hidden shrink-0 text-muted-foreground lg:inline-flex"><Icon /></span>;
};

/** A 1 px divider of the desktop bar (Stitch dc02/dc03: after «Volver», after the logo, between page and zoom). */
export const BarDivider = ({ name, className = 'hidden xl:block' }: { name: string; className?: string }) => (
  <span data-bar-divider={name} className={cx('h-6 w-px shrink-0 bg-border', className)} aria-hidden="true" />
);

type ToolbarProps = { name: string; kind: DriveViewerKind; kicker?: string; badge?: ReactNode; logo?: ReactNode; labels: DriveViewerLabels; onClose: () => void; children?: ReactNode };

/**
 * The top bar: back, the company logo (desktop), what is open, then the tools. One bar from
 * `lg` (tablet landscape and desktop, Stitch dc02/dc03); on the phone the name wraps to two lines.
 * Between `lg` and `xl` the gaps, the page field and the zoom value are narrower, so the file
 * name keeps its width next to «Archivo n de N» without shrinking any 44 px target (dc02, 26/11/2026).
 */
export const ViewerToolbar = ({ name, kind, kicker, badge, logo, labels, onClose, children }: ToolbarProps) => (
  <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-2 py-2 shadow-sm sm:gap-3 sm:px-4 lg:gap-2 lg:px-3 xl:gap-3 xl:px-4">
    <button type="button" onClick={onClose} aria-label={labels.back}
      className="inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold text-foreground hover:bg-muted xl:border xl:border-border xl:bg-card xl:px-3 xl:shadow-sm">
      <ArrowLeftIcon />
      <span className="hidden xl:inline">{labels.back}</span>
    </button>
    <BarDivider name="back" />
    {logo && <span className="hidden shrink-0 items-center gap-3 xl:flex">{logo}<BarDivider name="logo" /></span>}
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <FileKindIcon kind={kind} />
      <div className="min-w-0">
        {kicker && <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{kicker}</p>}
        <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-foreground lg:line-clamp-1" title={name}>{name}</p>
      </div>
      {badge}
    </div>
    {children}
  </header>
);

const FIT_BUTTON = 'inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 text-sm font-semibold text-foreground shadow-sm transition-[background-color,box-shadow] hover:shadow-md lg:gap-2 xl:px-3';

const zoomStep = (zoom: number, delta: -1 | 1): number => {
  const index = ZOOM_STEPS.indexOf(zoom as (typeof ZOOM_STEPS)[number]);
  return ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, index + delta))];
};

/**
 * «− 100 % +» in one muted group with a 1 px border (Stitch dc02), then «Ajustar al ancho» from `xl` and «Ajustar»
 * below. Compact under `lg` so the phone row fits 390 px with its 44 px targets (Portal portal-premium-ui §2c).
 * The group clips its buttons: at a 90 % zoom «+» overflowed by a pixel and hid the right border (dc02, 26/11/2026).
 */
export const ZoomControls = ({ zoom, labels, onZoom }: { zoom: number; labels: DriveViewerLabels; onZoom: (zoom: number) => void }) => {
  const index = ZOOM_STEPS.indexOf(zoom as (typeof ZOOM_STEPS)[number]);
  return (
    <div className="flex shrink-0 items-center gap-1.5 lg:gap-2">
      <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-foreground/15 bg-muted">
        <button type="button" className="flex h-11 w-11 items-center justify-center bg-transparent text-foreground disabled:opacity-40" aria-label={labels.zoomOut} disabled={index <= 0} onClick={() => onZoom(zoomStep(zoom, -1))}><MinusIcon /></button>
        <span className="w-12 text-center font-mono text-[11px] font-semibold leading-[44px] tabular-nums text-foreground lg:text-xs xl:w-14">{zoom} %</span>
        <button type="button" className="flex h-11 w-11 items-center justify-center bg-transparent text-foreground disabled:opacity-40" aria-label={labels.zoomIn} disabled={index >= ZOOM_STEPS.length - 1} onClick={() => onZoom(zoomStep(zoom, 1))}><PlusIcon /></button>
      </div>
      <button type="button" onClick={() => onZoom(100)} aria-label={labels.fit} className={FIT_BUTTON}>
        <FitIcon />
        <span className="text-[10px] font-bold uppercase tracking-tight lg:text-sm lg:font-semibold lg:normal-case lg:tracking-normal xl:hidden">{labels.fitShort}</span>
        <span className="hidden xl:inline">{labels.fit}</span>
      </button>
    </div>
  );
};

/** «Página [3] de 12»: the field takes a page number; Enter or leaving it jumps, out of range it goes back. */
export const PageField = ({ pager, labels }: { pager: DriveViewerPager; labels: DriveViewerLabels }) => {
  const [typed, setTyped] = useState(String(pager.current));
  useEffect(() => setTyped(String(pager.current)), [pager.current]);
  const commit = () => {
    const page = Number(typed);
    if (Number.isInteger(page) && page >= 1 && page <= pager.pages && page !== pager.current) pager.goTo(page);
    else setTyped(String(pager.current));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter') commit(); };
  return (
    <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground lg:gap-2 lg:text-sm">
      <span>{labels.pageField}</span>
      <input type="number" inputMode="numeric" min={1} max={pager.pages} value={typed} aria-label={labels.pageField}
        onChange={(event) => setTyped(event.target.value)} onBlur={commit} onKeyDown={onKeyDown}
        className="h-11 w-10 rounded-md border border-border bg-background text-center font-mono text-sm font-semibold tabular-nums text-foreground xl:w-12 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
      <span className="font-semibold tabular-nums text-foreground">{labels.pageOf(pager.pages)}</span>
    </label>
  );
};

type FileNavProps = { index: number; total: number; labels: DriveViewerLabels; onStep: (step: -1 | 1) => void; className?: string };

/** «‹ Archivo 3 de 12 ›»: the files of the folder, one after the other (never the pages). */
export const FileNavigator = ({ index, total, labels, onStep, className }: FileNavProps) =>
  total < 2 ? null : (
    <nav className={cx('shrink-0 items-center gap-1', className)} aria-label={labels.files}>
      <button type="button" className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40" aria-label={labels.previousFile} disabled={index <= 0} onClick={() => onStep(-1)}><ChevronLeftIcon /></button>
      <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-muted-foreground">{labels.fileCounter(index + 1, total)}</span>
      <button type="button" className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40" aria-label={labels.nextFile} disabled={index >= total - 1} onClick={() => onStep(1)}><ChevronRightIcon /></button>
    </nav>
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
