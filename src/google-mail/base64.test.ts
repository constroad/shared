import { base64FromBytes, base64UrlFromBytes, bytesFromBase64Url, wrapBase64Lines } from './base64';

const bytesOf = (text: string) => new TextEncoder().encode(text);

describe('base64', () => {
  it('encodes bytes like Node does, including the padding cases', () => {
    for (const text of ['', 'a', 'ab', 'abc', 'Cotización ñandú', 'x'.repeat(70000)]) {
      expect(base64FromBytes(bytesOf(text))).toBe(Buffer.from(text, 'utf8').toString('base64'));
    }
  });

  it('round-trips base64url without padding', () => {
    const bytes = new Uint8Array([251, 255, 191, 0, 62, 63]);
    const encoded = base64UrlFromBytes(bytes);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(Array.from(bytesFromBase64Url(encoded))).toEqual(Array.from(bytes));
  });

  it('wraps at 76 characters with CRLF, as MIME asks', () => {
    const wrapped = wrapBase64Lines('A'.repeat(160));
    expect(wrapped.split('\r\n').map((line) => line.length)).toEqual([76, 76, 8]);
  });
});
