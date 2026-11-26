"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendGmailMessage = sendGmailMessage;
exports.sendGmailWithRefreshToken = sendGmailWithRefreshToken;
const googleMailError_1 = require("./googleMailError");
const googleOAuth_1 = require("./googleOAuth");
const googleRequest_1 = require("./googleRequest");
const mimeMessage_1 = require("./mimeMessage");
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
function reasonOf(answer) {
    const error = (answer.body.error ?? {});
    return { reason: error.errors?.[0]?.reason ?? '', message: error.message ?? '' };
}
function sendFailure(answer) {
    const { reason, message } = reasonOf(answer);
    if (answer.status === UNAUTHORIZED)
        return new googleMailError_1.GoogleMailError('auth_revoked', 'Google no longer accepts the access to this mailbox.');
    if (answer.status === TOO_MANY || QUOTA_REASONS.has(reason))
        return new googleMailError_1.GoogleMailError('quota_exceeded', 'The mailbox reached Gmail\'s sending limit.');
    if (answer.status === FORBIDDEN)
        return new googleMailError_1.GoogleMailError('scope_missing', 'The permission to send email is missing.');
    if (answer.status === BAD_REQUEST && /recipient|to header|cc header|address/i.test(message))
        return new googleMailError_1.GoogleMailError('invalid_recipient', 'Gmail refused a recipient.', []);
    return new googleMailError_1.GoogleMailError('bad_response', `Gmail refused the mail (${answer.status} ${reason}).`);
}
async function sendGmailMessage(accessToken, message, options = {}) {
    const mime = (0, mimeMessage_1.buildMimeMessage)(message);
    const answer = await (0, googleRequest_1.googleRequest)(SEND_URL, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'message/rfc822' }, body: mime }, options);
    if (answer.status >= BAD_REQUEST)
        throw sendFailure(answer);
    if (typeof answer.body.id !== 'string')
        throw new googleMailError_1.GoogleMailError('bad_response', 'Gmail gave no message id.');
    return { id: answer.body.id, threadId: String(answer.body.threadId ?? answer.body.id) };
}
/** What an app calls per send: it keeps only the sealed refresh token, never an access token. */
async function sendGmailWithRefreshToken(input, message, options = {}) {
    const { accessToken } = await (0, googleOAuth_1.refreshGoogleAccessToken)(input, options);
    return sendGmailMessage(accessToken, message, options);
}
