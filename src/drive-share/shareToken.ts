import { base64UrlFromBytes, bytesFromBase64Url } from '../google-mail/base64';
import {
  MAX_PAGE_SCALE,
  MIN_PAGE_SCALE,
  SHARE_TOKEN_CLOCK_SKEW_SECONDS,
  SHARE_TOKEN_MAX_TTL_SECONDS,
  SHARE_TOKEN_TTL_SECONDS,
  isRenderablePage,
} from './limits';
import { WATERMARK_MAX_LENGTH } from './watermark';
import type { ShareClaims, ShareTokenResult, ShareTokenScope, VerifiedShareClaims } from './types';

/**
 * Short signed token for a shared page, download or protected read:
 * `base64url(JSON claims).base64url(HMAC-SHA256)`, Web Crypto only, so it runs
 * the same in Node 18+ (Express), Next on Vercel (Node or Edge) and Inframaq.
 *
 * The signing key is DERIVED from the app secret
 * (`HMAC-SHA256(secret, SHARE_TOKEN_KEY_LABEL)`), never the secret itself:
 * Portal↔lila share `LILA_APP_JWT_SECRET` with every JWT, and the derivation
 * keeps a share token and a JWT from ever validating as each other.
 */

export const SHARE_TOKEN_KEY_LABEL = 'constroad/drive-share/v1';

const SCOPES: readonly ShareTokenScope[] = ['drive-share-page', 'drive-share-download', 'drive-share-file'];
const COMPANY_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_PATH_LENGTH = 1024;
const MAX_ID_LENGTH = 128;
const MAX_FILENAME_LENGTH = 255;
const SECOND_MS = 1000;

const encoder = new TextEncoder();

function subtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new TypeError('Web Crypto is not available in this runtime (Node 18 needs --experimental-global-webcrypto).');
  return subtle;
}

const derivedKeys = new Map<string, Promise<CryptoKey>>();

async function deriveKey(secret: string): Promise<CryptoKey> {
  const subtle = subtleCrypto();
  const master = await subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const derived = new Uint8Array(await subtle.sign('HMAC', master, encoder.encode(SHARE_TOKEN_KEY_LABEL)));
  return subtle.importKey('raw', derived, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function signingKey(secret: string): Promise<CryptoKey> {
  let key = derivedKeys.get(secret);
  if (!key) {
    key = deriveKey(secret);
    derivedKeys.set(secret, key);
  }
  return key;
}

/**
 * A storage path relative to the company root that cannot leave it: it rejects a
 * leading slash, `.`/`..`/empty/hidden segments, backslashes and control characters.
 */
export function isSafeStoragePath(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > MAX_PATH_LENGTH) return false;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return false;
  return value.split('/').every((segment) => segment !== '' && !segment.startsWith('.'));
}

const optionalText = (value: unknown, max: number): boolean => value === undefined || (typeof value === 'string' && value.length <= max);

function pageClaimsProblem(claims: Record<string, unknown>): string | null {
  if (claims.page !== undefined && !isRenderablePage(claims.page as number)) return 'page';
  const scale = claims.scale;
  if (scale !== undefined && (typeof scale !== 'number' || !(scale >= MIN_PAGE_SCALE && scale <= MAX_PAGE_SCALE))) return 'scale';
  if (typeof claims.watermark !== 'string' || claims.watermark.length > WATERMARK_MAX_LENGTH) return 'watermark';
  return null;
}

function commonClaimsProblem(claims: Record<string, unknown>): string | null {
  if (!SCOPES.includes(claims.scope as ShareTokenScope)) return 'scope';
  if (typeof claims.companyId !== 'string' || !COMPANY_ID_PATTERN.test(claims.companyId)) return 'companyId';
  if (!isSafeStoragePath(claims.path)) return 'path';
  if (!optionalText(claims.linkId, MAX_ID_LENGTH) || !optionalText(claims.mediaId, MAX_ID_LENGTH)) return 'ids';
  return null;
}

function claimsProblem(claims: Record<string, unknown>): string | null {
  const common = commonClaimsProblem(claims);
  if (common) return common;
  if (claims.scope === 'drive-share-page') return pageClaimsProblem(claims);
  if (claims.scope === 'drive-share-download' && !optionalText(claims.filename, MAX_FILENAME_LENGTH)) return 'filename';
  return null;
}

export interface SignShareTokenOptions {
  /** Defaults to `SHARE_TOKEN_TTL_SECONDS[scope]`; above `SHARE_TOKEN_MAX_TTL_SECONDS[scope]` it throws. */
  ttlSeconds?: number;
  /** Epoch milliseconds. */
  now?: number;
}

/** Signs the claims. Throws TypeError on invalid claims or no secret, RangeError on a lifetime over the scope's cap. */
export async function signShareToken(claims: ShareClaims, secret: string, options: SignShareTokenOptions = {}): Promise<string> {
  if (!secret) throw new TypeError('A share token needs a secret.');
  const problem = claimsProblem(claims as unknown as Record<string, unknown>);
  if (problem) throw new TypeError(`Invalid share token claim: ${problem}.`);
  const ttl = options.ttlSeconds ?? SHARE_TOKEN_TTL_SECONDS[claims.scope];
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > SHARE_TOKEN_MAX_TTL_SECONDS[claims.scope]) {
    throw new RangeError(`A ${claims.scope} token lives at most ${SHARE_TOKEN_MAX_TTL_SECONDS[claims.scope]} s.`);
  }
  const iat = Math.floor((options.now ?? Date.now()) / SECOND_MS);
  const body = base64UrlFromBytes(encoder.encode(JSON.stringify({ ...claims, iat, exp: iat + ttl })));
  const signature = new Uint8Array(await subtleCrypto().sign('HMAC', await signingKey(secret), encoder.encode(body)));
  return `${body}.${base64UrlFromBytes(signature)}`;
}

