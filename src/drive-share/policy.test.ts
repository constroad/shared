import {
  allowsSomeDownload,
  canDownload,
  canPrint,
  canShowContact,
  canWatermark,
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

  it('never zips with the ZIP toggle off, whatever downloads', () => {
    expect(canZip({ download: true, zip: false }, { files }, NOW)).toBe(false);
    expect(canZip({ download: true, zip: false }, undefined, NOW)).toBe(false);
  });

  it('with the ZIP toggle on, still needs something downloadable', () => {
    expect(canZip({ download: true, zip: true }, { files }, NOW)).toBe(true);
    expect(canZip({ download: false, zip: true }, { files }, NOW)).toBe(false);
    expect(canZip({ download: false, zip: true, downloadOverrides: { c: true } }, { files }, NOW)).toBe(true);
    expect(canZip({ download: false, zip: true }, undefined, NOW)).toBe(false);
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

const LEGACY_DOWNLOADING = { download: true, downloadOverrides: {}, zip: true, print: true, requireIdentity: false, showContact: false, watermark: true };

describe('normalizeSharePolicy', () => {
  it('turns a legacy permissions object into an explicit policy that downloads, zips and prints', () => {
    expect(normalizeSharePolicy({ view: true, downloadZip: true })).toEqual(LEGACY_DOWNLOADING);
  });

  it('keeps an explicit refusal and only boolean overrides', () => {
    expect(
      normalizeSharePolicy({ download: false, downloadOverrides: { a: true, b: 'yes', c: false }, requireIdentity: true })
    ).toEqual({ download: false, downloadOverrides: { a: true, c: false }, zip: true, print: true, requireIdentity: true, showContact: false, watermark: true });
  });

  it('gives a legacy link that downloads nothing neither ZIP nor print', () => {
    expect(normalizeSharePolicy({ download: false })).toEqual({ download: false, downloadOverrides: {}, zip: false, print: false, requireIdentity: false, showContact: false, watermark: true });
  });

  it('keeps the explicit toggles of a v0.23 link', () => {
    expect(normalizeSharePolicy({ download: true, zip: false, print: false, showContact: true })).toEqual({
      download: true, downloadOverrides: {}, zip: false, print: false, requireIdentity: false, showContact: true, watermark: true,
    });
  });

  it('never shows the contact of a legacy link', () => {
    expect(normalizeSharePolicy({ download: true }).showContact).toBe(false);
    expect(normalizeSharePolicy({ showContact: 'yes' }).showContact).toBe(false);
  });

  it('survives garbage', () => {
    expect(normalizeSharePolicy(null)).toEqual(LEGACY_DOWNLOADING);
    expect(normalizeSharePolicy({ downloadOverrides: [true] })).toEqual(LEGACY_DOWNLOADING);
  });
});

describe('canPrint', () => {
  const file = { mediaId: 'a' };

  it('prints only with the toggle on and the file downloadable', () => {
    expect(canPrint({ download: true, print: true }, file, NOW)).toBe(true);
    expect(canPrint({ download: true, print: false }, file, NOW)).toBe(false);
  });

  it('never prints a file without download: printing needs the original', () => {
    expect(canPrint({ download: false, print: true }, file, NOW)).toBe(false);
    expect(canPrint({ download: true, print: true, downloadOverrides: { a: false } }, file, NOW)).toBe(false);
    expect(canPrint({ download: false, print: true, downloadOverrides: { a: true } }, file, NOW)).toBe(true);
  });

  it('lets a legacy link print what it lets download', () => {
    expect(canPrint({}, file, NOW)).toBe(true);
    expect(canPrint({ download: false }, file, NOW)).toBe(false);
  });

  it('never prints on an inactive link', () => {
    expect(canPrint({ download: true, print: true, revoked: true }, file, NOW)).toBe(false);
    expect(canPrint({ download: true, print: true, expiresAt: NOW - 1 }, file, NOW)).toBe(false);
  });
});

describe('canWatermark', () => {
  it('marks the pages only when the toggle is on', () => {
    expect(canWatermark({ watermark: true })).toBe(true);
    expect(canWatermark({ watermark: false })).toBe(false);
  });

  it('keeps marking a legacy link without the field', () => {
    expect(canWatermark({})).toBe(true);
  });

  it('leaves a new link unmarked', () => {
    expect(canWatermark(defaultPolicyForNewLink())).toBe(false);
  });
});

describe('normalizeSharePolicy · watermark', () => {
  it('keeps an explicit watermark choice and ignores garbage', () => {
    expect(normalizeSharePolicy({ download: false, watermark: false }).watermark).toBe(false);
    expect(normalizeSharePolicy({ download: false, watermark: 'no' }).watermark).toBe(true);
  });
});

describe('canShowContact', () => {
  it('shows the contact only when explicitly on', () => {
    expect(canShowContact({ showContact: true })).toBe(true);
    expect(canShowContact({ showContact: false })).toBe(false);
    expect(canShowContact({})).toBe(false);
  });

  it('keeps showing it on an expired or revoked link (the expired page asks for a new one)', () => {
    expect(canShowContact({ showContact: true, revoked: true })).toBe(true);
    expect(canShowContact({ showContact: true, expiresAt: NOW - HOUR })).toBe(true);
  });
});

describe('allowsSomeDownload', () => {
  it('is true with the default on or some file allowed', () => {
    expect(allowsSomeDownload({ download: true })).toBe(true);
    expect(allowsSomeDownload({ download: false, downloadOverrides: { a: true } })).toBe(true);
    expect(allowsSomeDownload({})).toBe(true);
  });

  it('is false when nothing can be downloaded', () => {
    expect(allowsSomeDownload({ download: false, downloadOverrides: { a: false } })).toBe(false);
  });
});

describe('new links and identity', () => {
  it('creates new links with every capability off', () => {
    expect(defaultPolicyForNewLink()).toEqual({ download: false, downloadOverrides: {}, zip: false, print: false, requireIdentity: false, showContact: false, watermark: false });
  });

  it('a new link neither zips, prints nor shows the contact', () => {
    const policy = defaultPolicyForNewLink();
    expect(canZip(policy, undefined, NOW)).toBe(false);
    expect(canPrint(policy, { mediaId: 'a' }, NOW)).toBe(false);
    expect(canShowContact(policy)).toBe(false);
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
      canPrint: false,
      preview: 'pdf',
      pages: 12,
    });
  });

  it('says a downloadable file prints only with the print toggle', () => {
    expect(sharedFileAccess({ download: true, print: true }, { mediaId: 'm', name: 'a.pdf' }, NOW).canPrint).toBe(true);
    expect(sharedFileAccess({ download: true, print: false }, { mediaId: 'm', name: 'a.pdf' }, NOW).canPrint).toBe(false);
  });

  it('caps the pages it announces at the render limit', () => {
    expect(sharedFileAccess({}, { mediaId: 'm', name: 'a.pdf' }, NOW, 5000).pages).toBe(300);
  });
});
