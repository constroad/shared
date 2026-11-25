import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_LABELS } from './labels';
import { FileNavigator, NoPreview, ViewerToolbar } from './ViewerControls';
import { ImageView, VideoView } from './MediaViews';
import { PagedView } from './PagedView';
import type { DriveViewerItem, DriveViewerLabels, DriveViewerProps } from './types';

/** A horizontal swipe longer than this moves to the next or previous file. */
const SWIPE_MIN_PX = 60;

const useFileKeys = (enabled: boolean, onStep: (step: -1 | 1) => void, onClose: () => void) => {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') onStep(1);
      if (event.key === 'ArrowLeft') onStep(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, onStep, onClose]);
};

const useSwipe = (onStep: (step: -1 | 1) => void) => {
  const start = useRef<number | null>(null);
  return {
    onTouchStart: (event: TouchEvent) => { start.current = event.touches.length === 1 ? event.touches[0].clientX : null; },
    onTouchEnd: (event: TouchEvent) => {
      if (start.current === null) return;
      const delta = event.changedTouches[0].clientX - start.current;
      start.current = null;
      if (Math.abs(delta) >= SWIPE_MIN_PX) onStep(delta < 0 ? 1 : -1);
    },
  };
};

const ViewerBody = ({ item, labels, zoom, onZoom, renderPdf }: { item: DriveViewerItem; labels: DriveViewerLabels; zoom: number; onZoom: (zoom: number) => void; renderPdf?: (item: DriveViewerItem) => ReactNode }) => {
  if (item.kind === 'video') return <VideoView item={item} labels={labels} />;
  if (item.kind === 'image') return <ImageView item={item} labels={labels} zoom={zoom} onZoom={onZoom} />;
  if (item.kind !== 'pdf') return <NoPreview labels={labels} />;
  if (!item.canDownload && item.loadPages) return <PagedView key={item.id} loader={item.loadPages} labels={labels} zoom={zoom} onZoom={onZoom} multiPage />;
  if (renderPdf) return <>{renderPdf(item)}</>;
  return item.src ? <iframe src={item.src} title={item.name} className="min-h-0 w-full flex-1 border-0" /> : <NoPreview labels={labels} />;
};

/** The Drive viewer: one shell for PDF (pages or pdf.js), image and video, moving across the folder's files. */
export const DriveViewer = ({ items, currentId, onNavigate, onClose, renderActions, renderPdf, renderBadge, labels: overrides, surfaceClassName }: DriveViewerProps) => {
  const labels = { ...DEFAULT_LABELS, ...overrides };
  const index = items.findIndex((item) => item.id === currentId);
  const item = index >= 0 ? items[index] : null;
  const [zoom, setZoom] = useState(100);
  const step = (delta: -1 | 1) => {
    const next = items[index + delta];
    if (next) { setZoom(100); onNavigate(next.id); }
  };
  useFileKeys(Boolean(item), step, onClose);
  const swipe = useSwipe(step);
  if (!item || typeof document === 'undefined') return null;
  // Portaled to <body>: an ancestor with a transform would trap the fixed overlay inside it.
  return createPortal(
    <div className={surfaceClassName}>
      <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-modal="true" aria-label={item.name}>
        <ViewerToolbar name={item.name} kicker={item.kicker} badge={renderBadge?.(item)} labels={labels} onClose={onClose}>
          <FileNavigator index={index} total={items.length} labels={labels} onStep={step} />
          {renderActions?.(item)}
        </ViewerToolbar>
        <div className="flex min-h-0 flex-1 flex-col" {...swipe}>
          <ViewerBody key={item.id} item={item} labels={labels} zoom={zoom} onZoom={setZoom} renderPdf={renderPdf} />
        </div>
      </div>
    </div>,
    document.body,
  );
};
