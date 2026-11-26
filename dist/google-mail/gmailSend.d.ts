import { type GoogleClient } from './googleOAuth';
import { type GoogleRequestOptions } from './googleRequest';
import { type MailMessage } from './mimeMessage';
export interface GmailSent {
    id: string;
    threadId: string;
}
export declare function sendGmailMessage(accessToken: string, message: MailMessage, options?: GoogleRequestOptions): Promise<GmailSent>;
/** What an app calls per send: it keeps only the sealed refresh token, never an access token. */
export declare function sendGmailWithRefreshToken(input: Omit<GoogleClient, 'redirectUri'> & {
    refreshToken: string;
}, message: MailMessage, options?: GoogleRequestOptions): Promise<GmailSent>;
