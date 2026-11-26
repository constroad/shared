import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, LockIcon } from './icons';
import { cx } from './labels';
import { NoPreview, PageField, ViewerButton, ZoomControls, blockGesture, useVisible } from './ViewerControls';
import { usePagedSource, type PagedSource } from './usePagedSource';
import type { DriveViewerLabels, DriveViewerPager, DriveViewerPagesLoader } from './types';

type PagedViewProps = { loader: DriveViewerPagesLoader; labels: DriveViewerLabels; zoom: number; onZoom: (zoom: number) => void; multiPage: boolean; onPager?: (pager: DriveViewerPager | null) => void };

/**
 * Page images load in CORS mode (`crossOrigin`). lila answered `/api/drive/share/*` with
 * `Cross-Origin-Resource-Policy: same-origin` until 25/11/2026 (now `cross-origin`); a CORS <img>
 * works with both, so an app pointed at an older lila still shows its pages.
 */
const PageImage = ({ page, url, zoom, onVisible, register }: { page: number; url?: string; zoom: number; onVisible: () => void; register: (page: number, node: HTMLDivElement | null) => void }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useVisible(ref, onVisible);
  return (
    <div ref={(node) => { ref.current = node; register(page, node); }} data-page={page} className="mx-auto overflow-hidden rounded-[4px] border border-border bg-card shadow-sm" style={{ width: `${zoom}%`, maxWidth: zoom <= 100 ? '56rem' : undefined }}>
      {url ? <img src={url} alt={`Página ${page}`} loading="lazy" draggable={false} referrerPolicy="no-referrer" crossOrigin="anonymous" onContextMenu={blockGesture} onDragStart={blockGesture} className="block h-auto w-full select-none" /> : <div className="aspect-[1/1.414] w-full animate-pulse bg-muted" />}
    </div>
  );
};

type RailPlacement = 'side' | 'bottom' | 'top';

