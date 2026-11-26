"use strict";
/** Base64 without Buffer, so the module runs on any server runtime (Node, edge). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapBase64Lines = exports.base64UrlFromBytes = void 0;
exports.base64FromBytes = base64FromBytes;
exports.bytesFromBase64Url = bytesFromBase64Url;
const CHUNK_BYTES = 0x8000;
const MIME_LINE_LENGTH = 76;
function base64FromBytes(bytes) {
    let binary = '';
    for (let start = 0; start < bytes.length; start += CHUNK_BYTES) {
        binary += String.fromCharCode(...bytes.subarray(start, start + CHUNK_BYTES));
    }
    return btoa(binary);
}
const base64UrlFromBytes = (bytes) => base64FromBytes(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
exports.base64UrlFromBytes = base64UrlFromBytes;
function bytesFromBase64Url(encoded) {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
const wrapBase64Lines = (base64) => base64.match(new RegExp(`.{1,${MIME_LINE_LENGTH}}`, 'g'))?.join('\r\n') ?? '';
exports.wrapBase64Lines = wrapBase64Lines;
