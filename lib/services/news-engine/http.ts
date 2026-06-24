/**
 * Resilient HTTP helpers for provider adapters.
 *
 * Every external call is bounded by (a) the orchestrator's global AbortSignal
 * and (b) a per-call timeout, so one slow provider can never hang the
 * generation stream. A descriptive, contactable User-Agent is sent on every
 * request — Wikimedia (and good etiquette generally) requires it.
 */

/** Contactable UA — Wikimedia requires a descriptive UA for the higher rate tier. */
export const USER_AGENT =
  process.env.NEWS_ENGINE_USER_AGENT ||
  "PostyBot/1.0 (+https://postyapp.ai; LinkedIn content assistant)";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

interface GetOpts {
  /** Orchestrator-wide signal (global deadline / abort). */
  signal?: AbortSignal;
  /** Per-call hard timeout in ms. */
  timeoutMs: number;
  headers?: Record<string, string>;
}

/** GET with combined (global signal + per-call timeout) abort. Throws on !ok. */
async function httpGet(url: string, opts: GetOpts): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("provider_timeout")), opts.timeoutMs);
  const onParentAbort = () => ctrl.abort(new Error("orchestrator_abort"));
  if (opts.signal) {
    if (opts.signal.aborted) ctrl.abort();
    else opts.signal.addEventListener("abort", onParentAbort, { once: true });
  }
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json, text/xml, */*", ...opts.headers },
      // News data is public; never send cookies/credentials.
      redirect: "follow",
    });
    if (!res.ok) throw new HttpError(res.status, `${res.status} ${res.statusText} for ${url}`);
    return res;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onParentAbort);
  }
}

export async function fetchJson<T = unknown>(url: string, opts: GetOpts): Promise<T> {
  const res = await httpGet(url, opts);
  return (await res.json()) as T;
}

export async function fetchText(url: string, opts: GetOpts): Promise<string> {
  const res = await httpGet(url, opts);
  return await res.text();
}

/** Extract the bare host ("techcrunch.com") from a URL; "" on failure. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
