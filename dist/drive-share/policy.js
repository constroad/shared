"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiresIdentity = exports.canWatermark = exports.canShowContact = void 0;
exports.effectiveDownload = effectiveDownload;
exports.isLinkActive = isLinkActive;
exports.canDownload = canDownload;
exports.allowsSomeDownload = allowsSomeDownload;
exports.canZip = canZip;
exports.canPrint = canPrint;
exports.zipExclusions = zipExclusions;
exports.defaultPolicyForNewLink = defaultPolicyForNewLink;
exports.normalizeSharePolicy = normalizeSharePolicy;
exports.previewKindOf = previewKindOf;
exports.sharedFileAccess = sharedFileAccess;
const limits_1 = require("./limits");
/**
 * The download rule, in one place for Portal, Inframaq and lila: two apps that
 * decide differently whether a file can be downloaded is a hole.
 */
const hasOwn = (record, key) => Object.prototype.hasOwnProperty.call(record, key);
/** Override first, then the link default; nothing at all = legacy link = allowed. */
function effectiveDownload(linkDefault, override) {
    if (typeof override === 'boolean')
        return override;
    if (typeof linkDefault === 'boolean')
        return linkDefault;
    return true;
}
const expiryMs = (expiresAt) => {
    if (expiresAt === undefined || expiresAt === null)
        return null;
    const value = expiresAt instanceof Date ? expiresAt.getTime() : typeof expiresAt === 'number' ? expiresAt : Date.parse(expiresAt);
    return Number.isFinite(value) ? value : Number.NaN;
};
/** Not revoked and not expired. An unreadable expiry counts as expired (fails closed). */
function isLinkActive(link, now = Date.now()) {
    if (link.revoked === true)
        return false;
    const expiry = expiryMs(link.expiresAt);
    if (expiry === null)
        return true;
    return expiry > now;
}
const overrideOf = (link, mediaId) => {
    const overrides = link.downloadOverrides;
    if (!overrides || !hasOwn(overrides, mediaId))
        return undefined;
    const value = overrides[mediaId];
    return typeof value === 'boolean' ? value : undefined;
};
function canDownload(link, file, now = Date.now()) {
    return isLinkActive(link, now) && effectiveDownload(link.download, overrideOf(link, file.mediaId));
}
/** The default allows downloading or some file is an exception that does. */
function allowsSomeDownload(link) {
    if (effectiveDownload(link.download, undefined))
        return true;
    return Object.values(link.downloadOverrides ?? {}).some((value) => value === true);
}
/** An explicit toggle, or what a legacy link (without the field) had: «on wherever something downloads». */
const toggleOrLegacy = (value, link) => typeof value === 'boolean' ? value : allowsSomeDownload(link);
/**
 * Whether the folder ZIP may exist: the ZIP toggle is on and something can be
 * downloaded. With the files known: at least one of them; without them, the
 * default or some override. Files without download stay out (`zipExclusions`).
 */
function canZip(link, folder, now = Date.now()) {
    if (!isLinkActive(link, now) || !toggleOrLegacy(link.zip, link))
        return false;
    if (folder?.files)
        return folder.files.some((file) => canDownload(link, file, now));
    return allowsSomeDownload(link);
}
/** Printing needs the original: only with the print toggle AND that file downloadable. */
function canPrint(link, file, now = Date.now()) {
    return toggleOrLegacy(link.print, link) && canDownload(link, file, now);
}
/** WhatsApp and call buttons on the public pages, the expired-link page included: only when explicitly on. */
const canShowContact = (link) => link.showContact === true;
exports.canShowContact = canShowContact;
/** The viewer pages carry the watermark: an explicit toggle, or on for a legacy link (it was always marked). */
const canWatermark = (link) => link.watermark !== false;
exports.canWatermark = canWatermark;
/** mediaIds that must stay out of the ZIP. On an inactive link, all of them. */
function zipExclusions(link, files, now = Date.now()) {
    return files.filter((file) => !canDownload(link, file, now)).map((file) => file.mediaId);
}
/** Policy of a link created from now on: every capability off (download, ZIP, print, identification, contact, watermark). */
function defaultPolicyForNewLink() {
    return { download: false, downloadOverrides: {}, zip: false, print: false, requireIdentity: false, showContact: false, watermark: false };
}
const booleanOverrides = (raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return {};
    return Object.fromEntries(Object.entries(raw).filter((entry) => typeof entry[1] === 'boolean'));
};
/**
 * Whatever is stored (a legacy `permissions` object included) as an explicit policy.
 * A legacy link keeps what it had: download allowed, and ZIP and print wherever
 * something downloads; the contact stays off; the watermark stays on.
 */
function normalizeSharePolicy(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const base = {
        download: typeof source.download === 'boolean' ? source.download : true,
        downloadOverrides: booleanOverrides(source.downloadOverrides),
    };
    return {
        ...base,
        zip: toggleOrLegacy(typeof source.zip === 'boolean' ? source.zip : undefined, base),
        print: toggleOrLegacy(typeof source.print === 'boolean' ? source.print : undefined, base),
        requireIdentity: source.requireIdentity === true,
        showContact: source.showContact === true,
        watermark: source.watermark !== false,
    };
}
const requiresIdentity = (link) => link.requireIdentity === true;
exports.requiresIdentity = requiresIdentity;
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'm4v']);
/** Viewer for a file name or MIME type. */
function previewKindOf(nameOrMime) {
    const value = nameOrMime.trim().toLowerCase();
    if (value.includes('/')) {
        if (value === 'application/pdf')
            return 'pdf';
        if (value.startsWith('image/'))
            return 'image';
        if (value.startsWith('video/'))
            return 'video';
        return 'none';
    }
    const extension = value.includes('.') ? value.split('.').pop() ?? '' : '';
    if (extension === 'pdf')
        return 'pdf';
    if (IMAGE_EXTENSIONS.has(extension))
        return 'image';
    if (VIDEO_EXTENSIONS.has(extension))
        return 'video';
    return 'none';
}
/** What the public list says about one file, instead of its raw URLs. */
function sharedFileAccess(link, file, now = Date.now(), pages) {
    const access = {
        mediaId: file.mediaId,
        canDownload: canDownload(link, file, now),
        canPrint: canPrint(link, file, now),
        preview: previewKindOf(file.mimeType || file.name || ''),
    };
    if (pages !== undefined)
        access.pages = Math.min(pages, limits_1.MAX_PAGES_PER_DOCUMENT);
    return access;
}
