import { signOAuthState, verifyOAuthState } from './oauthState';

const SECRET = 'test-state-secret';
const NOW = 1_800_000_000_000;
const MINUTE = 60_000;

describe('OAuth state', () => {
  it('gives back what the app signed when Google returns it', async () => {
    const state = await signOAuthState({ companyId: 'test', returnTo: '/admin/empresa/integraciones' }, SECRET, NOW);
    await expect(verifyOAuthState(state, SECRET, NOW + MINUTE)).resolves.toEqual({ companyId: 'test', returnTo: '/admin/empresa/integraciones' });
  });

  it('refuses a state whose company was changed', async () => {
    const state = await signOAuthState({ companyId: 'test' }, SECRET, NOW);
    const [, signature] = state.split('.');
    const forged = `${Buffer.from(JSON.stringify({ companyId: 'otra', iat: NOW })).toString('base64url')}.${signature}`;
    await expect(verifyOAuthState(forged, SECRET, NOW)).rejects.toMatchObject({ code: 'invalid_state' });
  });

  it('refuses a state signed with another secret', async () => {
    const state = await signOAuthState({ companyId: 'test' }, 'other-secret', NOW);
    await expect(verifyOAuthState(state, SECRET, NOW)).rejects.toMatchObject({ code: 'invalid_state' });
  });

  it('refuses a state older than ten minutes', async () => {
    const state = await signOAuthState({ companyId: 'test' }, SECRET, NOW);
    await expect(verifyOAuthState(state, SECRET, NOW + 11 * MINUTE)).rejects.toMatchObject({ code: 'invalid_state' });
  });

  it.each(['', 'no-dot', 'a.b.c', '%%%.%%%', undefined])('refuses a malformed state (%p)', async (state) => {
    await expect(verifyOAuthState(state, SECRET, NOW)).rejects.toMatchObject({ code: 'invalid_state' });
  });

  it('refuses to sign without a secret', async () => {
    await expect(signOAuthState({ companyId: 'test' }, '', NOW)).rejects.toMatchObject({ code: 'bad_config' });
  });
});
