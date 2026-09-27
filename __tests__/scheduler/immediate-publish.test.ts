// "Publish now" must keep working independently of the scheduler, and both
// paths must look identical to LinkedIn (same UA + headers).

import { Timestamp } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  verifyAuth: vi.fn(async () => ({ uid: "user_alice", email: "alice@example.com" })),
}));
vi.mock("@/lib/db/firebase-admin", () => ({
  adminDb: {},
  isAdminInitialized: () => true,
}));
vi.mock("@/lib/db/firestore-admin", () => ({
  checkUserQuotaAdmin: vi.fn(async () => ({ plan: "pro", canGenerate: true })),
  checkWeeklyPublishQuotaAdmin: vi.fn(async () => ({ canPublish: true })),
  getLinkedInConnectionAdmin: vi.fn(async () => ({
    accessToken: "direct-access-token",
    linkedInId: "AbC123",
    expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000),
    organizations: [],
  })),
  saveLinkedInPostAdmin: vi.fn(async () => "rec1"),
  updateLinkedInLastUsedAdmin: vi.fn(async () => undefined),
  incrementWeeklyPublishCountAdmin: vi.fn(async () => undefined),
}));
vi.mock("@/lib/linkedin/signals", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/linkedin/signals")>();
  // Keep the real headers; skip the delayed warm-up pings in tests.
  return { ...actual, runSelfWarmupPings: vi.fn(async () => undefined) };
});

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function request(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/linkedin/publish", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer id-token" },
    body: JSON.stringify(body),
  });
}

describe("immediate publication (POST /api/linkedin/publish)", () => {
  it("Create → Publish now → Published", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "urn:li:share:42" }), { status: 201, headers: { "x-restli-id": "urn:li:share:42" } }),
    );
    const { POST } = await import("@/app/api/linkedin/publish/route");

    const res = await POST(request({ content: "Hello LinkedIn", platforms: ["linkedin"], visibility: "PUBLIC" }));
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ success: true, shareId: "urn:li:share:42" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.linkedin.com/v2/ugcPosts");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer direct-access-token");
  });

  it("an expired LinkedIn session is reported, never sent", async () => {
    const admin = await import("@/lib/db/firestore-admin");
    vi.mocked(admin.getLinkedInConnectionAdmin).mockResolvedValueOnce({
      accessToken: "t",
      linkedInId: "AbC123",
      expiresAt: Timestamp.fromMillis(Date.now() - 1),
      organizations: [],
    } as never);
    const { POST } = await import("@/app/api/linkedin/publish/route");
    const res = await POST(request({ content: "Hello", platforms: ["linkedin"] }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "token_expired" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("scheduled ↔ direct parity", () => {
  it("both paths send the same LinkedIn fingerprint (UA + JSON headers)", async () => {
    const direct = await import("@/lib/linkedin/signals");
    const scheduled = await import("../../functions/src/scheduler/publishers/linkedin");
    expect(scheduled.POSTY_LINKEDIN_UA).toBe(direct.POSTY_LINKEDIN_UA);
    expect(scheduled.linkedInJsonHeaders("tok")).toEqual(direct.linkedInJsonHeaders("tok"));
  });
});
