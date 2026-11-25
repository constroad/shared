import { useCallback, useEffect, useRef, useState } from 'react';
import type { DriveViewerPagesLoader, DriveViewerPageWindow } from './types';

/** Page URLs signed per window (lila's PAGE_URLS_PER_REQUEST). */
export const PAGE_WINDOW = 20;
/** Ask again this long before a window's URLs expire. */
const RENEW_MARGIN_MS = 30_000;

type StoredWindow = { urls: Map<number, string>; expiresAt: number };
export type PagedSource = { pages: number; failed: boolean; urlOf: (page: number) => string | undefined; ensurePage: (page: number) => void };

const windowStart = (page: number): number => Math.floor((page - 1) / PAGE_WINDOW) * PAGE_WINDOW + 1;

const toStored = (window: DriveViewerPageWindow): StoredWindow => ({
  urls: new Map(window.urls.map((url, index) => [window.from + index, url])),
  expiresAt: Date.parse(window.expiresAt),
});

/**
 * Signed page images by windows, renewed before they expire. Nothing polls:
 * a window is asked for only when the viewer reaches a page without a live URL.
 */
export const usePagedSource = (loader: DriveViewerPagesLoader | undefined, thumbs: boolean): PagedSource => {
  const [pages, setPages] = useState(0);
  const [failed, setFailed] = useState(false);
  const [windows, setWindows] = useState<Map<number, StoredWindow>>(new Map());
  const pending = useRef(new Set<number>());

  const load = useCallback((from: number) => {
    if (!loader || pending.current.has(from)) return;
    pending.current.add(from);
    loader(from, { thumbs })
      .then((window) => {
        setPages(window.pages);
        setWindows((current) => new Map(current).set(from, toStored(window)));
      })
      .catch(() => setFailed(true))
      .finally(() => pending.current.delete(from));
  }, [loader, thumbs]);

  useEffect(() => {
    setPages(0);
    setFailed(false);
    setWindows(new Map());
    load(1);
  }, [load]);

  const ensurePage = useCallback((page: number) => {
    const current = windows.get(windowStart(page));
    if (!current || current.expiresAt - RENEW_MARGIN_MS < Date.now()) load(windowStart(page));
  }, [load, windows]);

  const urlOf = useCallback((page: number) => windows.get(windowStart(page))?.urls.get(page), [windows]);
  return { pages, failed, urlOf, ensurePage };
};
