import { describe, expect, it } from "vitest";
import { ERROR_CATALOG, PublishError, sanitizeDetail, toPublishError, userMessageFor } from "../../functions/src/scheduler/errors";
import {
  classifyFetchException,
  classifyGraphFailure,
  classifyHttpStatus,
  parseRetryAfter,
} from "../../functions/src/scheduler/http";
import { detectLinkedInDuplicate } from "../../functions/src/scheduler/publishers/linkedin";

const http = (status: number, stage: "prepare" | "send" = "send", body = "") =>
  classifyHttpStatus({ platform: "linkedin", status, body, stage });

describe("classifyHttpStatus — permanent vs temporary", () => {
  it.each([
    [401, "AUTH_REJECTED", false, false],
    [403, "PERMISSION_DENIED", false, false],
    [400, "CONTENT_REJECTED", false, false],
    [422, "CONTENT_REJECTED", false, false],
    [429, "RATE_LIMITED", true, false],
    // A 5xx on the create call can follow a committed post (gateway timeout):
    // outcome unknown → reconciled retry, never a blind re-send.
    [500, "PLATFORM_UNAVAILABLE", true, true],
    [502, "PLATFORM_UNAVAILABLE", true, true],
    [503, "PLATFORM_UNAVAILABLE", true, true],
    [504, "PLATFORM_UNAVAILABLE", true, true],
  ])("HTTP %i on the create call → %s (retryable=%s, ambiguous=%s)", (status, code, retryable, ambiguous) => {
    const e = http(status);
    expect(e.code).toBe(code);
    expect(e.retryable).toBe(retryable);
    expect(e.httpStatus).toBe(status);
    expect(e.ambiguous).toBe(ambiguous);
  });

  it("a 5xx while preparing (upload, token check) is a plain retryable failure", () => {
    expect(http(503, "prepare")).toMatchObject({ code: "PLATFORM_UNAVAILABLE", retryable: true, ambiguous: false });
  });

  it("keeps the platform's own message in the detail", () => {
    expect(http(422, "send", '{"message":"Text too long"}').detail).toContain("Text too long");
  });

  it("carries Retry-After on 429", () => {
    const e = classifyHttpStatus({ platform: "linkedin", status: 429, body: "", stage: "send", retryAfterMs: 120_000 });
    expect(e.retryAfterMs).toBe(120_000);
  });

  it("a 408 during the create call is ambiguous, during preparation it is not", () => {
    expect(http(408, "send").ambiguous).toBe(true);
    expect(http(408, "prepare").ambiguous).toBe(false);
  });
});

describe("classifyFetchException — a timeout is not a failure", () => {
  const timeout = new DOMException("aborted due to timeout", "TimeoutError");

  it("timeout while sending the create call → ambiguous TIMEOUT (outcome unknown)", () => {
    const e = classifyFetchException(timeout, "linkedin", "send");
    expect(e.code).toBe("TIMEOUT");
    expect(e.ambiguous).toBe(true);
    expect(e.retryable).toBe(true);
  });

  it("timeout while preparing (upload, token check) → plain retryable TIMEOUT", () => {
    expect(classifyFetchException(timeout, "linkedin", "prepare").ambiguous).toBe(false);
  });

  it("connection refused / DNS never reached the platform → not ambiguous even during send", () => {
    const refused = Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
    const dns = Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
    expect(classifyFetchException(refused, "linkedin", "send")).toMatchObject({ code: "NETWORK_ERROR", ambiguous: false });
    expect(classifyFetchException(dns, "linkedin", "send").ambiguous).toBe(false);
  });

  it("connection reset mid-request → ambiguous during send", () => {
    const reset = Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } });
    const e = classifyFetchException(reset, "linkedin", "send");
    expect(e).toMatchObject({ code: "NETWORK_ERROR", ambiguous: true });
    expect(e.detail).toContain("ECONNRESET");
  });
});

