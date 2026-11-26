"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GOOGLE_TIMEOUT_MS = void 0;
exports.googleRequest = googleRequest;
const googleMailError_1 = require("./googleMailError");
exports.GOOGLE_TIMEOUT_MS = 8000;
const SERVER_ERROR = 500;
async function bodyOf(response) {
    const text = await response.text();
    if (!text)
        return {};
    try {
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === 'object' ? parsed : {};
    }
    catch {
        return {};
    }
}
async function googleRequest(url, init, options = {}) {
    const fetchImpl = options.fetch ?? ((target, request) => fetch(target, request));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? exports.GOOGLE_TIMEOUT_MS);
    try {
        const response = await fetchImpl(url, { ...init, signal: controller.signal });
        const body = await bodyOf(response);
        if (response.status >= SERVER_ERROR)
            throw new googleMailError_1.GoogleMailError('unavailable', `Google answered ${response.status}.`);
        return { status: response.status, body };
    }
    catch (error) {
        if (error instanceof googleMailError_1.GoogleMailError)
            throw error;
        throw new googleMailError_1.GoogleMailError('unavailable', 'Google did not answer in time.');
    }
    finally {
        clearTimeout(timer);
    }
}
