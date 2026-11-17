import { GMAIL_SEND_SCOPE, buildGoogleAuthUrl, exchangeGoogleCode, refreshGoogleAccessToken, revokeGoogleToken } from './googleOAuth';

const CLIENT = { clientId: 'client-id.apps.googleusercontent.com', clientSecret: 'client-secret', redirectUri: 'https://portal.test/api/integrations/google/callback' };
const NOW = 1_800_000_000_000;

const idTokenFor = (claims: Record<string, unknown>) => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
const answer = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const fetchReturning = (...responses: Array<Response | Error>) => {
  const fetch = jest.fn();
  for (const response of responses) {
    if (response instanceof Error) fetch.mockRejectedValueOnce(response);
    else fetch.mockResolvedValueOnce(response);
  }
  return fetch;
};
const formOf = (fetch: jest.Mock, call = 0) => new URLSearchParams(String(fetch.mock.calls[call][1].body));

const GRANTED = {
  access_token: 'ya29.access',
  refresh_token: '1//refresh',
  expires_in: 3599,
  scope: `openid ${GMAIL_SEND_SCOPE} https://www.googleapis.com/auth/userinfo.email`,
  id_token: idTokenFor({ email: 'Ventas@Globofast.pe', email_verified: true }),
};

describe('buildGoogleAuthUrl', () => {
  it('asks only to send mail and to know the address, offline and with consent', () => {
    const url = new URL(buildGoogleAuthUrl({ clientId: CLIENT.clientId, redirectUri: CLIENT.redirectUri, state: 'signed.state', loginHint: 'ventas@globofast.pe' }));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('scope')).toBe(`openid email ${GMAIL_SEND_SCOPE}`);
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('signed.state');
    expect(url.searchParams.get('redirect_uri')).toBe(CLIENT.redirectUri);
    expect(url.searchParams.get('login_hint')).toBe('ventas@globofast.pe');
  });

  it('leaves out the hint when there is none', () => {
    const url = new URL(buildGoogleAuthUrl({ clientId: CLIENT.clientId, redirectUri: CLIENT.redirectUri, state: 's.s' }));
    expect(url.searchParams.has('login_hint')).toBe(false);
  });
});

describe('exchangeGoogleCode', () => {
  it('gives the tokens and the mailbox that granted them', async () => {
    const fetch = fetchReturning(answer(200, GRANTED));
    const grant = await exchangeGoogleCode({ ...CLIENT, code: '4/code' }, { fetch, now: NOW });
    expect(grant).toEqual({ email: 'ventas@globofast.pe', accessToken: 'ya29.access', refreshToken: '1//refresh', expiresAt: NOW + 3599_000, scopes: GRANTED.scope.split(' ') });
    expect(fetch.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token');
    expect(Object.fromEntries(formOf(fetch))).toEqual({ grant_type: 'authorization_code', code: '4/code', client_id: CLIENT.clientId, client_secret: CLIENT.clientSecret, redirect_uri: CLIENT.redirectUri });
  });

  it('refuses a grant without «send email», which the person can untick', async () => {
    const fetch = fetchReturning(answer(200, { ...GRANTED, scope: 'openid email' }));
    await expect(exchangeGoogleCode({ ...CLIENT, code: '4/code' }, { fetch })).rejects.toMatchObject({ code: 'scope_missing' });
  });

  it('refuses a grant without a refresh token or without a verified address', async () => {
    await expect(exchangeGoogleCode({ ...CLIENT, code: 'c' }, { fetch: fetchReturning(answer(200, { ...GRANTED, refresh_token: undefined })) })).rejects.toMatchObject({ code: 'bad_response' });
    const unverified = { ...GRANTED, id_token: idTokenFor({ email: 'x@y.pe', email_verified: false }) };
    await expect(exchangeGoogleCode({ ...CLIENT, code: 'c' }, { fetch: fetchReturning(answer(200, unverified)) })).rejects.toMatchObject({ code: 'bad_response' });
  });

  it('says a used or expired code must start again', async () => {
    const fetch = fetchReturning(answer(400, { error: 'invalid_grant', error_description: 'Bad Request' }));
    await expect(exchangeGoogleCode({ ...CLIENT, code: 'used' }, { fetch })).rejects.toMatchObject({ code: 'invalid_state' });
  });

  it('says the app is misconfigured when Google does not know the client', async () => {
    const fetch = fetchReturning(answer(401, { error: 'invalid_client' }));
    await expect(exchangeGoogleCode({ ...CLIENT, code: 'c' }, { fetch })).rejects.toMatchObject({ code: 'bad_config' });
  });
});

describe('refreshGoogleAccessToken', () => {
  it('gives a fresh access token', async () => {
    const fetch = fetchReturning(answer(200, { access_token: 'ya29.new', expires_in: 3600, scope: GMAIL_SEND_SCOPE }));
    await expect(refreshGoogleAccessToken({ ...CLIENT, refreshToken: '1//refresh' }, { fetch, now: NOW })).resolves.toEqual({ accessToken: 'ya29.new', expiresAt: NOW + 3600_000 });
    expect(Object.fromEntries(formOf(fetch))).toEqual({ grant_type: 'refresh_token', refresh_token: '1//refresh', client_id: CLIENT.clientId, client_secret: CLIENT.clientSecret });
  });

  it('says the mailbox must reconnect when Google revoked the grant', async () => {
    const fetch = fetchReturning(answer(400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }));
    await expect(refreshGoogleAccessToken({ ...CLIENT, refreshToken: 'old' }, { fetch })).rejects.toMatchObject({ code: 'auth_revoked' });
  });

  it('says Google is unavailable on a 5xx, a network error or the deadline', async () => {
    await expect(refreshGoogleAccessToken({ ...CLIENT, refreshToken: 'r' }, { fetch: fetchReturning(answer(503, {})) })).rejects.toMatchObject({ code: 'unavailable' });
    await expect(refreshGoogleAccessToken({ ...CLIENT, refreshToken: 'r' }, { fetch: fetchReturning(new TypeError('fetch failed')) })).rejects.toMatchObject({ code: 'unavailable' });
    const hanging = jest.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted')))));
    await expect(refreshGoogleAccessToken({ ...CLIENT, refreshToken: 'r' }, { fetch: hanging, timeoutMs: 5 })).rejects.toMatchObject({ code: 'unavailable' });
  });
});

describe('revokeGoogleToken', () => {
  it('revokes the grant and accepts one that was already revoked', async () => {
    const fetch = fetchReturning(answer(200, {}), answer(400, { error: 'invalid_token' }));
    await expect(revokeGoogleToken('1//refresh', { fetch })).resolves.toBe(true);
    await expect(revokeGoogleToken('1//refresh', { fetch })).resolves.toBe(true);
    expect(fetch.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/revoke');
    expect(formOf(fetch).get('token')).toBe('1//refresh');
  });
});
