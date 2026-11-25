import type { ShareTokenScope } from './types';

/**
 * Limits of the page renderer, shared by lila and Inframaq (both run on the
 * 8 GB mini next to every other service; Inframaq's request of 25/11/2026).
 */

/** pdf.js scale: 1 = 72 dpi. 2 ≈ 144 dpi on A4, enough to read a plan. */
export const MIN_PAGE_SCALE = 0.5;
export const MAX_PAGE_SCALE = 2;
export const DEFAULT_PAGE_SCALE = 1.5;
/** Pages beyond this one are never rendered, whatever the document has. */
export const MAX_PAGES_PER_DOCUMENT = 300;
/** Renders running at the same time per process. */
export const MAX_CONCURRENT_RENDERS = 2;
/** Renders waiting for a slot; one more is refused with 429 right away. */
export const MAX_QUEUED_RENDERS = 8;
/** How long a render waits for a slot before giving up with 429. */
export const RENDER_QUEUE_WAIT_MS = 4000;
/** `Retry-After` of that 429. */
export const RENDER_BUSY_RETRY_AFTER_SECONDS = 2;
/** A rasterized page not served for this long is purged from the disk cache. */
export const PAGE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Disk cache ceiling: above it the least recently served pages go first. */
export const PAGE_CACHE_MAX_BYTES = 1024 * 1024 * 1024;
/** Longest side of the derivative shown for an image without download. */
export const IMAGE_PREVIEW_MAX_PX = 1600;
/** Page URLs signed per request of the page list (the viewer asks for the next window). */
export const PAGE_URLS_PER_REQUEST = 20;

/** Lifetime each scope is signed with by default, in seconds. */
export const SHARE_TOKEN_TTL_SECONDS: Record<ShareTokenScope, number> = {
  'drive-share-page': 300,
  'drive-share-download': 120,
  'drive-share-file': 900,
};

/** Longest lifetime a verifier accepts per scope: a longer token is refused even if signed. */
export const SHARE_TOKEN_MAX_TTL_SECONDS: Record<ShareTokenScope, number> = {
  'drive-share-page': 600,
  'drive-share-download': 300,
  'drive-share-file': 3600,
};

/** Tolerated difference between the signer's clock (Vercel) and the verifier's (the mini). */
export const SHARE_TOKEN_CLOCK_SKEW_SECONDS = 30;

export function clampPageScale(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_PAGE_SCALE;
  return Math.min(MAX_PAGE_SCALE, Math.max(MIN_PAGE_SCALE, value));
}

/** A whole page from 1, within the document (when known) and the cap. */
export function isRenderablePage(page: number, documentPages?: number): boolean {
  if (!Number.isInteger(page) || page < 1 || page > MAX_PAGES_PER_DOCUMENT) return false;
  return documentPages === undefined || page <= documentPages;
}
