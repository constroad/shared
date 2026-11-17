/** Base64 without Buffer, so the module runs on any server runtime (Node, edge). */

const CHUNK_BYTES = 0x8000;
const MIME_LINE_LENGTH = 76;

export function base64FromBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let start = 0; start < bytes.length; start += CHUNK_BYTES) {
    binary += String.fromCharCode(...bytes.subarray(start, start + CHUNK_BYTES));
  }
  return btoa(binary);
}

export const base64UrlFromBytes = (bytes: Uint8Array): string =>
  base64FromBytes(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function bytesFromBase64Url(encoded: string): Uint8Array<ArrayBuffer> {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export const wrapBase64Lines = (base64: string): string => base64.match(new RegExp(`.{1,${MIME_LINE_LENGTH}}`, 'g'))?.join('\r\n') ?? '';
