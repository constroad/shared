import type { SharePreviewKind, ShareLinkPolicy, SharedFileAccess, SharedFileRef } from './types';
/** Override first, then the link default; nothing at all = legacy link = allowed. */
export declare function effectiveDownload(linkDefault: boolean | undefined, override: boolean | undefined): boolean;
/** Not revoked and not expired. An unreadable expiry counts as expired (fails closed). */
export declare function isLinkActive(link: ShareLinkPolicy, now?: number): boolean;
export declare function canDownload(link: ShareLinkPolicy, file: Pick<SharedFileRef, 'mediaId'>, now?: number): boolean;
/** The default allows downloading or some file is an exception that does. */
export declare function allowsSomeDownload(link: ShareLinkPolicy): boolean;
/**
 * Whether the folder ZIP may exist: the ZIP toggle is on and something can be
 * downloaded. With the files known: at least one of them; without them, the
 * default or some override. Files without download stay out (`zipExclusions`).
 */
export declare function canZip(link: ShareLinkPolicy, folder?: {
    files?: Pick<SharedFileRef, 'mediaId'>[];
}, now?: number): boolean;
/** Printing needs the original: only with the print toggle AND that file downloadable. */
export declare function canPrint(link: ShareLinkPolicy, file: Pick<SharedFileRef, 'mediaId'>, now?: number): boolean;
/** WhatsApp and call buttons on the public pages, the expired-link page included: only when explicitly on. */
export declare const canShowContact: (link: ShareLinkPolicy) => boolean;
/** mediaIds that must stay out of the ZIP. On an inactive link, all of them. */
export declare function zipExclusions(link: ShareLinkPolicy, files: Pick<SharedFileRef, 'mediaId'>[], now?: number): string[];
/** Policy of a link created from now on: every capability off (download, ZIP, print, identification, contact). */
export declare function defaultPolicyForNewLink(): ShareLinkPolicy;
/**
 * Whatever is stored (a legacy `permissions` object included) as an explicit policy.
 * A legacy link keeps what it had: download allowed, and ZIP and print wherever
 * something downloads; the contact stays off.
 */
export declare function normalizeSharePolicy(raw: unknown): ShareLinkPolicy;
export declare const requiresIdentity: (link: ShareLinkPolicy) => boolean;
/** Viewer for a file name or MIME type. */
export declare function previewKindOf(nameOrMime: string): SharePreviewKind;
/** What the public list says about one file, instead of its raw URLs. */
export declare function sharedFileAccess(link: ShareLinkPolicy, file: SharedFileRef, now?: number, pages?: number): SharedFileAccess;
