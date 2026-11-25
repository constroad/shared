/**
 * Drive shared without download (José, 25/11/2026): the rule of who may
 * download, the signed token of pages/downloads/protected reads, the watermark
 * text and the renderer limits. Portal and Inframaq sign; lila and Inframaq
 * verify. Pure and dependency-free (Web Crypto only).
 */
export * from './types';
export * from './limits';
export * from './policy';
export * from './watermark';
export * from './shareToken';
