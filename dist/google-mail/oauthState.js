"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAUTH_STATE_MAX_AGE_MS = void 0;
exports.signOAuthState = signOAuthState;
exports.verifyOAuthState = verifyOAuthState;
const base64_1 = require("./base64");
const googleMailError_1 = require("./googleMailError");
exports.OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;
const encoder = new TextEncoder();
async function hmacKey(secret) {
    if (!secret)
        throw new googleMailError_1.GoogleMailError('bad_config', 'The OAuth state needs a secret.');
    return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function signOAuthState(payload, secret, now = Date.now()) {
    const key = await hmacKey(secret);
    const body = (0, base64_1.base64UrlFromBytes)(encoder.encode(JSON.stringify({ ...payload, iat: now })));
    const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(body)));
    return `${body}.${(0, base64_1.base64UrlFromBytes)(signature)}`;
}
const refuse = () => {
    throw new googleMailError_1.GoogleMailError('invalid_state', 'The connection request expired or was altered. Start it again.');
};
function payloadOf(body) {
    try {
        const parsed = JSON.parse(new TextDecoder().decode((0, base64_1.bytesFromBase64Url)(body)));
        return parsed && typeof parsed === 'object' && typeof parsed.iat === 'number' ? parsed : refuse();
    }
    catch {
        return refuse();
    }
}
/** Verifies with the HMAC (constant time) and gives back the payload without its timestamp. */
async function verifyOAuthState(state, secret, now = Date.now()) {
    const parts = (state ?? '').split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1])
        return refuse();
    const key = await hmacKey(secret);
    let signature;
    try {
        signature = (0, base64_1.bytesFromBase64Url)(parts[1]);
    }
    catch {
        return refuse();
    }
    if (!(await crypto.subtle.verify('HMAC', key, signature, encoder.encode(parts[0]))))
        return refuse();
    const { iat, ...payload } = payloadOf(parts[0]);
    if (now - iat > exports.OAUTH_STATE_MAX_AGE_MS || iat - now > exports.OAUTH_STATE_MAX_AGE_MS)
        return refuse();
    return payload;
}
