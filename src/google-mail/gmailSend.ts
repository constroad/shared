import { GoogleMailError } from './googleMailError';
import { refreshGoogleAccessToken, type GoogleClient } from './googleOAuth';
import { googleRequest, type GoogleAnswer, type GoogleRequestOptions } from './googleRequest';
import { buildMimeMessage, type MailMessage } from './mimeMessage';

/**
 * Sends through the Gmail API (`users.messages.send`, upload endpoint) with the
 * `gmail.send` grant. SMTP with XOAUTH2 would need the full mailbox scope, which
 * Google restricts and audits; this one does not.
 */

const SEND_URL = 'https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media';
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const TOO_MANY = 429;
const BAD_REQUEST = 400;
const QUOTA_REASONS = new Set(['dailyLimitExceeded', 'rateLimitExceeded', 'userRateLimitExceeded', 'quotaExceeded']);

export interface GmailSent {
  id: string;
  threadId: string;
}

function reasonOf(answer: GoogleAnswer): { reason: string; message: string } {
  const error = (answer.body.error ?? {}) as { message?: string; errors?: Array<{ reason?: string }> };
  return { reason: error.errors?.[0]?.reason ?? '', message: error.message ?? '' };
}

function sendFailure(answer: GoogleAnswer): GoogleMailError {
  const { reason, message } = reasonOf(answer);
  if (answer.status === UNAUTHORIZED) return new GoogleMailError('auth_revoked', 'Google no longer accepts the access to this mailbox.');
  if (answer.status === TOO_MANY || QUOTA_REASONS.has(reason)) return new GoogleMailError('quota_exceeded', 'The mailbox reached Gmail\'s sending limit.');
  if (answer.status === FORBIDDEN) return new GoogleMailError('scope_missing', 'The permission to send email is missing.');
  if (answer.status === BAD_REQUEST && /recipient|to header|cc header|address/i.test(message)) return new GoogleMailError('invalid_recipient', 'Gmail refused a recipient.', []);
  return new GoogleMailError('bad_response', `Gmail refused the mail (${answer.status} ${reason}).`);
}

export async function sendGmailMessage(accessToken: string, message: MailMessage, options: GoogleRequestOptions = {}): Promise<GmailSent> {
  const mime = buildMimeMessage(message);
  const answer = await googleRequest(SEND_URL, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'message/rfc822' }, body: mime }, options);
  if (answer.status >= BAD_REQUEST) throw sendFailure(answer);
  if (typeof answer.body.id !== 'string') throw new GoogleMailError('bad_response', 'Gmail gave no message id.');
  return { id: answer.body.id, threadId: String(answer.body.threadId ?? answer.body.id) };
}

/** What an app calls per send: it keeps only the sealed refresh token, never an access token. */
export async function sendGmailWithRefreshToken(input: Omit<GoogleClient, 'redirectUri'> & { refreshToken: string }, message: MailMessage, options: GoogleRequestOptions = {}): Promise<GmailSent> {
  const { accessToken } = await refreshGoogleAccessToken(input, options);
  return sendGmailMessage(accessToken, message, options);
}
