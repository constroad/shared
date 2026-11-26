import { type GoogleRequestOptions } from './googleRequest';
/**
 * «Continuar con Google» for a mailbox: the authorization URL, the exchange of
 * the code and the refresh. It asks for `gmail.send` only (send, never read)
 * and for the address. Storing the tokens is the app's job, sealed per company.
 */
export declare const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export declare const GOOGLE_MAIL_SCOPES: readonly ["openid", "email", "https://www.googleapis.com/auth/gmail.send"];
export interface GoogleClient {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}
export interface GoogleMailGrant {
    /** The mailbox that granted it, lowercase: the «De» of every mail. */
    email: string;
    accessToken: string;
    /** The only thing the app must keep, sealed. */
    refreshToken: string;
    expiresAt: number;
    scopes: string[];
}
export interface GoogleAccessToken {
    accessToken: string;
    expiresAt: number;
}
type ClockOptions = GoogleRequestOptions & {
    now?: number;
};
export declare function buildGoogleAuthUrl(input: {
    clientId: string;
    redirectUri: string;
    state: string;
    loginHint?: string;
}): string;
export declare function exchangeGoogleCode(input: GoogleClient & {
    code: string;
}, options?: ClockOptions): Promise<GoogleMailGrant>;
export declare function refreshGoogleAccessToken(input: Omit<GoogleClient, 'redirectUri'> & {
    refreshToken: string;
}, options?: ClockOptions): Promise<GoogleAccessToken>;
/** On disconnect. A token Google already dropped counts as revoked. */
export declare function revokeGoogleToken(token: string, options?: GoogleRequestOptions): Promise<true>;
export {};
