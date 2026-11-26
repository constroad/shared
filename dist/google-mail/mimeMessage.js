"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GMAIL_MAX_MESSAGE_BYTES = void 0;
exports.buildMimeMessage = buildMimeMessage;
const base64_1 = require("./base64");
const googleMailError_1 = require("./googleMailError");
/** Gmail's limit for a message sent through the upload endpoint. */
exports.GMAIL_MAX_MESSAGE_BYTES = 35 * 1024 * 1024;
const BASE64_GROWTH = 4 / 3;
const ENCODED_WORD_BYTES = 45;
const ADDRESS = /^[^\s@<>,;"()\\[\]]+@[^\s@<>,;"()\\[\]]+\.[^\s@<>,;"()\\[\]]{2,}$/;
const LINE_BREAK = /[\r\n]/;
const ASCII_PRINTABLE = /^[\x20-\x7e]*$/;
const encoder = new TextEncoder();
function headerValue(value, field) {
    if (LINE_BREAK.test(value))
        throw new googleMailError_1.GoogleMailError('invalid_message', `The ${field} carries a line break.`);
    return value.trim();
}
/** RFC 2047 words of at most 75 characters, split on whole characters. */
function encodedWords(value) {
    if (ASCII_PRINTABLE.test(value))
        return value;
    const words = [];
    let chunk = '';
    for (const char of value) {
        if (encoder.encode(chunk + char).length > ENCODED_WORD_BYTES) {
            words.push(chunk);
            chunk = '';
        }
        chunk += char;
    }
    words.push(chunk);
    return words.map((word) => `=?UTF-8?B?${(0, base64_1.base64FromBytes)(encoder.encode(word))}?=`).join('\r\n ');
}
function checkedRecipients(message) {
    const to = message.to.map((address) => address.trim());
    const cc = (message.cc ?? []).map((address) => address.trim());
    const invalid = [...to, ...cc].filter((address) => !ADDRESS.test(address));
    if (invalid.length > 0)
        throw new googleMailError_1.GoogleMailError('invalid_recipient', 'Some addresses are not emails.', invalid);
    if (to.length === 0)
        throw new googleMailError_1.GoogleMailError('invalid_recipient', 'The mail has no recipient.', []);
    return { to, cc };
}
function fromHeader(message) {
    const address = headerValue(message.from, 'sender');
    if (!ADDRESS.test(address))
        throw new googleMailError_1.GoogleMailError('invalid_message', 'The sender is not an email.');
    const name = message.fromName ? headerValue(message.fromName, 'sender name').replace(/"/g, "'") : '';
    if (!name)
        return address;
    return ASCII_PRINTABLE.test(name) ? `"${name}" <${address}>` : `${encodedWords(name)} <${address}>`;
}
function attachmentPart(attachment) {
    const name = headerValue(attachment.fileName, 'file name').replace(/"/g, "'");
    const ascii = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '_');
    const disposition = ascii === name ? `filename="${name}"` : `filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
    return [
        `Content-Type: ${headerValue(attachment.contentType, 'content type')}; name="${ascii}"`,
        `Content-Disposition: attachment; ${disposition}`,
        'Content-Transfer-Encoding: base64',
        '',
        (0, base64_1.wrapBase64Lines)((0, base64_1.base64FromBytes)(attachment.content)),
    ];
}
function checkSize(message) {
    const bytes = (message.attachments ?? []).reduce((total, attachment) => total + attachment.content.length, encoder.encode(message.text).length);
    if (bytes * BASE64_GROWTH > exports.GMAIL_MAX_MESSAGE_BYTES)
        throw new googleMailError_1.GoogleMailError('message_too_large', 'The mail is over Gmail\'s 35 MB.');
}
const randomBoundary = () => `=_constroad_${Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
function buildMimeMessage(message, boundary = randomBoundary()) {
    const { to, cc } = checkedRecipients(message);
    checkSize(message);
    const headers = [`From: ${fromHeader(message)}`, `To: ${to.join(', ')}`, ...(cc.length ? [`Cc: ${cc.join(', ')}`] : []), `Subject: ${encodedWords(headerValue(message.subject, 'subject'))}`, 'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${boundary}"`];
    const text = ['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', (0, base64_1.wrapBase64Lines)((0, base64_1.base64FromBytes)(encoder.encode(message.text.replace(/\r?\n/g, '\r\n'))))];
    const parts = [text, ...(message.attachments ?? []).map(attachmentPart)];
    return [...headers, '', ...parts.flatMap((part) => [`--${boundary}`, ...part]), `--${boundary}--`, ''].join('\r\n');
}
