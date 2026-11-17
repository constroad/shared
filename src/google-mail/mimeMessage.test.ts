import { GMAIL_MAX_MESSAGE_BYTES, buildMimeMessage, type MailMessage } from './mimeMessage';

const PDF = new TextEncoder().encode('%PDF-1.7 fake quote');
const MESSAGE: MailMessage = {
  from: 'ventas@globofast.pe',
  fromName: 'Globofast · Ventas',
  to: ['compras@ferreyros.pe', 'Carlos@Ferreyros.pe'],
  cc: ['jefe@ferreyros.pe'],
  subject: 'Cotización COT - 0000148 · Ferreyros',
  text: 'Buenos días:\nAdjuntamos la cotización.',
  attachments: [{ fileName: 'COT-0000148.pdf', contentType: 'application/pdf', content: PDF }],
};

const headerOf = (mime: string, name: string) => mime.split('\r\n\r\n')[0].split('\r\n').find((line) => line.startsWith(`${name}: `));
const decodeWords = (value: string) => value.replace(/=\?UTF-8\?B\?([^?]+)\?=/g, (_match, base64: string) => Buffer.from(base64, 'base64').toString('utf8')).replace(/\r\n /g, '');
const partsOf = (mime: string) => mime.split(/--[^\r\n]+\r\n/).slice(1);

describe('buildMimeMessage', () => {
  it('encodes the sender name and the subject in UTF-8 words', () => {
    const mime = buildMimeMessage(MESSAGE, 'b1');
    expect(decodeWords(headerOf(mime, 'From') ?? '')).toBe('From: Globofast · Ventas <ventas@globofast.pe>');
    expect(decodeWords(mime.match(/Subject: [^]*?\r\n(?! )/)?.[0] ?? '').trim()).toBe('Subject: Cotización COT - 0000148 · Ferreyros');
    expect(headerOf(mime, 'To')).toBe('To: compras@ferreyros.pe, Carlos@Ferreyros.pe');
    expect(headerOf(mime, 'Cc')).toBe('Cc: jefe@ferreyros.pe');
  });

  it('keeps every encoded word within the 75 characters of the RFC', () => {
    const mime = buildMimeMessage({ ...MESSAGE, subject: `Informe ${'ñ'.repeat(90)}` }, 'b1');
    const words = mime.match(/=\?UTF-8\?B\?[^?]+\?=/g) ?? [];
    expect(words.length).toBeGreaterThan(1);
    expect(Math.max(...words.map((word) => word.length))).toBeLessThanOrEqual(75);
  });

  it('carries the text and the PDF as base64 parts', () => {
    const [text, pdf] = partsOf(buildMimeMessage(MESSAGE, 'b1'));
    expect(text).toContain('Content-Type: text/plain; charset=UTF-8');
    expect(Buffer.from(text.split('\r\n\r\n')[1], 'base64').toString('utf8')).toBe('Buenos días:\r\nAdjuntamos la cotización.');
    expect(pdf).toContain('Content-Disposition: attachment; filename="COT-0000148.pdf"');
    expect(Buffer.from(pdf.split('\r\n\r\n')[1].replace(/\r\n--b1--[^]*$/, ''), 'base64').toString('utf8')).toBe('%PDF-1.7 fake quote');
  });

  it('names an attachment with accents with an ASCII fallback and its UTF-8 name', () => {
    const mime = buildMimeMessage({ ...MESSAGE, attachments: [{ fileName: 'Acta de conformidad Ñaña.pdf', contentType: 'application/pdf', content: PDF }] }, 'b1');
    expect(mime).toContain('filename="Acta de conformidad Nana.pdf"; filename*=UTF-8\'\'Acta%20de%20conformidad%20%C3%91a%C3%B1a.pdf');
  });

  it('leaves out Cc when there is none', () => {
    expect(headerOf(buildMimeMessage({ ...MESSAGE, cc: [] }, 'b1'), 'Cc')).toBeUndefined();
  });

  it('refuses a header with a line break, which would add recipients', () => {
    expect(() => buildMimeMessage({ ...MESSAGE, subject: 'Hola\r\nBcc: ataque@x.pe' }, 'b1')).toThrow(expect.objectContaining({ code: 'invalid_message' }));
    expect(() => buildMimeMessage({ ...MESSAGE, fromName: 'Ventas\nBcc: x@y.pe' }, 'b1')).toThrow(expect.objectContaining({ code: 'invalid_message' }));
  });

  it('names every address that is not an email', () => {
    expect(() => buildMimeMessage({ ...MESSAGE, to: ['bien@x.pe', 'malo', 'a@b'], cc: ['otro, @x.pe'] }, 'b1')).toThrow(expect.objectContaining({ code: 'invalid_recipient', invalid: ['malo', 'a@b', 'otro, @x.pe'] }));
    expect(() => buildMimeMessage({ ...MESSAGE, to: [] }, 'b1')).toThrow(expect.objectContaining({ code: 'invalid_recipient' }));
  });

  it('refuses a message over the Gmail limit before calling Google', () => {
    const huge = { fileName: 'grande.pdf', contentType: 'application/pdf', content: new Uint8Array(GMAIL_MAX_MESSAGE_BYTES) };
    expect(() => buildMimeMessage({ ...MESSAGE, attachments: [huge] }, 'b1')).toThrow(expect.objectContaining({ code: 'message_too_large' }));
  });

  it('draws a different boundary each time when none is given', () => {
    const boundaryOf = (mime: string) => mime.match(/boundary="([^"]+)"/)?.[1];
    expect(boundaryOf(buildMimeMessage(MESSAGE))).not.toBe(boundaryOf(buildMimeMessage(MESSAGE)));
  });
});
