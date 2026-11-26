/** Text stamped on every page shown without download: which link (and who) it leaked from. */
export declare const WATERMARK_MAX_LENGTH = 120;
/** «Enlace AB12CD · cliente@correo.com · 25/11/2026 14:05», in Lima time; the viewer only when identified. */
export declare function watermarkText({ linkCode, viewer, at }: {
    linkCode: string;
    viewer?: string;
    at: Date | string | number;
}): string;
