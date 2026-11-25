/**
 * Every failure of the Google mail flow carries one of these codes, so each app
 * maps it to its own message («Reconecta el correo en Integraciones») without
 * reading Google's text.
 */
export type GoogleMailErrorCode = 
/** The `state` of the return is missing, forged or older than its limit. */
'invalid_state'
/** The person unticked «send email» on Google's consent screen. */
 | 'scope_missing'
/** The refresh token no longer works: revoked, password changed, or account closed. */
 | 'auth_revoked'
/** An address of To or Cc is not an email, or Google refused it. */
 | 'invalid_recipient'
/** A header carries a line break, or the message has no subject or body. */
 | 'invalid_message'
/** The message with its attachments is over Gmail's limit. */
 | 'message_too_large'
/** Gmail's daily or per-second limit for this mailbox. */
 | 'quota_exceeded'
/** Google did not answer in time, or answered with a server error. */
 | 'unavailable'
/** The app's OAuth client is wrong (id, secret or redirect URI). */
 | 'bad_config'
/** Google answered something this module does not understand. */
 | 'bad_response';
export declare class GoogleMailError extends Error {
    readonly code: GoogleMailErrorCode;
    /** Addresses refused, for `invalid_recipient`. */
    readonly invalid?: string[];
    constructor(code: GoogleMailErrorCode, message: string, invalid?: string[]);
}
export declare const isGoogleMailError: (error: unknown) => error is GoogleMailError;
