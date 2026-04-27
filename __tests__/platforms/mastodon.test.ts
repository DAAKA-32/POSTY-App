import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMastodonStatus,
  exchangeMastodonCode,
  getMastodonAuthUrl,
  instanceToDocId,
  MASTODON_OAUTH_SCOPES,
  normalizeInstance,
  registerMastodonApp,
  verifyMastodonCredentials,
} from "@/lib/platforms/mastodon";

function mockJsonResponse(payload: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(payload),
    text: () => Promise.resolve(typeof payload === "string" ? payload : JSON.stringify(payload)),
  } as Response;
}

describe("Mastodon — pure helpers", () => {
  it("normalizeInstance handles all common user inputs", () => {
    expect(normalizeInstance("mastodon.social")).toBe("https://mastodon.social");
    expect(normalizeInstance("https://mastodon.social/")).toBe("https://mastodon.social");
    expect(normalizeInstance("alice@hachyderm.io")).toBe("https://hachyderm.io");
    expect(normalizeInstance("@alice@hachyderm.io")).toBe("https://hachyderm.io");
    expect(normalizeInstance("@hachyderm.io")).toBe("https://hachyderm.io");
    expect(normalizeInstance("")).toBe("");
  });

  it("instanceToDocId produces a Firestore-safe id", () => {
    expect(instanceToDocId("https://mastodon.social")).toBe("mastodon_social");
    expect(instanceToDocId("https://hachyderm.io")).toBe("hachyderm_io");
    expect(instanceToDocId("https://Some-Server.Test/")).toBe("some_server_test");
  });

  it("getMastodonAuthUrl builds the correct authorize URL with scopes + state", () => {
    const url = getMastodonAuthUrl({
      instance: "https://mastodon.social",
      clientId: "client-123",
      redirectUri: "https://postyapp.ai/api/auth/mastodon/callback",
      state: "state-xyz",
    });
    expect(url).toContain("https://mastodon.social/oauth/authorize?");
    expect(url).toContain("client_id=client-123");
    expect(url).toContain("response_type=code");
    // URLSearchParams encodes spaces as "+" and ":" as "%3A"
    const expectedScope = "scope=" + MASTODON_OAUTH_SCOPES.replace(/:/g, "%3A").replace(/ /g, "+");
    expect(url).toContain(expectedScope);
    expect(url).toContain("state=state-xyz");
    expect(url).toContain(
      "redirect_uri=" +
        encodeURIComponent("https://postyapp.ai/api/auth/mastodon/callback")
    );
  });
});

describe("Mastodon — connect flow (dynamic app registration + token exchange)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registerMastodonApp POSTs to /api/v1/apps and parses client credentials", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        client_id: "cid-abc",
        client_secret: "csec-xyz",
      })
    );

    const creds = await registerMastodonApp({
      instance: "https://mastodon.social",
      redirectUri: "https://postyapp.ai/api/auth/mastodon/callback",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://mastodon.social/api/v1/apps");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/x-www-form-urlencoded",
    });

    // Body is URLSearchParams string — parse and verify
    const params = new URLSearchParams(init.body);
    expect(params.get("client_name")).toBe("Posty");
    expect(params.get("redirect_uris")).toBe(
      "https://postyapp.ai/api/auth/mastodon/callback"
    );
    expect(params.get("scopes")).toBe(MASTODON_OAUTH_SCOPES);

    expect(creds).toEqual({
      clientId: "cid-abc",
      clientSecret: "csec-xyz",
      redirectUri: "https://postyapp.ai/api/auth/mastodon/callback",
    });
  });

  it("registerMastodonApp throws when the instance doesn't return credentials", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ client_id: null }));

    await expect(
      registerMastodonApp({
        instance: "https://mastodon.social",
        redirectUri: "x",
      })
    ).rejects.toThrow(/did not return client credentials/);
  });

  it("exchangeMastodonCode POSTs to /oauth/token with grant_type=authorization_code", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        access_token: "tok-123",
        scope: MASTODON_OAUTH_SCOPES,
        token_type: "Bearer",
      })
    );

    const tok = await exchangeMastodonCode({
      instance: "https://mastodon.social",
      clientId: "cid",
      clientSecret: "csec",
      redirectUri: "https://postyapp.ai/api/auth/mastodon/callback",
      code: "auth-code-from-callback",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://mastodon.social/oauth/token");

    const params = new URLSearchParams(init.body);
    expect(params.get("grant_type")).toBe("authorization_code");
    expect(params.get("code")).toBe("auth-code-from-callback");
    expect(params.get("client_id")).toBe("cid");
    expect(params.get("client_secret")).toBe("csec");

    expect(tok.access_token).toBe("tok-123");
  });

  it("verifyMastodonCredentials calls verify_credentials with bearer token", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        id: "12345",
        username: "alice",
        acct: "alice",
        display_name: "Alice",
        avatar: "https://mastodon.social/avatars/alice.png",
      })
    );

    const account = await verifyMastodonCredentials({
      instance: "https://mastodon.social",
      accessToken: "tok-123",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://mastodon.social/api/v1/accounts/verify_credentials");
    expect(init.headers).toMatchObject({ Authorization: "Bearer tok-123" });
    expect(account.username).toBe("alice");
  });

  it("verifyMastodonCredentials throws on 401", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ error: "The access token is invalid" }, { ok: false, status: 401 })
    );

    await expect(
      verifyMastodonCredentials({
        instance: "https://mastodon.social",
        accessToken: "bad",
      })
    ).rejects.toThrow(/access token is invalid/);
  });
});

