import type { ShareClaims, ShareTokenResult, ShareTokenScope } from './types';
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
export declare const SHARE_TOKEN_KEY_LABEL = "constroad/drive-share/v1";
/**
 * A storage path relative to the company root that cannot leave it: it rejects a
 * leading slash, `.`/`..`/empty/hidden segments, backslashes and control characters.
 */
export declare function isSafeStoragePath(value: unknown): value is string;
export interface SignShareTokenOptions {
    /** Defaults to `SHARE_TOKEN_TTL_SECONDS[scope]`; above `SHARE_TOKEN_MAX_TTL_SECONDS[scope]` it throws. */
    ttlSeconds?: number;
    /** Epoch milliseconds. */
    now?: number;
}
/** Signs the claims. Throws TypeError on invalid claims or no secret, RangeError on a lifetime over the scope's cap. */
export declare function signShareToken(claims: ShareClaims, secret: string, options?: SignShareTokenOptions): Promise<string>;
export interface VerifyShareTokenOptions<S extends ShareTokenScope> {
    /** The only scope this endpoint accepts. */
    scope: S;
    now?: number;
    clockSkewSeconds?: number;
}
type ClaimsOf<S extends ShareTokenScope> = Extract<ShareClaims, {
    scope: S;
}>;
/** Never throws: an invalid token is `{ ok: false, reason }`, for the endpoint to answer 401/403. */
export declare function verifyShareToken<S extends ShareTokenScope>(token: string | undefined | null, secret: string, options: VerifyShareTokenOptions<S>): Promise<ShareTokenResult<ClaimsOf<S>>>;
export {};
