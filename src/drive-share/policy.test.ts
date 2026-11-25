import {
  canDownload,
  canZip,
  defaultPolicyForNewLink,
  effectiveDownload,
  isLinkActive,
  normalizeSharePolicy,
  previewKindOf,
  requiresIdentity,
  sharedFileAccess,
  zipExclusions,
} from './policy';
import type { ShareLinkPolicy } from './types';

const NOW = Date.UTC(2026, 10, 25, 15, 0, 0);
const HOUR = 3_600_000;

describe('effectiveDownload', () => {
  it('lets a file override win over the link default, both ways', () => {
    expect(effectiveDownload(false, true)).toBe(true);
    expect(effectiveDownload(true, false)).toBe(false);
  });

  it('falls back to the link default without an override', () => {
    expect(effectiveDownload(false, undefined)).toBe(false);
    expect(effectiveDownload(true, undefined)).toBe(true);
  });

  it('treats a legacy link with no field as download allowed', () => {
    expect(effectiveDownload(undefined, undefined)).toBe(true);
  });
});

describe('isLinkActive', () => {
  it('is active without expiry and not revoked', () => {
    expect(isLinkActive({}, NOW)).toBe(true);
    expect(isLinkActive({ expiresAt: null }, NOW)).toBe(true);
  });

  it('accepts Date, ISO string and epoch expiries in the future', () => {
    expect(isLinkActive({ expiresAt: new Date(NOW + HOUR) }, NOW)).toBe(true);
    expect(isLinkActive({ expiresAt: new Date(NOW + HOUR).toISOString() }, NOW)).toBe(true);
    expect(isLinkActive({ expiresAt: NOW + HOUR }, NOW)).toBe(true);
  });

  it('is inactive once expired, at the exact instant included', () => {
    expect(isLinkActive({ expiresAt: NOW - 1 }, NOW)).toBe(false);
    expect(isLinkActive({ expiresAt: NOW }, NOW)).toBe(false);
  });

  it('fails closed with an unreadable expiry', () => {
    expect(isLinkActive({ expiresAt: 'mañana' }, NOW)).toBe(false);
  });

  it('is inactive when revoked, even without expiry', () => {
    expect(isLinkActive({ revoked: true }, NOW)).toBe(false);
  });
});

describe('canDownload', () => {
  const file = { mediaId: 'm1' };

  it('refuses by default on a new link', () => {
    expect(canDownload(defaultPolicyForNewLink(), file, NOW)).toBe(false);
  });

  it('allows on a legacy link without the field', () => {
    expect(canDownload({}, file, NOW)).toBe(true);
  });

  it('honours a per-file override over the folder default', () => {
    const link: ShareLinkPolicy = { download: false, downloadOverrides: { m1: true } };
    expect(canDownload(link, file, NOW)).toBe(true);
    expect(canDownload(link, { mediaId: 'm2' }, NOW)).toBe(false);
  });

  it('refuses on an expired or revoked link whatever the permission', () => {
    expect(canDownload({ download: true, expiresAt: NOW - HOUR }, file, NOW)).toBe(false);
    expect(canDownload({ download: true, revoked: true }, file, NOW)).toBe(false);
  });

  it('ignores inherited object keys as overrides', () => {
    expect(canDownload({ download: false }, { mediaId: 'constructor' }, NOW)).toBe(false);
    expect(canDownload({ download: false }, { mediaId: '__proto__' }, NOW)).toBe(false);
  });
});

describe('canZip and zipExclusions', () => {
  const files = [{ mediaId: 'a' }, { mediaId: 'b' }, { mediaId: 'c' }];

  it('zips when at least one file of the folder can be downloaded', () => {
    expect(canZip({ download: false, downloadOverrides: { b: true } }, { files }, NOW)).toBe(true);
    expect(canZip({ download: false }, { files }, NOW)).toBe(false);
  });

  it('never zips an empty folder', () => {
    expect(canZip({ download: true }, { files: [] }, NOW)).toBe(false);
  });

  it('decides from the policy alone when the files are not known', () => {
    expect(canZip({ download: true }, undefined, NOW)).toBe(true);
    expect(canZip({ download: false }, undefined, NOW)).toBe(false);
    expect(canZip({ download: false, downloadOverrides: { a: true } }, undefined, NOW)).toBe(true);
    expect(canZip({}, undefined, NOW)).toBe(true);
  });

  it('never zips on an inactive link', () => {
    expect(canZip({ download: true, revoked: true }, { files }, NOW)).toBe(false);
  });

  it('excludes exactly the files without download permission', () => {
    expect(zipExclusions({ download: true, downloadOverrides: { b: false } }, files, NOW)).toEqual(['b']);
    expect(zipExclusions({ download: false, downloadOverrides: { a: true } }, files, NOW)).toEqual(['b', 'c']);
  });

  it('excludes everything on an inactive link (fails closed)', () => {
    expect(zipExclusions({ download: true, expiresAt: NOW - 1 }, files, NOW)).toEqual(['a', 'b', 'c']);
  });
});

describe('normalizeSharePolicy', () => {
  it('turns a legacy permissions object into an explicit policy that downloads', () => {
    expect(normalizeSharePolicy({ view: true, downloadZip: true })).toEqual({
      download: true,
      downloadOverrides: {},
      requireIdentity: false,
    });
  });

  it('keeps an explicit refusal and only boolean overrides', () => {
    expect(
      normalizeSharePolicy({ download: false, downloadOverrides: { a: true, b: 'yes', c: false }, requireIdentity: true })
    ).toEqual({ download: false, downloadOverrides: { a: true, c: false }, requireIdentity: true });
  });

  it('survives garbage', () => {
    expect(normalizeSharePolicy(null)).toEqual({ download: true, downloadOverrides: {}, requireIdentity: false });
    expect(normalizeSharePolicy({ downloadOverrides: [true] })).toEqual({ download: true, downloadOverrides: {}, requireIdentity: false });
  });
});

describe('new links and identity', () => {
  it('creates new links with download blocked and identification off', () => {
    expect(defaultPolicyForNewLink()).toEqual({ download: false, downloadOverrides: {}, requireIdentity: false });
  });

  it('returns a fresh object each time', () => {
    const first = defaultPolicyForNewLink();
    first.downloadOverrides!.x = true;
    expect(defaultPolicyForNewLink().downloadOverrides).toEqual({});
  });

  it('asks for identity only when explicitly on', () => {
    expect(requiresIdentity({ requireIdentity: true })).toBe(true);
    expect(requiresIdentity({})).toBe(false);
  });
});

describe('previewKindOf and sharedFileAccess', () => {
  it.each([
    ['plano.PDF', 'pdf'],
    ['application/pdf', 'pdf'],
    ['foto.jpeg', 'image'],
    ['image/webp', 'image'],
    ['video.mp4', 'video'],
    ['video/quicktime', 'video'],
    ['hoja.xlsx', 'none'],
    ['', 'none'],
  ])('%p previews as %p', (input, kind) => {
    expect(previewKindOf(input)).toBe(kind);
  });

  it('describes what the public viewer may do with one file', () => {
    expect(sharedFileAccess({ download: false }, { mediaId: 'm', name: 'a.pdf' }, NOW, 12)).toEqual({
      mediaId: 'm',
      canDownload: false,
      preview: 'pdf',
      pages: 12,
    });
  });

  it('caps the pages it announces at the render limit', () => {
    expect(sharedFileAccess({}, { mediaId: 'm', name: 'a.pdf' }, NOW, 5000).pages).toBe(300);
  });
});
