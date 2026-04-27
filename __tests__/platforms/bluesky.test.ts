import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BLUESKY_DEFAULT_SERVICE,
  buildPostUrl,
  createBlueskyPost,
  createBlueskySession,
  fetchBlueskyProfile,
  normalizeHandle,
  refreshBlueskySession,
} from "@/lib/platforms/bluesky";

// Helper: build a fetch mock that returns the same response for every call
// and lets us assert on the arguments it received.
function mockJsonResponse(payload: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(payload),
    text: () => Promise.resolve(JSON.stringify(payload)),
  } as Response;
}

describe("Bluesky — pure helpers", () => {
  it("normalizes handles correctly", () => {
    expect(normalizeHandle("alice")).toBe("alice.bsky.social");
    expect(normalizeHandle("@alice")).toBe("alice.bsky.social");
    expect(normalizeHandle("ALICE.BSKY.SOCIAL")).toBe("alice.bsky.social");
    expect(normalizeHandle("alice.example.com")).toBe("alice.example.com");
    expect(normalizeHandle("  ")).toBe("");
  });

  it("builds the public post URL from an AT URI", () => {
    const uri = "at://did:plc:xyz/app.bsky.feed.post/3kabc123";
    expect(buildPostUrl("alice.bsky.social", uri)).toBe(
      "https://bsky.app/profile/alice.bsky.social/post/3kabc123"
    );
  });

  it("returns undefined for a malformed AT URI", () => {
    expect(buildPostUrl("alice.bsky.social", "not-an-at-uri")).toBeUndefined();
  });
});

describe("Bluesky — connect flow", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("createBlueskySession POSTs handle + password to createSession and parses tokens", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        accessJwt: "eyJ.access",
        refreshJwt: "eyJ.refresh",
        handle: "alice.bsky.social",
        did: "did:plc:abc123",
      })
    );

    const session = await createBlueskySession({
      identifier: "alice.bsky.social",
      password: "abcd-efgh-ijkl-mnop",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BLUESKY_DEFAULT_SERVICE}/xrpc/com.atproto.server.createSession`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });

    const sentBody = JSON.parse(init.body);
    expect(sentBody).toEqual({
      identifier: "alice.bsky.social",
      password: "abcd-efgh-ijkl-mnop",
    });

    expect(session).toEqual({
      accessJwt: "eyJ.access",
      refreshJwt: "eyJ.refresh",
      handle: "alice.bsky.social",
      did: "did:plc:abc123",
    });
  });

  it("createBlueskySession surfaces server error message on failure", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse(
        { error: "AuthenticationRequired", message: "Invalid identifier or password" },
        { ok: false, status: 401 }
      )
    );

    await expect(
      createBlueskySession({ identifier: "alice.bsky.social", password: "bad" })
    ).rejects.toThrow(/Invalid identifier or password/);
  });

  it("refreshBlueskySession authenticates with the refresh JWT", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        accessJwt: "new.access",
        refreshJwt: "new.refresh",
        handle: "alice.bsky.social",
        did: "did:plc:abc123",
      })
    );

    const session = await refreshBlueskySession({ refreshJwt: "old.refresh" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BLUESKY_DEFAULT_SERVICE}/xrpc/com.atproto.server.refreshSession`);
    expect(init.headers).toMatchObject({ Authorization: "Bearer old.refresh" });
    expect(session.accessJwt).toBe("new.access");
  });

  it("fetchBlueskyProfile authenticates with the access JWT and returns profile", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        did: "did:plc:abc123",
        handle: "alice.bsky.social",
        displayName: "Alice",
        avatar: "https://cdn.bsky.app/avatar.jpg",
      })
    );

    const profile = await fetchBlueskyProfile({
      accessJwt: "eyJ.access",
      handle: "alice.bsky.social",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain(
      "/xrpc/app.bsky.actor.getProfile?actor=alice.bsky.social"
    );
    expect(init.headers).toMatchObject({ Authorization: "Bearer eyJ.access" });
    expect(profile.displayName).toBe("Alice");
  });
});

describe("Bluesky — publish flow", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("createBlueskyPost POSTs a feed.post record and returns uri/cid + computed postUrl", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        uri: "at://did:plc:abc123/app.bsky.feed.post/3kxyz789",
        cid: "bafyreib...",
      })
    );

    const result = await createBlueskyPost({
      accessJwt: "eyJ.access",
      did: "did:plc:abc123",
      text: "Hello from Posty 🌤️",
      handle: "alice.bsky.social",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BLUESKY_DEFAULT_SERVICE}/xrpc/com.atproto.repo.createRecord`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer eyJ.access",
      "Content-Type": "application/json",
    });

    const sentBody = JSON.parse(init.body);
    expect(sentBody.repo).toBe("did:plc:abc123");
    expect(sentBody.collection).toBe("app.bsky.feed.post");
    expect(sentBody.record.$type).toBe("app.bsky.feed.post");
    expect(sentBody.record.text).toBe("Hello from Posty 🌤️");
    expect(typeof sentBody.record.createdAt).toBe("string");
    // ISO 8601 sanity check
    expect(new Date(sentBody.record.createdAt).toString()).not.toBe("Invalid Date");

    expect(result).toEqual({
      success: true,
      uri: "at://did:plc:abc123/app.bsky.feed.post/3kxyz789",
      cid: "bafyreib...",
      postUrl: "https://bsky.app/profile/alice.bsky.social/post/3kxyz789",
    });
  });

  it("createBlueskyPost returns success: false with the server error message on failure", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse(
        { error: "InvalidRequest", message: "Token expired" },
        { ok: false, status: 401 }
      )
    );

    const result = await createBlueskyPost({
      accessJwt: "eyJ.expired",
      did: "did:plc:abc123",
      text: "won't go through",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Token expired");
    expect(result.uri).toBeUndefined();
  });

  it("end-to-end smoke: connect → publish wires session output into post call", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    // 1. createSession
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        accessJwt: "session.access",
        refreshJwt: "session.refresh",
        handle: "alice.bsky.social",
        did: "did:plc:alice",
      })
    );
    // 2. createRecord
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        uri: "at://did:plc:alice/app.bsky.feed.post/3kpost1",
        cid: "bafy123",
      })
    );

    const session = await createBlueskySession({
      identifier: "alice",
      password: "app-pwd",
    });

    const post = await createBlueskyPost({
      accessJwt: session.accessJwt,
      did: session.did,
      text: "First post via Posty",
      handle: session.handle,
    });

    expect(post.success).toBe(true);
    expect(post.postUrl).toBe(
      "https://bsky.app/profile/alice.bsky.social/post/3kpost1"
    );
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
