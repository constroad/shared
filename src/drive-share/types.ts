/**
 * Contract of a Drive share link that may forbid downloading (José, 25/11/2026).
 * Structural types: each app keeps its own model (Mongoose in Portal and Inframaq).
 */

/** What a link allows. A field that is missing means what legacy links did. */
export interface ShareLinkPolicy {
  /** Download default for every file of the link. Missing = legacy link = allowed. */
  download?: boolean;
  /** Per-file exception, by mediaId, in either direction. Wins over `download`. */
  downloadOverrides?: Record<string, boolean>;
  /** The whole folder as a ZIP (only the files the link lets download). Missing = legacy = what download allowed. */
  zip?: boolean;
  /** Printing a file (it needs the original, so only where that file can be downloaded). Missing = legacy = allowed. */
  print?: boolean;
  /** The viewer proves a phone or email by OTP before seeing; that identity goes into the watermark. */
  requireIdentity?: boolean;
  /** The public pages (the expired-link page included) offer WhatsApp and a call to the company. Missing = off. */
  showContact?: boolean;
  /** Absent or null = never expires. Date, ISO string or epoch milliseconds. */
  expiresAt?: Date | string | number | null;
  revoked?: boolean;
}

/** A file as the rules need it: only its id (and its name or MIME type to pick the viewer). */
export interface SharedFileRef {
  mediaId: string;
  name?: string;
  mimeType?: string;
}

/** How the public viewer shows a file without handing over the original. */
export type SharePreviewKind = 'pdf' | 'image' | 'video' | 'none';

/** What the public list returns per file instead of the raw `url`/`thumbnailUrl`. */
export interface SharedFileAccess {
  mediaId: string;
  canDownload: boolean;
  /** The public viewer offers printing this file (`canPrint`). */
  canPrint: boolean;
  preview: SharePreviewKind;
  /** PDF pages that can be shown, already capped at `MAX_PAGES_PER_DOCUMENT`. */
  pages?: number;
}

/** Response of the endpoint that lists the signed page URLs of one document. */
export interface PageListResponse {
  mediaId: string;
  /** Total pages that can be shown (capped). */
  pages: number;
  /** First page of `urls` (1-based): the list is a window, not the whole document. */
  from: number;
  /** One signed lila URL per page, starting at `from`. */
  urls: string[];
  /** ISO instant at which the page tokens stop working: ask for a new list before it. */
  expiresAt: string;
  canDownload: boolean;
}

export type ShareTokenScope = 'drive-share-page' | 'drive-share-download' | 'drive-share-file';

interface ShareClaimsBase {
  companyId: string;
  /** Relative to the company's storage root, e.g. `drive/obra/plano_ab12cd34ef.pdf`. Never a URL. */
  path: string;
  linkId?: string;
  mediaId?: string;
}

/** One rendered page (or the downscaled image) with its watermark. */
export interface SharePageClaims extends ShareClaimsBase {
  scope: 'drive-share-page';
  /** 1-based; for an image, 1 or absent. */
  page?: number;
  scale?: number;
  /** Already built with `watermarkText`. */
  watermark: string;
}

/** The original as an attachment: only when the link allows downloading that file. */
export interface ShareDownloadClaims extends ShareClaimsBase {
  scope: 'drive-share-download';
  /** Name the browser saves the file as. */
  filename?: string;
}

/** Authorized read of a protected original through `/files/companies/...?t=`. */
export interface ShareFileClaims extends ShareClaimsBase {
  scope: 'drive-share-file';
}

export type ShareClaims = SharePageClaims | ShareDownloadClaims | ShareFileClaims;

/** Claims as they come back from a verified token. */
export type VerifiedShareClaims<C extends ShareClaims = ShareClaims> = C & { iat: number; exp: number };

export type ShareTokenFailure = 'malformed' | 'bad_signature' | 'wrong_scope' | 'expired' | 'not_yet_valid' | 'bad_claims';

export type ShareTokenResult<C extends ShareClaims = ShareClaims> =
  | { ok: true; claims: VerifiedShareClaims<C> }
  | { ok: false; reason: ShareTokenFailure };
