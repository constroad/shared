import { sendGmailMessage, sendGmailWithRefreshToken } from './gmailSend';
import type { MailMessage } from './mimeMessage';

const MESSAGE: MailMessage = { from: 'ventas@globofast.pe', fromName: 'Globofast', to: ['compras@ferreyros.pe'], subject: 'Cotización', text: 'Hola', attachments: [] };
const CLIENT = { clientId: 'id', clientSecret: 'secret' };
const answer = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const googleError = (status: number, reason: string, message = 'x') => answer(status, { error: { code: status, message, errors: [{ reason, message }] } });

describe('sendGmailMessage', () => {
  it('uploads the MIME message with the access token and gives the Gmail id', async () => {
    const fetch = jest.fn().mockResolvedValue(answer(200, { id: '18c1', threadId: '18c1', labelIds: ['SENT'] }));
    await expect(sendGmailMessage('ya29.token', MESSAGE, { fetch })).resolves.toEqual({ id: '18c1', threadId: '18c1' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ Authorization: 'Bearer ya29.token', 'Content-Type': 'message/rfc822' });
    expect(String(init.body)).toContain('To: compras@ferreyros.pe');
  });

  it('never calls Google with an address that is not an email', async () => {
    const fetch = jest.fn();
    await expect(sendGmailMessage('t', { ...MESSAGE, to: ['malo'] }, { fetch })).rejects.toMatchObject({ code: 'invalid_recipient', invalid: ['malo'] });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'authError', 'auth_revoked'],
    [403, 'insufficientPermissions', 'scope_missing'],
    [403, 'dailyLimitExceeded', 'quota_exceeded'],
    [429, 'rateLimitExceeded', 'quota_exceeded'],
    [400, 'invalidArgument', 'invalid_recipient'],
    [400, 'failedPrecondition', 'bad_response'],
  ])('maps a %i %s to %s', async (status, reason, code) => {
    const fetch = jest.fn().mockResolvedValue(googleError(status, reason, reason === 'invalidArgument' ? 'Invalid To header' : 'x'));
    await expect(sendGmailMessage('t', MESSAGE, { fetch })).rejects.toMatchObject({ code });
  });

  it('says Google is unavailable on a 5xx', async () => {
    await expect(sendGmailMessage('t', MESSAGE, { fetch: jest.fn().mockResolvedValue(answer(503, {})) })).rejects.toMatchObject({ code: 'unavailable' });
  });
});

describe('sendGmailWithRefreshToken', () => {
  it('refreshes the access token, then sends with it', async () => {
    const fetch = jest.fn()
      .mockResolvedValueOnce(answer(200, { access_token: 'ya29.fresh', expires_in: 3600 }))
      .mockResolvedValueOnce(answer(200, { id: 'm1', threadId: 't1' }));
    await expect(sendGmailWithRefreshToken({ ...CLIENT, refreshToken: '1//r' }, MESSAGE, { fetch })).resolves.toEqual({ id: 'm1', threadId: 't1' });
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer ya29.fresh');
  });

  it('stops before sending when the grant was revoked', async () => {
    const fetch = jest.fn().mockResolvedValueOnce(answer(400, { error: 'invalid_grant' }));
    await expect(sendGmailWithRefreshToken({ ...CLIENT, refreshToken: 'old' }, MESSAGE, { fetch })).rejects.toMatchObject({ code: 'auth_revoked' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
