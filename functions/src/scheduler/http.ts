import { PublishError, sanitizeDetail } from "./errors";

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** Timeout for JSON API calls (auth checks, create calls, container creation). */
export const JSON_TIMEOUT_MS = 30_000;
/** Timeout for binary media uploads. */
export const UPLOAD_TIMEOUT_MS = 90_000;

/**
 * - `prepare`: nothing user-visible can exist yet (token checks, media
 *   upload, Threads container creation) → any failure is safe to retry.
 * - `send`: the non-idempotent create call. A lost response means the post
 *   may or may not exist → the error is `ambiguous`.
 */
export type RequestStage = "prepare" | "send";

/**
 * Socket-level codes proving the request never left this machine — even
 * during `send` these are NOT ambiguous (nothing reached the platform).
 */
const NEVER_CONNECTED_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
  "CERT_HAS_EXPIRED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

function causeCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const direct = (err as { code?: unknown }).code;
  if (typeof direct === "string") return direct;
  const cause = (err as { cause?: unknown }).cause;
  if (cause && typeof cause === "object") {
    const nested = (cause as { code?: unknown }).code;
    if (typeof nested === "string") return nested;
  }
  return null;
}

/** Maps a thrown fetch/body-read exception to a typed PublishError. */
export function classifyFetchException(err: unknown, platform: string, stage: RequestStage): PublishError {
  const name = err instanceof Error ? err.name : "";
  if (name === "TimeoutError" || name === "AbortError") {
    return new PublishError({
      code: "TIMEOUT",
      platform,
      detail: `No response before the timeout (${stage} stage)`,
      ambiguous: stage === "send",
    });
  }
  const code = causeCode(err);
  const message = err instanceof Error ? err.message : String(err);
  return new PublishError({
    code: "NETWORK_ERROR",
    platform,
    detail: sanitizeDetail(`${message}${code ? ` (${code})` : ""}`),
    ambiguous: stage === "send" && !(code !== null && NEVER_CONNECTED_CODES.has(code)),
  });
}

export async function requestWithTimeout(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  opts: { platform: string; stage: RequestStage; timeoutMs?: number },
): Promise<Response> {
  try {
    return await fetchImpl(url, {
      ...init,
      signal: AbortSignal.timeout(opts.timeoutMs ?? JSON_TIMEOUT_MS),
    });
  } catch (err) {
    throw classifyFetchException(err, opts.platform, opts.stage);
  }
}

/** Reads a response body without ever throwing (bounded length). */
export async function readBodySafe(res: Response, maxLength = 4000): Promise<string> {
  try {
    const text = await res.text();
    return text.length > maxLength ? text.slice(0, maxLength) : text;
  } catch {
    return "";
  }
}

/** `Retry-After` as delta-seconds or HTTP-date → milliseconds from now. */
export function parseRetryAfter(header: string | null | undefined, nowMs: number): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - nowMs);
  return undefined;
}

export interface HttpFailureInput {
  platform: string;
  status: number;
  body: string;
  stage: RequestStage;
  retryAfterMs?: number;
}

/** Generic HTTP status → typed error (used when no platform-specific rule applies). */
export function classifyHttpStatus(input: HttpFailureInput): PublishError {
  const { platform, status, body, stage } = input;
  const detail = sanitizeDetail(`HTTP ${status}${body ? ` — ${body}` : ""}`);
  const base = { platform, detail, httpStatus: status };
  if (status === 401) return new PublishError({ ...base, code: "AUTH_REJECTED" });
  if (status === 403) return new PublishError({ ...base, code: "PERMISSION_DENIED" });
  if (status === 408) return new PublishError({ ...base, code: "TIMEOUT", ambiguous: stage === "send" });
  if (status === 429) {
    return new PublishError({ ...base, code: "RATE_LIMITED", retryAfterMs: input.retryAfterMs });
  }
  if (status >= 500) {
    // A 5xx is the platform explicitly reporting its own failure — standard
    // practice (and LinkedIn/Meta behaviour) is that nothing was created.
    return new PublishError({ ...base, code: "PLATFORM_UNAVAILABLE" });
  }
  return new PublishError({ ...base, code: "CONTENT_REJECTED" });
}

interface GraphErrorBody {
  code?: number;
  error_subcode?: number;
  is_transient?: boolean;
  message?: string;
  error_user_msg?: string;
}

/** Parses the Meta Graph error envelope (Facebook + Threads). */
export function parseGraphError(body: string): GraphErrorBody | null {
  try {
    const parsed = JSON.parse(body) as { error?: GraphErrorBody };
    return parsed && typeof parsed.error === "object" && parsed.error ? parsed.error : null;
  } catch {
    return null;
  }
}

const GRAPH_RATE_LIMIT_CODES = new Set([4, 17, 32, 613]);

/**
 * Meta Graph API errors carry a numeric `code` that is far more precise than
 * the HTTP status (Meta returns 400 for almost everything).
 * https://developers.facebook.com/docs/graph-api/guides/error-handling
 */
export function classifyGraphFailure(input: HttpFailureInput): PublishError {
  const graph = parseGraphError(input.body);
  if (!graph || typeof graph.code !== "number") return classifyHttpStatus(input);

  const { platform, status, stage } = input;
  const detail = sanitizeDetail(
    `Graph error ${graph.code}${graph.error_subcode ? `/${graph.error_subcode}` : ""}: ${graph.error_user_msg || graph.message || ""}`,
  );
  const base = { platform, detail, httpStatus: status };
  const code = graph.code;

  if (code === 190 || code === 102) return new PublishError({ ...base, code: "AUTH_REJECTED" });
  if (code === 10 || (code >= 200 && code <= 299)) return new PublishError({ ...base, code: "PERMISSION_DENIED" });
  if (GRAPH_RATE_LIMIT_CODES.has(code) || (code >= 80001 && code <= 80014)) {
    return new PublishError({ ...base, code: "RATE_LIMITED", retryAfterMs: input.retryAfterMs });
  }
  if (code === 506) return new PublishError({ ...base, code: "DUPLICATE_CONTENT" });
  if (code === 368) return new PublishError({ ...base, code: "CONTENT_REJECTED" });
  if (code === 1 || code === 2 || graph.is_transient === true) {
    return new PublishError({ ...base, code: "PLATFORM_UNAVAILABLE", ambiguous: false, retryable: true });
  }
  if (status >= 500) return new PublishError({ ...base, code: "PLATFORM_UNAVAILABLE" });
  if (status === 408) return new PublishError({ ...base, code: "TIMEOUT", ambiguous: stage === "send" });
  return new PublishError({ ...base, code: "CONTENT_REJECTED" });
}
