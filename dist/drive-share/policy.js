"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiresIdentity = void 0;
exports.effectiveDownload = effectiveDownload;
exports.isLinkActive = isLinkActive;
exports.canDownload = canDownload;
exports.canZip = canZip;
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
/**
 * Whether the folder ZIP may exist. With the files known: at least one can be
 * downloaded. Without them: the default allows it or some override does.
 */
function canZip(link, folder, now = Date.now()) {
    if (!isLinkActive(link, now))
        return false;
    if (folder?.files)
        return folder.files.some((file) => canDownload(link, file, now));
    if (effectiveDownload(link.download, undefined))
        return true;
    return Object.values(link.downloadOverrides ?? {}).some((value) => value === true);
}
/** mediaIds that must stay out of the ZIP. On an inactive link, all of them. */
function zipExclusions(link, files, now = Date.now()) {
    return files.filter((file) => !canDownload(link, file, now)).map((file) => file.mediaId);
}
/** Policy of a link created from now on: download blocked, identification off. */
function defaultPolicyForNewLink() {
    return { download: false, downloadOverrides: {}, requireIdentity: false };
}
const booleanOverrides = (raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return {};
    return Object.fromEntries(Object.entries(raw).filter((entry) => typeof entry[1] === 'boolean'));
};
/** Whatever is stored (a legacy `permissions` object included) as an explicit policy. */
function normalizeSharePolicy(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
        download: typeof source.download === 'boolean' ? source.download : true,
        downloadOverrides: booleanOverrides(source.downloadOverrides),
        requireIdentity: source.requireIdentity === true,
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
        preview: previewKindOf(file.mimeType || file.name || ''),
    };
    if (pages !== undefined)
        access.pages = Math.min(pages, limits_1.MAX_PAGES_PER_DOCUMENT);
    return access;
}
