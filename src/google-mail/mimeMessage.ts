import { base64FromBytes, wrapBase64Lines } from './base64';
import { GoogleMailError } from './googleMailError';

/**
 * The mail as Gmail receives it (RFC 5322 + MIME): plain text and attachments.
 * Header values with a line break are refused, never cleaned, because a break
 * is how someone adds a hidden Bcc.
 */

export interface MailAttachment {
  fileName: string;
  contentType: string;
  content: Uint8Array;
}

export interface MailMessage {
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
  attachments?: MailAttachment[];
}

/** Gmail's limit for a message sent through the upload endpoint. */
export const GMAIL_MAX_MESSAGE_BYTES = 35 * 1024 * 1024;
const BASE64_GROWTH = 4 / 3;
const ENCODED_WORD_BYTES = 45;
const ADDRESS = /^[^\s@<>,;"()\\[\]]+@[^\s@<>,;"()\\[\]]+\.[^\s@<>,;"()\\[\]]{2,}$/;
const LINE_BREAK = /[\r\n]/;
const ASCII_PRINTABLE = /^[\x20-\x7e]*$/;

const encoder = new TextEncoder();

function headerValue(value: string, field: string): string {
  if (LINE_BREAK.test(value)) throw new GoogleMailError('invalid_message', `The ${field} carries a line break.`);
  return value.trim();
}

/** RFC 2047 words of at most 75 characters, split on whole characters. */
function encodedWords(value: string): string {
  if (ASCII_PRINTABLE.test(value)) return value;
  const words: string[] = [];
  let chunk = '';
  for (const char of value) {
    if (encoder.encode(chunk + char).length > ENCODED_WORD_BYTES) {
      words.push(chunk);
      chunk = '';
    }
    chunk += char;
  }
  words.push(chunk);
  return words.map((word) => `=?UTF-8?B?${base64FromBytes(encoder.encode(word))}?=`).join('\r\n ');
}

function checkedRecipients(message: MailMessage): { to: string[]; cc: string[] } {
  const to = message.to.map((address) => address.trim());
  const cc = (message.cc ?? []).map((address) => address.trim());
  const invalid = [...to, ...cc].filter((address) => !ADDRESS.test(address));
  if (invalid.length > 0) throw new GoogleMailError('invalid_recipient', 'Some addresses are not emails.', invalid);
  if (to.length === 0) throw new GoogleMailError('invalid_recipient', 'The mail has no recipient.', []);
  return { to, cc };
}

function fromHeader(message: MailMessage): string {
  const address = headerValue(message.from, 'sender');
  if (!ADDRESS.test(address)) throw new GoogleMailError('invalid_message', 'The sender is not an email.');
  const name = message.fromName ? headerValue(message.fromName, 'sender name').replace(/"/g, "'") : '';
  if (!name) return address;
  return ASCII_PRINTABLE.test(name) ? `"${name}" <${address}>` : `${encodedWords(name)} <${address}>`;
}

function attachmentPart(attachment: MailAttachment): string[] {
  const name = headerValue(attachment.fileName, 'file name').replace(/"/g, "'");
  const ascii = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '_');
  const disposition = ascii === name ? `filename="${name}"` : `filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
  return [
    `Content-Type: ${headerValue(attachment.contentType, 'content type')}; name="${ascii}"`,
    `Content-Disposition: attachment; ${disposition}`,
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64Lines(base64FromBytes(attachment.content)),
  ];
}

function checkSize(message: MailMessage): void {
  const bytes = (message.attachments ?? []).reduce((total, attachment) => total + attachment.content.length, encoder.encode(message.text).length);
  if (bytes * BASE64_GROWTH > GMAIL_MAX_MESSAGE_BYTES) throw new GoogleMailError('message_too_large', 'The mail is over Gmail\'s 35 MB.');
}

const randomBoundary = (): string => `=_constroad_${Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;

export function buildMimeMessage(message: MailMessage, boundary: string = randomBoundary()): string {
  const { to, cc } = checkedRecipients(message);
  checkSize(message);
  const headers = [`From: ${fromHeader(message)}`, `To: ${to.join(', ')}`, ...(cc.length ? [`Cc: ${cc.join(', ')}`] : []), `Subject: ${encodedWords(headerValue(message.subject, 'subject'))}`, 'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${boundary}"`];
  const text = ['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrapBase64Lines(base64FromBytes(encoder.encode(message.text.replace(/\r?\n/g, '\r\n'))))];
  const parts = [text, ...(message.attachments ?? []).map(attachmentPart)];
  return [...headers, '', ...parts.flatMap((part) => [`--${boundary}`, ...part]), `--${boundary}--`, ''].join('\r\n');
}
