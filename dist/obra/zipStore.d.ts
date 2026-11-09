/** The UTF-8 bytes of a text: the zip entry name and the KML itself. */
export declare const utf8: (text: string) => Uint8Array;
export declare function crc32(bytes: Uint8Array): number;
export declare function zipOneFile(fileName: string, content: Uint8Array): Uint8Array<ArrayBuffer>;
