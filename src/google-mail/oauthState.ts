import { base64UrlFromBytes, bytesFromBase64Url } from './base64';
import { GoogleMailError } from './googleMailError';

/**
 * The `state` that travels to Google and back: what the app needs on the return
 * (which company, where to go back) signed with HMAC-SHA256, so nobody can hand
 * the callback a code for another company. It lasts ten minutes.
 */

export type OAuthStatePayload = Record<string, string>;

export const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

const encoder = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  if (!secret) throw new GoogleMailError('bad_config', 'The OAuth state needs a secret.');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signOAuthState(payload: OAuthStatePayload, secret: string, now: number = Date.now()): Promise<string> {
  const key = await hmacKey(secret);
  const body = base64UrlFromBytes(encoder.encode(JSON.stringify({ ...payload, iat: now })));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(body)));
  return `${body}.${base64UrlFromBytes(signature)}`;
}

const refuse = (): never => {
  throw new GoogleMailError('invalid_state', 'The connection request expired or was altered. Start it again.');
};

function payloadOf(body: string): { iat: number } & OAuthStatePayload {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytesFromBase64Url(body)));
    return parsed && typeof parsed === 'object' && typeof parsed.iat === 'number' ? parsed : refuse();
  } catch {
    return refuse();
  }
}

/** Verifies with the HMAC (constant time) and gives back the payload without its timestamp. */
export async function verifyOAuthState(state: string | undefined, secret: string, now: number = Date.now()): Promise<OAuthStatePayload> {
  const parts = (state ?? '').split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return refuse();
  const key = await hmacKey(secret);
  let signature: Uint8Array<ArrayBuffer>;
  try {
    signature = bytesFromBase64Url(parts[1]);
  } catch {
    return refuse();
  }
  if (!(await crypto.subtle.verify('HMAC', key, signature, encoder.encode(parts[0])))) return refuse();
  const { iat, ...payload } = payloadOf(parts[0]);
  if (now - iat > OAUTH_STATE_MAX_AGE_MS || iat - now > OAUTH_STATE_MAX_AGE_MS) return refuse();
  return payload;
}