const PageRail = ({ source, current, placement, onPick }: { source: PagedSource; current: number; placement: RailPlacement; onPick: (page: number) => void }) => {
  const vertical = placement === 'side';
  return (
    <ol className={cx('flex gap-3', vertical ? 'flex-col items-center p-4' : 'snap-x overflow-x-auto px-4 pb-3', placement === 'bottom' && 'justify-center gap-8 pt-3')}>
      {Array.from({ length: source.pages }, (_, index) => index + 1).map((page) => (
        <li key={page} className={cx('flex shrink-0 flex-col items-center gap-1', !vertical && 'snap-start')}>
          <RailThumb page={page} active={page === current} url={source.urlOf(page)} vertical={vertical} onVisible={() => source.ensurePage(page)} onPick={() => onPick(page)} />
          <span className={cx('flex items-center gap-1 text-xs tabular-nums', page === current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
            {page === current && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />}{page}
          </span>
        </li>
      ))}
    </ol>
  );
};

const RailThumb = ({ page, active, url, vertical, onVisible, onPick }: { page: number; active: boolean; url?: string; vertical: boolean; onVisible: () => void; onPick: () => void }) => {
  const ref = useRef<HTMLButtonElement | null>(null);
  useVisible(ref, onVisible);
  useEffect(() => { if (active) ref.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }, [active]);
  return (
    <button ref={ref} type="button" onClick={onPick} aria-current={active ? 'page' : undefined} aria-label={`Ir a la página ${page}`} className={cx('aspect-[1/1.414] overflow-hidden rounded-sm border bg-card shadow-sm', vertical ? 'w-[120px]' : 'w-11', active ? 'border-foreground ring-2 ring-accent/40' : 'border-border')}>
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

/** Reports the page state up (the top bar shows it on wide screens) with a stable `goTo`. */
const usePagerReport = (current: number, pages: number, goTo: (page: number) => void, onPager?: (pager: DriveViewerPager | null) => void) => {
  const goToRef = useRef(goTo);
  goToRef.current = goTo;
  const stableGoTo = useCallback((page: number) => goToRef.current(page), []);
  useEffect(() => { onPager?.(pages > 0 ? { current, pages, goTo: stableGoTo } : null); }, [current, pages, stableGoTo, onPager]);
  useEffect(() => () => onPager?.(null), [onPager]);
  return stableGoTo;
};

/** «Miniaturas (12 páginas) · Pág. 3 activa» over the phone strip. */
const StripHeading = ({ labels, pages, current }: { labels: DriveViewerLabels; pages: number; current: number }) => (
  <div className="flex items-center justify-between px-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
    <span>{labels.thumbnailsCount(pages)}</span><span className="font-mono normal-case tracking-normal">{labels.activePage(current)}</span>
  </div>
);

/** Phone paginator: «‹ Anterior · PÁGINAS 3 / 12 · Siguiente ›». */
const PhonePaginator = ({ labels, current, pages, goTo }: { labels: DriveViewerLabels; current: number; pages: number; goTo: (page: number) => void }) => (
  <nav className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-4 py-2 lg:hidden" aria-label={labels.pagesLabel}>
    <ViewerButton className="h-12" disabled={current <= 1} onClick={() => goTo(current - 1)}><ChevronLeftIcon />{labels.previous}</ViewerButton>
    <p className="flex flex-col items-center leading-tight"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{labels.pagesLabel}</span><span className="text-base font-semibold tabular-nums text-foreground">{current} / {pages}</span></p>
    <ViewerButton className="h-12 border-primary bg-primary text-primary-foreground" disabled={current >= pages} onClick={() => goTo(current + 1)}>{labels.next}<ChevronRightIcon /></ViewerButton>
  </nav>
);

/**
 * A PDF (or an image) without download: watermarked page images, thumbnails, zoom, page n of N.
 * Thumbnails: a side column on desktop (`xl`), a strip at the bottom on tablet (`lg`), a strip on
 * top on the phone. The page field and zoom live in the top bar from `lg`, in their own row below.
 */
export const PagedView = ({ loader, labels, zoom, onZoom, multiPage, onPager }: PagedViewProps) => {
  const main = usePagedSource(loader, false);
  const thumbs = usePagedSource(multiPage ? loader : undefined, true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const [current, setCurrent] = useCurrentPage(scrollRef, pageRefs);
  const register = useCallback((page: number, node: HTMLDivElement | null) => (node ? pageRefs.current.set(page, node) : pageRefs.current.delete(page)), []);
  const goTo = usePagerReport(current, main.pages, (page: number) => { setCurrent(page); main.ensurePage(page); pageRefs.current.get(page)?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }); }, onPager);
  if (main.failed) return <NoPreview labels={labels} />;
  const showRail = main.pages > 1;
  return (
    <div className="flex min-h-0 flex-1 flex-col print:hidden" onContextMenu={blockGesture}>
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-3 py-2 sm:px-4 lg:hidden">
        {main.pages > 0 ? <PageField pager={{ current, pages: main.pages, goTo }} labels={labels} /> : <span />}
        <ZoomControls zoom={zoom} labels={labels} onZoom={onZoom} />
      </div>
      {showRail && <div className="border-b border-border bg-card pt-3 lg:hidden" aria-label={labels.thumbnails}><StripHeading labels={labels} pages={main.pages} current={current} /><PageRail source={thumbs} current={current} placement="top" onPick={goTo} /></div>}
      <div className="flex min-h-0 flex-1">
        {showRail && (
          <aside className="hidden w-[200px] shrink-0 overflow-y-auto border-r border-border bg-card xl:block" aria-label={labels.thumbnails}>
            <p className="flex items-center justify-between border-b border-border px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><span>{labels.thumbnails}</span><span className="font-mono normal-case tracking-normal">{labels.pagesShort(main.pages)}</span></p>
            <PageRail source={thumbs} current={current} placement="side" onPick={goTo} />
          </aside>
        )}
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-auto bg-muted/40">
          <div className="flex flex-col gap-4 p-4 sm:p-6 xl:p-8">
            {main.pages === 0 ? <div className="mx-auto aspect-[1/1.414] w-full max-w-4xl animate-pulse rounded-sm bg-muted" /> : Array.from({ length: main.pages }, (_, index) => index + 1).map((page) => (
              <PageImage key={page} page={page} url={main.urlOf(page)} zoom={zoom} onVisible={() => main.ensurePage(page)} register={register} />
            ))}
            {main.pages > 0 && <p className="mx-auto flex max-w-md items-start gap-2 px-4 py-4 text-center text-sm text-muted-foreground"><LockIcon />{labels.readOnly}</p>}
          </div>
        </div>
      </div>
      {showRail && <div className="hidden border-t border-border bg-card lg:block xl:hidden" aria-label={labels.thumbnails}><PageRail source={thumbs} current={current} placement="bottom" onPick={goTo} /></div>}
      {main.pages > 1 && <PhonePaginator labels={labels} current={current} pages={main.pages} goTo={goTo} />}
    </div>
  );
};
