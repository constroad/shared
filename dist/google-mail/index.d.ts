/**
 * "Continue with Google" for a company's mailbox, shared by Portal and Dali
 * (José asked on 17/11/2026 that the button and the whole Google connection live
 * here, because Dali uses the same code). Server side, with no dependencies:
 * `fetch` and Web Crypto.
 * - `oauthState`: the signed `state` that ties Google's return to one company.
 * - `googleOAuth`: authorization URL (`gmail.send` + address), code exchange, refresh, revocation.
 * - `mimeMessage` + `gmailSend`: the mail with its PDF, sent through the Gmail API.
 * - `googleButton`: the label and the logo, for each app to draw its own button.
 * Each app keeps its OAuth client secret and stores the refresh token sealed per company.
 */
export * from './googleMailError';
export * from './googleRequest';
export * from './oauthState';
export * from './googleOAuth';
export * from './mimeMessage';
export * from './gmailSend';
export * from './googleButton';
