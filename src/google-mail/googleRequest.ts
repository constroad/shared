import { GoogleMailError } from './googleMailError';

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

export const GOOGLE_TIMEOUT_MS = 8000;
const SERVER_ERROR = 500;

async function bodyOf(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function googleRequest(url: string, init: RequestInit, options: GoogleRequestOptions = {}): Promise<GoogleAnswer> {
  const fetchImpl = options.fetch ?? ((target: string, request: RequestInit) => fetch(target, request));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? GOOGLE_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    const body = await bodyOf(response);
    if (response.status >= SERVER_ERROR) throw new GoogleMailError('unavailable', `Google answered ${response.status}.`);
    return { status: response.status, body };
  } catch (error) {
    if (error instanceof GoogleMailError) throw error;
    throw new GoogleMailError('unavailable', 'Google did not answer in time.');
  } finally {
    clearTimeout(timer);
  }
}
