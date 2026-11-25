import type { SharePreviewKind, ShareLinkPolicy, SharedFileAccess, SharedFileRef } from './types';
/** Override first, then the link default; nothing at all = legacy link = allowed. */
export declare function effectiveDownload(linkDefault: boolean | undefined, override: boolean | undefined): boolean;
/** Not revoked and not expired. An unreadable expiry counts as expired (fails closed). */
export declare function isLinkActive(link: ShareLinkPolicy, now?: number): boolean;
export declare function canDownload(link: ShareLinkPolicy, file: Pick<SharedFileRef, 'mediaId'>, now?: number): boolean;
/**
 * Whether the folder ZIP may exist. With the files known: at least one can be
 * downloaded. Without them: the default allows it or some override does.
 */
export declare function canZip(link: ShareLinkPolicy, folder?: {
    files?: Pick<SharedFileRef, 'mediaId'>[];
}, now?: number): boolean;
/** mediaIds that must stay out of the ZIP. On an inactive link, all of them. */
export declare function zipExclusions(link: ShareLinkPolicy, files: Pick<SharedFileRef, 'mediaId'>[], now?: number): string[];
/** Policy of a link created from now on: download blocked, identification off. */
export declare function defaultPolicyForNewLink(): ShareLinkPolicy;
/** Whatever is stored (a legacy `permissions` object included) as an explicit policy. */
export declare function normalizeSharePolicy(raw: unknown): ShareLinkPolicy;
export declare const requiresIdentity: (link: ShareLinkPolicy) => boolean;
/** Viewer for a file name or MIME type. */
export declare function previewKindOf(nameOrMime: string): SharePreviewKind;
/** What the public list says about one file, instead of its raw URLs. */
export declare function sharedFileAccess(link: ShareLinkPolicy, file: SharedFileRef, now?: number, pages?: number): SharedFileAccess;
