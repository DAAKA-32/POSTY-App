import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight in-memory rate limiter for API routes.
 *
 * Scope: per Node.js process. On Vercel each serverless instance has its own
 * counter, so determined attackers can still spread load across instances —
 * but it stops the easy abuse vectors (single-IP scripted hammering) without
 * adding an external dependency like Upstash/Redis. Upgrade to Upstash if
 * cost from distributed abuse becomes material.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Sweep expired buckets every 5 min so the Map doesn't grow unboundedly
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();

function sweepIfStale(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Extract the requester IP. Trusts standard proxy headers used by Vercel,
 * Cloudflare and Nginx; falls back to "unknown" so unauthenticated requests
 * still share a (degraded) bucket rather than bypassing the limit entirely.
 */
export function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return "unknown";
}

export interface RateLimitOptions {
  /** Unique namespace per route, e.g. "demo" or "openai-validate" */
  namespace: string;
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

/**
 * Increment and check a rate-limit bucket. Returns `allowed: false` once the
 * limit is exceeded for the current window.
 */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  sweepIfStale(now);

  const fullKey = `${opts.namespace}:${key}`;
  const existing = buckets.get(fullKey);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    buckets.set(fullKey, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: opts.limit - 1,
      resetAt,
      retryAfterSec: 0,
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, opts.limit - existing.count);
  const allowed = existing.count <= opts.limit;
  return {
    allowed,
    remaining,
    resetAt: existing.resetAt,
    retryAfterSec: Math.max(0, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/**
 * Convenience wrapper: apply rate limit and return a 429 response if exceeded.
 * Returns `null` when the request is allowed — caller continues normally.
 */
export function enforceRateLimit(
  request: NextRequest,
  opts: RateLimitOptions,
  keyOverride?: string,
): NextResponse | null {
  const key = keyOverride ?? getClientIp(request);
  const result = rateLimit(key, opts);
  if (result.allowed) return null;

  return NextResponse.json(
    {
      error: "rate_limited",
      message: "Too many requests. Please try again later.",
      retryAfterSec: result.retryAfterSec,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Limit": String(opts.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}
