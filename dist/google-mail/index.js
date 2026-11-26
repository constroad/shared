"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
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
__exportStar(require("./googleMailError"), exports);
__exportStar(require("./googleRequest"), exports);
__exportStar(require("./oauthState"), exports);
__exportStar(require("./googleOAuth"), exports);
__exportStar(require("./mimeMessage"), exports);
__exportStar(require("./gmailSend"), exports);
__exportStar(require("./googleButton"), exports);
