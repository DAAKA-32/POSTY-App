// Structured logging contract for the scheduler. Every entry is one event
// name (e.g. "scheduler.post_failed") plus flat, queryable fields — in Cloud
// Logging: jsonPayload.event="scheduler.post_failed" AND jsonPayload.postId=…
//
// Never log tokens, secrets or post content. `sanitizeLogFields` drops
// sensitive keys as a second line of defence.

export type Severity = "DEBUG" | "INFO" | "WARNING" | "ERROR";

export interface SchedulerLogger {
  log(severity: Severity, event: string, fields?: Record<string, unknown>): void;
}

const SENSITIVE_KEY = /token|secret|authorization|password|cookie|apikey|api_key|content/i;
const MAX_STRING = 500;

export function sanitizeLogFields(fields: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    // `contentLength` is fine; raw `content` is not.
    if (SENSITIVE_KEY.test(key) && !/length|count|type$/i.test(key)) continue;
    if (typeof value === "string" && value.length > MAX_STRING) {
      out[key] = `${value.slice(0, MAX_STRING)}…`;
    } else {
      out[key] = value;
    }
  }
  return out;
}
