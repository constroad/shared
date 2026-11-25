import { MAX_PAGES_PER_DOCUMENT } from './limits';
import type { SharePreviewKind, ShareLinkPolicy, SharedFileAccess, SharedFileRef } from './types';

/**
 * The download rule, in one place for Portal, Inframaq and lila: two apps that
 * decide differently whether a file can be downloaded is a hole.
 */

const hasOwn = (record: object, key: string): boolean => Object.prototype.hasOwnProperty.call(record, key);

/** Override first, then the link default; nothing at all = legacy link = allowed. */
export function effectiveDownload(linkDefault: boolean | undefined, override: boolean | undefined): boolean {
  if (typeof override === 'boolean') return override;
  if (typeof linkDefault === 'boolean') return linkDefault;
  return true;
}

const expiryMs = (expiresAt: ShareLinkPolicy['expiresAt']): number | null => {
  if (expiresAt === undefined || expiresAt === null) return null;
  const value = expiresAt instanceof Date ? expiresAt.getTime() : typeof expiresAt === 'number' ? expiresAt : Date.parse(expiresAt);
  return Number.isFinite(value) ? value : Number.NaN;
};

/** Not revoked and not expired. An unreadable expiry counts as expired (fails closed). */
export function isLinkActive(link: ShareLinkPolicy, now: number = Date.now()): boolean {
  if (link.revoked === true) return false;
  const expiry = expiryMs(link.expiresAt);
  if (expiry === null) return true;
  return expiry > now;
}

const overrideOf = (link: ShareLinkPolicy, mediaId: string): boolean | undefined => {
  const overrides = link.downloadOverrides;
  if (!overrides || !hasOwn(overrides, mediaId)) return undefined;
  const value = overrides[mediaId];
  return typeof value === 'boolean' ? value : undefined;
};

export function canDownload(link: ShareLinkPolicy, file: Pick<SharedFileRef, 'mediaId'>, now: number = Date.now()): boolean {
  return isLinkActive(link, now) && effectiveDownload(link.download, overrideOf(link, file.mediaId));
}

/**
 * Whether the folder ZIP may exist. With the files known: at least one can be
 * downloaded. Without them: the default allows it or some override does.
 */
export function canZip(link: ShareLinkPolicy, folder?: { files?: Pick<SharedFileRef, 'mediaId'>[] }, now: number = Date.now()): boolean {
  if (!isLinkActive(link, now)) return false;
  if (folder?.files) return folder.files.some((file) => canDownload(link, file, now));
  if (effectiveDownload(link.download, undefined)) return true;
  return Object.values(link.downloadOverrides ?? {}).some((value) => value === true);
}

/** mediaIds that must stay out of the ZIP. On an inactive link, all of them. */
export function zipExclusions(link: ShareLinkPolicy, files: Pick<SharedFileRef, 'mediaId'>[], now: number = Date.now()): string[] {
  return files.filter((file) => !canDownload(link, file, now)).map((file) => file.mediaId);
}

/** Policy of a link created from now on: download blocked, identification off. */
export function defaultPolicyForNewLink(): ShareLinkPolicy {
  return { download: false, downloadOverrides: {}, requireIdentity: false };
}

const booleanOverrides = (raw: unknown): Record<string, boolean> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'));
};

/** Whatever is stored (a legacy `permissions` object included) as an explicit policy. */
export function normalizeSharePolicy(raw: unknown): ShareLinkPolicy {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    download: typeof source.download === 'boolean' ? source.download : true,
    downloadOverrides: booleanOverrides(source.downloadOverrides),
    requireIdentity: source.requireIdentity === true,
  };
}

export const requiresIdentity = (link: ShareLinkPolicy): boolean => link.requireIdentity === true;

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'm4v']);

/** Viewer for a file name or MIME type. */
export function previewKindOf(nameOrMime: string): SharePreviewKind {
  const value = nameOrMime.trim().toLowerCase();
  if (value.includes('/')) {
    if (value === 'application/pdf') return 'pdf';
    if (value.startsWith('image/')) return 'image';
    if (value.startsWith('video/')) return 'video';
    return 'none';
  }
  const extension = value.includes('.') ? value.split('.').pop() ?? '' : '';
  if (extension === 'pdf') return 'pdf';
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (VIDEO_EXTENSIONS.has(extension)) return 'video';
  return 'none';
}

/** What the public list says about one file, instead of its raw URLs. */
export function sharedFileAccess(link: ShareLinkPolicy, file: SharedFileRef, now: number = Date.now(), pages?: number): SharedFileAccess {
  const access: SharedFileAccess = {
    mediaId: file.mediaId,
    canDownload: canDownload(link, file, now),
    preview: previewKindOf(file.mimeType || file.name || ''),
  };
  if (pages !== undefined) access.pages = Math.min(pages, MAX_PAGES_PER_DOCUMENT);
  return access;
}
