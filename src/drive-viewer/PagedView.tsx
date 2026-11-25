import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, LockIcon } from './icons';
import { cx } from './labels';
import { NoPreview, ViewerButton, ZoomControls, blockGesture, useVisible } from './ViewerControls';
import { usePagedSource, type PagedSource } from './usePagedSource';
import type { DriveViewerLabels, DriveViewerPagesLoader } from './types';

type PagedViewProps = { loader: DriveViewerPagesLoader; labels: DriveViewerLabels; zoom: number; onZoom: (zoom: number) => void; multiPage: boolean };

/**
 * Page images load in CORS mode (`crossOrigin`). lila answered `/api/drive/share/*` with
 * `Cross-Origin-Resource-Policy: same-origin` until 25/11/2026 (now `cross-origin`); a CORS <img>
 * works with both, so an app pointed at an older lila still shows its pages.
 */
const PageImage = ({ page, url, zoom, onVisible, register }: { page: number; url?: string; zoom: number; onVisible: () => void; register: (page: number, node: HTMLDivElement | null) => void }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useVisible(ref, onVisible);
  return (
    <div ref={(node) => { ref.current = node; register(page, node); }} data-page={page} className="mx-auto overflow-hidden rounded-lg border border-border bg-card shadow-sm" style={{ width: `${zoom}%`, maxWidth: zoom <= 100 ? '56rem' : undefined }}>
      {url ? <img src={url} alt={`Página ${page}`} loading="lazy" draggable={false} referrerPolicy="no-referrer" crossOrigin="anonymous" onContextMenu={blockGesture} onDragStart={blockGesture} className="block h-auto w-full select-none" /> : <div className="aspect-[1/1.414] w-full animate-pulse bg-muted" />}
    </div>
  );
};

const PageRail = ({ source, current, vertical, onPick }: { source: PagedSource; current: number; vertical: boolean; onPick: (page: number) => void }) => (
  <ol className={cx('flex gap-3', vertical ? 'flex-col p-4' : 'snap-x overflow-x-auto px-4 pb-3')}>
    {Array.from({ length: source.pages }, (_, index) => index + 1).map((page) => (
      <li key={page} className={cx('flex shrink-0 flex-col items-center gap-1', !vertical && 'snap-start')}>
        <RailThumb page={page} active={page === current} url={source.urlOf(page)} vertical={vertical} onVisible={() => source.ensurePage(page)} onPick={() => onPick(page)} />
        <span className={cx('text-xs tabular-nums', page === current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{page}</span>
      </li>
    ))}
  </ol>
);

const RailThumb = ({ page, active, url, vertical, onVisible, onPick }: { page: number; active: boolean; url?: string; vertical: boolean; onVisible: () => void; onPick: () => void }) => {
  const ref = useRef<HTMLButtonElement | null>(null);
  useVisible(ref, onVisible);
  useEffect(() => { if (active) ref.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }, [active]);
  return (
    <button ref={ref} type="button" onClick={onPick} aria-current={active ? 'page' : undefined} aria-label={`Ir a la página ${page}`} className={cx('aspect-[1/1.414] overflow-hidden rounded-md border bg-card shadow-sm', vertical ? 'w-36' : 'w-14', active ? 'border-foreground ring-2 ring-accent/40' : 'border-border')}>
      {url ? <img src={url} alt="" loading="lazy" draggable={false} referrerPolicy="no-referrer" crossOrigin="anonymous" className="h-full w-full select-none object-contain" /> : <span className="block h-full w-full animate-pulse bg-muted" />}
    </button>
  );
};

/** Which page sits at the top of the scroll area. */
const useCurrentPage = (scrollRef: RefObject<HTMLDivElement>, pageRefs: { current: Map<number, HTMLDivElement> }) => {
  const [current, setCurrent] = useState(1);
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).map((entry) => Number((entry.target as HTMLElement).dataset.page));
      if (visible.length) setCurrent(Math.min(...visible));
    }, { root, threshold: 0.5 });
    pageRefs.current.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  });
  return [current, setCurrent] as const;
};

/** A PDF (or an image) without download: watermarked page images, thumbnails, zoom, page n of N. */
export const PagedView = ({ loader, labels, zoom, onZoom, multiPage }: PagedViewProps) => {
  const main = usePagedSource(loader, false);
  const thumbs = usePagedSource(multiPage ? loader : undefined, true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const [current, setCurrent] = useCurrentPage(scrollRef, pageRefs);
  const register = useCallback((page: number, node: HTMLDivElement | null) => (node ? pageRefs.current.set(page, node) : pageRefs.current.delete(page)), []);
  const goTo = (page: number) => { setCurrent(page); main.ensurePage(page); pageRefs.current.get(page)?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }); };
  if (main.failed) return <NoPreview labels={labels} />;
  const showRail = main.pages > 1;
  return (
    <div className="flex min-h-0 flex-1 flex-col print:hidden" onContextMenu={blockGesture}>
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2">
        <p className="text-sm font-semibold tabular-nums text-foreground" aria-live="polite">{main.pages ? labels.page(current, main.pages) : ''}</p>
        <ZoomControls zoom={zoom} labels={labels} onZoom={onZoom} />
      </div>
      <div className="flex min-h-0 flex-1">
        {showRail && <aside className="hidden w-48 shrink-0 overflow-y-auto border-r border-border bg-card md:block" aria-label={labels.thumbnails}><PageRail source={thumbs} current={current} vertical onPick={goTo} /></aside>}
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-auto">
          {showRail && <div className="border-b border-border bg-card pt-3 md:hidden" aria-label={labels.thumbnails}><PageRail source={thumbs} current={current} vertical={false} onPick={goTo} /></div>}
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            {main.pages === 0 ? <div className="mx-auto aspect-[1/1.414] w-full max-w-4xl animate-pulse rounded-lg bg-muted" /> : Array.from({ length: main.pages }, (_, index) => index + 1).map((page) => (
              <PageImage key={page} page={page} url={main.urlOf(page)} zoom={zoom} onVisible={() => main.ensurePage(page)} register={register} />
            ))}
            {main.pages > 0 && <p className="mx-auto flex max-w-md items-start gap-2 px-4 py-4 text-center text-sm text-muted-foreground"><LockIcon />{labels.readOnly}</p>}
          </div>
        </div>
      </div>
      {main.pages > 1 && (
        <nav className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 md:hidden">
          <ViewerButton disabled={current <= 1} onClick={() => goTo(current - 1)}><ChevronLeftIcon />{labels.previous}</ViewerButton>
          <p className="text-base font-semibold tabular-nums text-foreground">{current} / {main.pages}</p>
          <ViewerButton className="bg-primary text-primary-foreground" disabled={current >= main.pages} onClick={() => goTo(current + 1)}>{labels.next}<ChevronRightIcon /></ViewerButton>
        </nav>
      )}
    </div>
  );
};
