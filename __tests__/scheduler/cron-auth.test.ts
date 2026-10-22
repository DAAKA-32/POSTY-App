import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { rejectUnlessCron } from "../../lib/scheduler/cron-auth";

const req = (headers: Record<string, string> = {}) =>
  new NextRequest("https://postyapp.ai/api/cron/scheduler", { headers });

describe("rejectUnlessCron", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("500 when CRON_SECRET is not configured (never open by default)", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(rejectUnlessCron(req({ "x-cron-secret": "" }))?.status).toBe(500);
  });

  it("403 without or with a wrong secret", () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    expect(rejectUnlessCron(req())?.status).toBe(403);
    expect(rejectUnlessCron(req({ "x-cron-secret": "nope" }))?.status).toBe(403);
    expect(rejectUnlessCron(req({ authorization: "Bearer s3cret-valuX" }))?.status).toBe(403);
  });

  it("accepts x-cron-secret (GitHub Actions) and Bearer (Vercel Cron)", () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    expect(rejectUnlessCron(req({ "x-cron-secret": "s3cret-value" }))).toBeNull();
    expect(rejectUnlessCron(req({ authorization: "Bearer s3cret-value" }))).toBeNull();
  });
});
