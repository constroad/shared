/**
 * The `state` that travels to Google and back: what the app needs on the return
 * (which company, where to go back) signed with HMAC-SHA256, so nobody can hand
 * the callback a code for another company. It lasts ten minutes.
 */
export type OAuthStatePayload = Record<string, string>;
export declare const OAUTH_STATE_MAX_AGE_MS: number;
export declare function signOAuthState(payload: OAuthStatePayload, secret: string, now?: number): Promise<string>;
/** Verifies with the HMAC (constant time) and gives back the payload without its timestamp. */
export declare function verifyOAuthState(state: string | undefined, secret: string, now?: number): Promise<OAuthStatePayload>;