describe("classifyGraphFailure — Meta error codes (Facebook, Threads)", () => {
  const graph = (code: number, extra: Record<string, unknown> = {}, status = 400) =>
    classifyGraphFailure({
      platform: "facebook",
      status,
      body: JSON.stringify({ error: { code, message: "boom", ...extra } }),
      stage: "send",
    });

  it.each([
    [190, "AUTH_REJECTED"],
    [10, "PERMISSION_DENIED"],
    [200, "PERMISSION_DENIED"],
    [4, "RATE_LIMITED"],
    [32, "RATE_LIMITED"],
    [341, "RATE_LIMITED"],
    [613, "RATE_LIMITED"],
    [506, "DUPLICATE_CONTENT"],
    [368, "CONTENT_REJECTED"],
    [100, "CONTENT_REJECTED"],
    [2, "PLATFORM_UNAVAILABLE"],
  ])("Graph code %i → %s", (code, expected) => {
    expect(graph(code).code).toBe(expected);
  });

  it("is_transient → retryable, but ambiguous on the create call (it may have been applied)", () => {
    expect(graph(9999, { is_transient: true })).toMatchObject({ code: "PLATFORM_UNAVAILABLE", retryable: true, ambiguous: true });
    expect(graph(2)).toMatchObject({ code: "PLATFORM_UNAVAILABLE", ambiguous: true });
  });

  it("falls back to the HTTP status when the body is not a Graph error", () => {
    expect(classifyGraphFailure({ platform: "threads", status: 503, body: "<html>", stage: "send" }).code).toBe(
      "PLATFORM_UNAVAILABLE",
    );
  });
});

describe("detectLinkedInDuplicate — proof of an earlier publication", () => {
  it("extracts the original share URN", () => {
    expect(detectLinkedInDuplicate(422, '{"message":"Content is a duplicate of urn:li:share:7243"}')).toEqual({
      duplicate: true,
      urn: "urn:li:share:7243",
    });
  });

  it("ignores unrelated 422s and non-client statuses", () => {
    expect(detectLinkedInDuplicate(422, '{"message":"Text too long"}').duplicate).toBe(false);
    expect(detectLinkedInDuplicate(500, "duplicate").duplicate).toBe(false);
  });
});

describe("parseRetryAfter", () => {
  const now = Date.UTC(2026, 8, 30, 8, 0, 0);
  it("delta-seconds", () => expect(parseRetryAfter("120", now)).toBe(120_000));
  it("HTTP-date", () => expect(parseRetryAfter(new Date(now + 90_000).toUTCString(), now)).toBe(90_000));
  it("absent / garbage", () => {
    expect(parseRetryAfter(null, now)).toBeUndefined();
    expect(parseRetryAfter("soon", now)).toBeUndefined();
  });
});

describe("sanitizeDetail — nothing secret ever reaches Firestore or logs", () => {
  it("redacts bearer tokens, query tokens, JSON tokens and ciphertexts", () => {
    const raw =
      'Authorization: Bearer AQX9.secret-token_x ?access_token=abc123&x=1 {"access_token":"zzz","refreshToken":"yyy"} enc:v1:aXY=:dGFn:Y3Q=';
    const out = sanitizeDetail(raw)!;
    for (const secret of ["AQX9.secret-token_x", "abc123", "zzz", "yyy", "aXY=:dGFn:Y3Q="]) {
      expect(out).not.toContain(secret);
    }
    expect(out).toContain("Bearer [redacted]");
    expect(out).toContain("access_token=[redacted]");
  });

  it("bounds the length", () => {
    expect(sanitizeDetail("x".repeat(1000))!.length).toBeLessThanOrEqual(301);
  });

  it("returns null for empty input", () => {
    expect(sanitizeDetail("")).toBeNull();
  });
});

describe("error catalog", () => {
  it("every code has a French user message that names the platform where relevant", () => {
    for (const code of Object.keys(ERROR_CATALOG) as Array<keyof typeof ERROR_CATALOG>) {
      expect(userMessageFor(code, "linkedin").length).toBeGreaterThan(20);
    }
    expect(userMessageFor("TOKEN_EXPIRED", "linkedin")).toContain("LinkedIn");
  });

  it("unexpected exceptions keep their real message (never a bare 'Unknown error')", () => {
    const e = toPublishError(new TypeError("Cannot read properties of undefined (reading 'toMillis')"), "linkedin");
    expect(e).toBeInstanceOf(PublishError);
    expect(e.code).toBe("INTERNAL_ERROR");
    expect(e.detail).toContain("reading 'toMillis'");
  });
});