export interface VerifyShareTokenOptions<S extends ShareTokenScope> {
  /** The only scope this endpoint accepts. */
  scope: S;
  now?: number;
  clockSkewSeconds?: number;
}

type ClaimsOf<S extends ShareTokenScope> = Extract<ShareClaims, { scope: S }>;

function decodeBody(body: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytesFromBase64Url(body)));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function hasValidSignature(body: string, signatureText: string, secret: string): Promise<boolean | null> {
  let signature: Uint8Array<ArrayBuffer>;
  try {
    signature = bytesFromBase64Url(signatureText);
  } catch {
    return null;
  }
  if (!secret) return false;
  // `verify` compares in constant time.
  return subtleCrypto().verify('HMAC', await signingKey(secret), signature, encoder.encode(body));
}

function timeProblem(claims: Record<string, unknown>, scope: ShareTokenScope, nowSeconds: number, skew: number): 'expired' | 'not_yet_valid' | 'bad_claims' | null {
  const { iat, exp } = claims;
  if (typeof iat !== 'number' || typeof exp !== 'number' || !Number.isFinite(iat) || !Number.isFinite(exp)) return 'bad_claims';
  if (exp <= iat || exp - iat > SHARE_TOKEN_MAX_TTL_SECONDS[scope]) return 'bad_claims';
  if (iat > nowSeconds + skew) return 'not_yet_valid';
  if (nowSeconds > exp + skew) return 'expired';
  return null;
}

/** Never throws: an invalid token is `{ ok: false, reason }`, for the endpoint to answer 401/403. */
export async function verifyShareToken<S extends ShareTokenScope>(
  token: string | undefined | null,
  secret: string,
  options: VerifyShareTokenOptions<S>
): Promise<ShareTokenResult<ClaimsOf<S>>> {
  const parts = typeof token === 'string' ? token.split('.') : [];
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'malformed' };
  const claims = decodeBody(parts[0]);
  const valid = claims ? await hasValidSignature(parts[0], parts[1], secret) : null;
  if (!claims || valid === null) return { ok: false, reason: 'malformed' };
  if (!valid) return { ok: false, reason: 'bad_signature' };
  if (claims.scope !== options.scope) return { ok: false, reason: 'wrong_scope' };
  if (claimsProblem(claims)) return { ok: false, reason: 'bad_claims' };
  const nowSeconds = (options.now ?? Date.now()) / SECOND_MS;
  const problem = timeProblem(claims, options.scope, nowSeconds, options.clockSkewSeconds ?? SHARE_TOKEN_CLOCK_SKEW_SECONDS);
  if (problem) return { ok: false, reason: problem };
  return { ok: true, claims: claims as unknown as VerifiedShareClaims<ClaimsOf<S>> };
}
