"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHARE_TOKEN_KEY_LABEL = void 0;
exports.isSafeStoragePath = isSafeStoragePath;
exports.signShareToken = signShareToken;
exports.verifyShareToken = verifyShareToken;
const base64_1 = require("../google-mail/base64");
const limits_1 = require("./limits");
const watermark_1 = require("./watermark");
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
exports.SHARE_TOKEN_KEY_LABEL = 'constroad/drive-share/v1';
const SCOPES = ['drive-share-page', 'drive-share-download', 'drive-share-file'];
const COMPANY_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_PATH_LENGTH = 1024;
const MAX_ID_LENGTH = 128;
const MAX_FILENAME_LENGTH = 255;
const SECOND_MS = 1000;
const encoder = new TextEncoder();
function subtleCrypto() {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle)
        throw new TypeError('Web Crypto is not available in this runtime (Node 18 needs --experimental-global-webcrypto).');
    return subtle;
}
const derivedKeys = new Map();
async function deriveKey(secret) {
    const subtle = subtleCrypto();
    const master = await subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const derived = new Uint8Array(await subtle.sign('HMAC', master, encoder.encode(exports.SHARE_TOKEN_KEY_LABEL)));
    return subtle.importKey('raw', derived, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
function signingKey(secret) {
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
function isSafeStoragePath(value) {
    if (typeof value !== 'string' || !value || value.length > MAX_PATH_LENGTH)
        return false;
    if (/[\\\u0000-\u001f\u007f]/.test(value))
        return false;
    return value.split('/').every((segment) => segment !== '' && !segment.startsWith('.'));
}
const optionalText = (value, max) => value === undefined || (typeof value === 'string' && value.length <= max);
function pageClaimsProblem(claims) {
    if (claims.page !== undefined && !(0, limits_1.isRenderablePage)(claims.page))
        return 'page';
    const scale = claims.scale;
    if (scale !== undefined && (typeof scale !== 'number' || !(scale >= limits_1.MIN_PAGE_SCALE && scale <= limits_1.MAX_PAGE_SCALE)))
        return 'scale';
    if (typeof claims.watermark !== 'string' || claims.watermark.length > watermark_1.WATERMARK_MAX_LENGTH)
        return 'watermark';
    return null;
}
function commonClaimsProblem(claims) {
    if (!SCOPES.includes(claims.scope))
        return 'scope';
    if (typeof claims.companyId !== 'string' || !COMPANY_ID_PATTERN.test(claims.companyId))
        return 'companyId';
    if (!isSafeStoragePath(claims.path))
        return 'path';
    if (!optionalText(claims.linkId, MAX_ID_LENGTH) || !optionalText(claims.mediaId, MAX_ID_LENGTH))
        return 'ids';
    return null;
}
function claimsProblem(claims) {
    const common = commonClaimsProblem(claims);
    if (common)
        return common;
    if (claims.scope === 'drive-share-page')
        return pageClaimsProblem(claims);
    if (claims.scope === 'drive-share-download' && !optionalText(claims.filename, MAX_FILENAME_LENGTH))
        return 'filename';
    return null;
}
/** Signs the claims. Throws TypeError on invalid claims or no secret, RangeError on a lifetime over the scope's cap. */
async function signShareToken(claims, secret, options = {}) {
    if (!secret)
        throw new TypeError('A share token needs a secret.');
    const problem = claimsProblem(claims);
    if (problem)
        throw new TypeError(`Invalid share token claim: ${problem}.`);
    const ttl = options.ttlSeconds ?? limits_1.SHARE_TOKEN_TTL_SECONDS[claims.scope];
    if (!Number.isInteger(ttl) || ttl < 1 || ttl > limits_1.SHARE_TOKEN_MAX_TTL_SECONDS[claims.scope]) {
        throw new RangeError(`A ${claims.scope} token lives at most ${limits_1.SHARE_TOKEN_MAX_TTL_SECONDS[claims.scope]} s.`);
    }
    const iat = Math.floor((options.now ?? Date.now()) / SECOND_MS);
    const body = (0, base64_1.base64UrlFromBytes)(encoder.encode(JSON.stringify({ ...claims, iat, exp: iat + ttl })));
    const signature = new Uint8Array(await subtleCrypto().sign('HMAC', await signingKey(secret), encoder.encode(body)));
    return `${body}.${(0, base64_1.base64UrlFromBytes)(signature)}`;
}
function decodeBody(body) {
    try {
        const parsed = JSON.parse(new TextDecoder().decode((0, base64_1.bytesFromBase64Url)(body)));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}
async function hasValidSignature(body, signatureText, secret) {
    let signature;
    try {
        signature = (0, base64_1.bytesFromBase64Url)(signatureText);
    }
    catch {
        return null;
    }
    if (!secret)
        return false;
    // `verify` compares in constant time.
    return subtleCrypto().verify('HMAC', await signingKey(secret), signature, encoder.encode(body));
}
function timeProblem(claims, scope, nowSeconds, skew) {
    const { iat, exp } = claims;
    if (typeof iat !== 'number' || typeof exp !== 'number' || !Number.isFinite(iat) || !Number.isFinite(exp))
        return 'bad_claims';
    if (exp <= iat || exp - iat > limits_1.SHARE_TOKEN_MAX_TTL_SECONDS[scope])
        return 'bad_claims';
    if (iat > nowSeconds + skew)
        return 'not_yet_valid';
    if (nowSeconds > exp + skew)
        return 'expired';
    return null;
}
/** Never throws: an invalid token is `{ ok: false, reason }`, for the endpoint to answer 401/403. */
async function verifyShareToken(token, secret, options) {
    const parts = typeof token === 'string' ? token.split('.') : [];
    if (parts.length !== 2 || !parts[0] || !parts[1])
        return { ok: false, reason: 'malformed' };
    const claims = decodeBody(parts[0]);
    const valid = claims ? await hasValidSignature(parts[0], parts[1], secret) : null;
    if (!claims || valid === null)
        return { ok: false, reason: 'malformed' };
    if (!valid)
        return { ok: false, reason: 'bad_signature' };
    if (claims.scope !== options.scope)
        return { ok: false, reason: 'wrong_scope' };
    if (claimsProblem(claims))
        return { ok: false, reason: 'bad_claims' };
    const nowSeconds = (options.now ?? Date.now()) / SECOND_MS;
    const problem = timeProblem(claims, options.scope, nowSeconds, options.clockSkewSeconds ?? limits_1.SHARE_TOKEN_CLOCK_SKEW_SECONDS);
    if (problem)
        return { ok: false, reason: problem };
    return { ok: true, claims: claims };
}
