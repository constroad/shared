import { base64UrlFromBytes, bytesFromBase64Url } from '../google-mail/base64';
import { SHARE_TOKEN_CLOCK_SKEW_SECONDS, SHARE_TOKEN_MAX_TTL_SECONDS, SHARE_TOKEN_TTL_SECONDS } from './limits';
import { SHARE_TOKEN_KEY_LABEL, isSafeStoragePath, signShareToken, verifyShareToken } from './shareToken';
import type { SharePageClaims } from './types';

const SECRET = 'test-share-secret';
const NOW = 1_800_000_000_000;
const SECOND = 1000;

const pageClaims: SharePageClaims = {
  scope: 'drive-share-page',
  companyId: 'company-123',
  path: 'drive/obra/plano_ab12cd34ef.pdf',
  page: 3,
  scale: 1.5,
  watermark: 'Enlace AB12 · 25/11/2026 14:05',
  linkId: 'link-1',
  mediaId: 'media-1',
};

const encode = (value: unknown) => base64UrlFromBytes(new TextEncoder().encode(JSON.stringify(value)));
const decode = (token: string) => JSON.parse(new TextDecoder().decode(bytesFromBase64Url(token.split('.')[0])));

describe('share token', () => {
  it('round-trips a page token with its claims and timestamps', async () => {
    const token = await signShareToken(pageClaims, SECRET, { now: NOW });
    const result = await verifyShareToken(token, SECRET, { scope: 'drive-share-page', now: NOW + SECOND });
    expect(result).toEqual({
      ok: true,
      claims: { ...pageClaims, iat: NOW / SECOND, exp: NOW / SECOND + SHARE_TOKEN_TTL_SECONDS['drive-share-page'] },
    });
  });

  it('uses only URL-safe characters', async () => {
    const token = await signShareToken(pageClaims, SECRET, { now: NOW });
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it('refuses a token past its expiry plus the clock skew', async () => {
    const token = await signShareToken(pageClaims, SECRET, { now: NOW });
    const ttl = SHARE_TOKEN_TTL_SECONDS['drive-share-page'];
    const withinSkew = NOW + (ttl + SHARE_TOKEN_CLOCK_SKEW_SECONDS - 1) * SECOND;
    const pastSkew = NOW + (ttl + SHARE_TOKEN_CLOCK_SKEW_SECONDS + 1) * SECOND;
    await expect(verifyShareToken(token, SECRET, { scope: 'drive-share-page', now: withinSkew })).resolves.toMatchObject({ ok: true });
    await expect(verifyShareToken(token, SECRET, { scope: 'drive-share-page', now: pastSkew })).resolves.toEqual({ ok: false, reason: 'expired' });
  });

  it('accepts a signer clock slightly ahead but refuses one far in the future', async () => {
    const slightlyAhead = await signShareToken(pageClaims, SECRET, { now: NOW + 10 * SECOND });
    await expect(verifyShareToken(slightlyAhead, SECRET, { scope: 'drive-share-page', now: NOW })).resolves.toMatchObject({ ok: true });
    const farAhead = await signShareToken(pageClaims, SECRET, { now: NOW + 600 * SECOND });
    await expect(verifyShareToken(farAhead, SECRET, { scope: 'drive-share-page', now: NOW })).resolves.toEqual({ ok: false, reason: 'not_yet_valid' });
  });

  it('refuses a token whose claims were altered', async () => {
    const token = await signShareToken(pageClaims, SECRET, { now: NOW });
    const [, signature] = token.split('.');
    const forged = `${encode({ ...decode(token), companyId: 'other-company' })}.${signature}`;
    await expect(verifyShareToken(forged, SECRET, { scope: 'drive-share-page', now: NOW })).resolves.toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('refuses a token whose signature was altered', async () => {
    const token = await signShareToken(pageClaims, SECRET, { now: NOW });
    const [body, signature] = token.split('.');
    const flipped = signature.startsWith('A') ? `B${signature.slice(1)}` : `A${signature.slice(1)}`;
    await expect(verifyShareToken(`${body}.${flipped}`, SECRET, { scope: 'drive-share-page', now: NOW })).resolves.toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('refuses a token signed with another secret', async () => {
    const token = await signShareToken(pageClaims, 'other-secret', { now: NOW });
    await expect(verifyShareToken(token, SECRET, { scope: 'drive-share-page', now: NOW })).resolves.toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('refuses a token of another scope: a page token never downloads', async () => {
    const token = await signShareToken(pageClaims, SECRET, { now: NOW });
    await expect(verifyShareToken(token, SECRET, { scope: 'drive-share-download', now: NOW })).resolves.toEqual({ ok: false, reason: 'wrong_scope' });
    await expect(verifyShareToken(token, SECRET, { scope: 'drive-share-file', now: NOW })).resolves.toEqual({ ok: false, reason: 'wrong_scope' });
  });

  it('is not a plain HMAC of the secret: a JWT-style signature over the same body does not verify', async () => {
    const token = await signShareToken(pageClaims, SECRET, { now: NOW });
    const [body] = token.split('.');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const plain = base64UrlFromBytes(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))));
    await expect(verifyShareToken(`${body}.${plain}`, SECRET, { scope: 'drive-share-page', now: NOW })).resolves.toEqual({ ok: false, reason: 'bad_signature' });
  });

  it.each(['', 'no-dot', 'a.b.c', '%%%.%%%', '.sig', 'body.', undefined, null, 42])('refuses a malformed token (%p)', async (token) => {
    await expect(verifyShareToken(token as string, SECRET, { scope: 'drive-share-page', now: NOW })).resolves.toEqual({ ok: false, reason: 'malformed' });
  });

  it('refuses a validly signed token that lives longer than its scope allows', async () => {
    await expect(
      signShareToken(pageClaims, SECRET, { now: NOW, ttlSeconds: SHARE_TOKEN_MAX_TTL_SECONDS['drive-share-page'] + 1 })
    ).rejects.toThrow(RangeError);
  });

  it('honours a shorter custom lifetime', async () => {
    const token = await signShareToken({ scope: 'drive-share-download', companyId: 'c1', path: 'a/b.pdf', filename: 'Plano final.pdf' }, SECRET, { now: NOW, ttlSeconds: 30 });
    await expect(verifyShareToken(token, SECRET, { scope: 'drive-share-download', now: NOW + 70 * SECOND })).resolves.toEqual({ ok: false, reason: 'expired' });
    await expect(verifyShareToken(token, SECRET, { scope: 'drive-share-download', now: NOW + 20 * SECOND })).resolves.toMatchObject({
      ok: true,
      claims: { filename: 'Plano final.pdf' },
    });
  });

  it('refuses to sign without a secret, and fails verification without one', async () => {
    await expect(signShareToken(pageClaims, '', { now: NOW })).rejects.toThrow(TypeError);
    const token = await signShareToken(pageClaims, SECRET, { now: NOW });
    await expect(verifyShareToken(token, '', { scope: 'drive-share-page', now: NOW })).resolves.toEqual({ ok: false, reason: 'bad_signature' });
  });

  describe('claims validation (Portal bug or forged payload)', () => {
    it.each([
      ['a traversal path', { path: '../other/x.pdf' }],
      ['an inner traversal', { path: 'drive/../../x.pdf' }],
      ['an absolute path', { path: '/etc/passwd' }],
      ['a backslash', { path: 'drive\\x.pdf' }],
      ['a NUL byte', { path: 'drive/x.pdf\u0000.png' }],
      ['an empty segment', { path: 'drive//x.pdf' }],
      ['a dot segment', { path: 'drive/./x.pdf' }],
      ['a hidden thumbs path', { path: 'drive/.thumbs/x.jpg' }],
      ['a traversal company', { companyId: '..' }],
      ['a company with a slash', { companyId: 'a/b' }],
      ['page zero', { page: 0 }],
      ['a fractional page', { page: 1.5 }],
      ['a page over the cap', { page: 301 }],
      ['a scale over the cap', { scale: 4 }],
      ['a huge watermark', { watermark: 'x'.repeat(500) }],
    ])('refuses to sign %s', async (_label, patch) => {
      await expect(signShareToken({ ...pageClaims, ...patch } as SharePageClaims, SECRET, { now: NOW })).rejects.toThrow(TypeError);
    });

    it('re-validates the claims on verify, even with a valid signature', async () => {
      // Reproduces the documented key derivation: HMAC-SHA256(secret, SHARE_TOKEN_KEY_LABEL) is the signing key.
      const subtle = crypto.subtle;
      const master = await subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const derived = new Uint8Array(await subtle.sign('HMAC', master, new TextEncoder().encode(SHARE_TOKEN_KEY_LABEL)));
      const key = await subtle.importKey('raw', derived, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const iat = NOW / SECOND;
      const body = encode({ ...pageClaims, path: '../../etc/passwd', iat, exp: iat + 60 });
      const signature = base64UrlFromBytes(new Uint8Array(await subtle.sign('HMAC', key, new TextEncoder().encode(body))));
      await expect(verifyShareToken(`${body}.${signature}`, SECRET, { scope: 'drive-share-page', now: NOW })).resolves.toEqual({ ok: false, reason: 'bad_claims' });

      const sane = encode({ ...pageClaims, iat, exp: iat + 60 });
      const saneSignature = base64UrlFromBytes(new Uint8Array(await subtle.sign('HMAC', key, new TextEncoder().encode(sane))));
      await expect(verifyShareToken(`${sane}.${saneSignature}`, SECRET, { scope: 'drive-share-page', now: NOW })).resolves.toMatchObject({ ok: true });

      const tooLong = encode({ ...pageClaims, iat, exp: iat + 24 * 3600 });
      const tooLongSignature = base64UrlFromBytes(new Uint8Array(await subtle.sign('HMAC', key, new TextEncoder().encode(tooLong))));
      await expect(verifyShareToken(`${tooLong}.${tooLongSignature}`, SECRET, { scope: 'drive-share-page', now: NOW })).resolves.toEqual({ ok: false, reason: 'bad_claims' });
    });
  });
});

describe('isSafeStoragePath', () => {
  it.each(['drive/a.pdf', 'a.pdf', 'drive/Obra Ñandú/plano final_ab12.pdf'])('accepts %p', (value) => {
    expect(isSafeStoragePath(value)).toBe(true);
  });

  it.each(['', '/a', '../a', 'a/..', 'a//b', 'a/./b', 'a\\b', 'a/.hidden', `${'a/'.repeat(600)}b`])('refuses %p', (value) => {
    expect(isSafeStoragePath(value)).toBe(false);
  });
});
