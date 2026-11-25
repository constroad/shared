/** One call to Google with a deadline. No answer, a network error or a 5xx is `unavailable`. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;
export interface GoogleRequestOptions {
    /** Injected in tests; the runtime's `fetch` otherwise. */
    fetch?: FetchLike;
    timeoutMs?: number;
}
export interface GoogleAnswer {
    status: number;
    body: Record<string, unknown>;
}
export declare const GOOGLE_TIMEOUT_MS = 8000;
export declare function googleRequest(url: string, init: RequestInit, options?: GoogleRequestOptions): Promise<GoogleAnswer>;
