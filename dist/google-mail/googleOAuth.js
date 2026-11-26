"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GOOGLE_MAIL_SCOPES = exports.GMAIL_SEND_SCOPE = void 0;
exports.buildGoogleAuthUrl = buildGoogleAuthUrl;
exports.exchangeGoogleCode = exchangeGoogleCode;
exports.refreshGoogleAccessToken = refreshGoogleAccessToken;
exports.revokeGoogleToken = revokeGoogleToken;
const base64_1 = require("./base64");
const googleMailError_1 = require("./googleMailError");
const googleRequest_1 = require("./googleRequest");
/**
 * «Continuar con Google» for a mailbox: the authorization URL, the exchange of
 * the code and the refresh. It asks for `gmail.send` only (send, never read)
 * and for the address. Storing the tokens is the app's job, sealed per company.
 */
exports.GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
exports.GOOGLE_MAIL_SCOPES = ['openid', 'email', exports.GMAIL_SEND_SCOPE];
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const MS_PER_SECOND = 1000;
const BAD_REQUEST = 400;
const FORM_HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded' };
function buildGoogleAuthUrl(input) {
    const params = new URLSearchParams({
        client_id: input.clientId,
        redirect_uri: input.redirectUri,
        response_type: 'code',
        scope: exports.GOOGLE_MAIL_SCOPES.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
        state: input.state,
    });
    if (input.loginHint)
        params.set('login_hint', input.loginHint);
    return `${AUTH_URL}?${params.toString()}`;
}
const postForm = (url, form, options) => (0, googleRequest_1.googleRequest)(url, { method: 'POST', headers: FORM_HEADERS, body: new URLSearchParams(form).toString() }, options);
/** A refused token call: `invalid_grant` means a used code on exchange and a revoked grant on refresh. */
function tokenFailure(answer, onInvalidGrant) {
    const error = String(answer.body.error ?? '');
    if (error === 'invalid_grant')
        return new googleMailError_1.GoogleMailError(onInvalidGrant, onInvalidGrant === 'auth_revoked' ? 'Google revoked the access to this mailbox.' : 'The Google code expired. Start again.');
    if (error === 'invalid_client' || error === 'unauthorized_client' || error === 'redirect_uri_mismatch')
        return new googleMailError_1.GoogleMailError('bad_config', `Google refused the OAuth client (${error}).`);
    return new googleMailError_1.GoogleMailError('bad_response', `Google refused the token call (${answer.status} ${error}).`);
}
function verifiedEmailOf(idToken) {
    try {
        const claims = JSON.parse(new TextDecoder().decode((0, base64_1.bytesFromBase64Url)(String(idToken).split('.')[1] ?? '')));
        if (typeof claims.email === 'string' && claims.email_verified === true)
            return claims.email.trim().toLowerCase();
    }
    catch {
        // Falls through to the refusal below.
    }
    throw new googleMailError_1.GoogleMailError('bad_response', 'Google did not say which verified mailbox granted access.');
}
function grantOf(body, now) {
    const scopes = String(body.scope ?? '').split(' ').filter(Boolean);
    if (!scopes.includes(exports.GMAIL_SEND_SCOPE))
        throw new googleMailError_1.GoogleMailError('scope_missing', 'The permission to send email was not granted.');
    if (typeof body.access_token !== 'string' || typeof body.refresh_token !== 'string')
        throw new googleMailError_1.GoogleMailError('bad_response', 'Google gave no refresh token.');
    return { email: verifiedEmailOf(body.id_token), accessToken: body.access_token, refreshToken: body.refresh_token, expiresAt: now + Number(body.expires_in ?? 0) * MS_PER_SECOND, scopes };
}
async function exchangeGoogleCode(input, options = {}) {
    const answer = await postForm(TOKEN_URL, { grant_type: 'authorization_code', code: input.code, client_id: input.clientId, client_secret: input.clientSecret, redirect_uri: input.redirectUri }, options);
    if (answer.status >= BAD_REQUEST)
        throw tokenFailure(answer, 'invalid_state');
    return grantOf(answer.body, options.now ?? Date.now());
}
async function refreshGoogleAccessToken(input, options = {}) {
    const answer = await postForm(TOKEN_URL, { grant_type: 'refresh_token', refresh_token: input.refreshToken, client_id: input.clientId, client_secret: input.clientSecret }, options);
    if (answer.status >= BAD_REQUEST)
        throw tokenFailure(answer, 'auth_revoked');
    if (typeof answer.body.access_token !== 'string')
        throw new googleMailError_1.GoogleMailError('bad_response', 'Google gave no access token.');
    return { accessToken: answer.body.access_token, expiresAt: (options.now ?? Date.now()) + Number(answer.body.expires_in ?? 0) * MS_PER_SECOND };
}
/** On disconnect. A token Google already dropped counts as revoked. */
async function revokeGoogleToken(token, options = {}) {
    const answer = await postForm(REVOKE_URL, { token }, options);
    if (answer.status >= BAD_REQUEST && answer.body.error !== 'invalid_token')
        throw new googleMailError_1.GoogleMailError('bad_response', `Google refused the revocation (${answer.status}).`);
    return true;
}