describe("Mastodon — publish flow", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("createMastodonStatus POSTs to /api/v1/statuses with bearer + idempotency key + visibility", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        id: "status-789",
        url: "https://mastodon.social/@alice/status-789",
      })
    );

    const result = await createMastodonStatus({
      instance: "https://mastodon.social",
      accessToken: "tok-123",
      text: "Hello fediverse!",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://mastodon.social/api/v1/statuses");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer tok-123",
      "Content-Type": "application/json",
    });
    // Idempotency-Key must be present and non-empty (prevents duplicate posts on retry)
    expect(typeof init.headers["Idempotency-Key"]).toBe("string");
    expect(init.headers["Idempotency-Key"].length).toBeGreaterThan(0);

    const sentBody = JSON.parse(init.body);
    expect(sentBody.status).toBe("Hello fediverse!");
    expect(sentBody.visibility).toBe("public"); // default

    expect(result).toEqual({
      success: true,
      statusId: "status-789",
      postUrl: "https://mastodon.social/@alice/status-789",
    });
  });

  it("createMastodonStatus respects custom visibility", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ id: "1", url: "https://x/y" })
    );

    await createMastodonStatus({
      instance: "https://mastodon.social",
      accessToken: "t",
      text: "private",
      visibility: "private",
    });

    const [, init] = mockFetch.mock.calls[0];
    expect(JSON.parse(init.body).visibility).toBe("private");
  });

  it("createMastodonStatus returns success: false with server error", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ error: "Validation failed: Text is too long" }, { ok: false, status: 422 })
    );

    const result = await createMastodonStatus({
      instance: "https://mastodon.social",
      accessToken: "t",
      text: "x".repeat(10_000),
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Text is too long/);
  });

  it("createMastodonStatus catches network/fetch errors and returns success: false", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValueOnce(new Error("ECONNRESET"));

    const result = await createMastodonStatus({
      instance: "https://mastodon.social",
      accessToken: "t",
      text: "hi",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("ECONNRESET");
  });

  it("end-to-end smoke: register → exchange code → verify → post", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    // 1. App registration
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ client_id: "cid", client_secret: "csec" })
    );
    // 2. Token exchange
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        access_token: "tok-final",
        scope: MASTODON_OAUTH_SCOPES,
        token_type: "Bearer",
      })
    );
    // 3. Verify credentials
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        id: "u1",
        username: "alice",
        acct: "alice",
        display_name: "Alice",
        avatar: "https://x/avatar",
      })
    );
    // 4. Post status
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ id: "s1", url: "https://mastodon.social/@alice/s1" })
    );

    const creds = await registerMastodonApp({
      instance: "https://mastodon.social",
      redirectUri: "https://postyapp.ai/api/auth/mastodon/callback",
    });

    const tok = await exchangeMastodonCode({
      instance: "https://mastodon.social",
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      redirectUri: creds.redirectUri,
      code: "callback-code",
    });

    const account = await verifyMastodonCredentials({
      instance: "https://mastodon.social",
      accessToken: tok.access_token,
    });

    const post = await createMastodonStatus({
      instance: "https://mastodon.social",
      accessToken: tok.access_token,
      text: `Hi from ${account.username}`,
    });

    expect(post.success).toBe(true);
    expect(post.postUrl).toBe("https://mastodon.social/@alice/s1");
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });
});
