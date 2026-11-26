/** Base64 without Buffer, so the module runs on any server runtime (Node, edge). */
export declare function base64FromBytes(bytes: Uint8Array): string;
export declare const base64UrlFromBytes: (bytes: Uint8Array) => string;
export declare function bytesFromBase64Url(encoded: string): Uint8Array<ArrayBuffer>;
export declare const wrapBase64Lines: (base64: string) => string;
