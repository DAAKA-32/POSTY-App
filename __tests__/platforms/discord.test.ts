import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDiscordMessage,
  DISCORD_OAUTH_AUTHORIZE_URL,
  DISCORD_OAUTH_TOKEN_URL,
  exchangeDiscordCode,
  fetchDiscordWebhookInfo,
  getDiscordAuthUrl,
  isDiscordOAuthConfigured,
  parseDiscordWebhookUrl,
} from "@/lib/platforms/discord";

function mockJsonResponse(payload: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(payload),
    text: () => Promise.resolve(typeof payload === "string" ? payload : JSON.stringify(payload)),
  } as Response;
}

describe("Discord — pure helpers", () => {
  it("parseDiscordWebhookUrl accepts canonical webhook URLs", () => {
    expect(
      parseDiscordWebhookUrl(
        "https://discord.com/api/webhooks/123456789012345678/abcDEF_ghi-JKL"
      )
    ).toEqual({
      url: "https://discord.com/api/webhooks/123456789012345678/abcDEF_ghi-JKL",
      id: "123456789012345678",
    });
  });

  it("parseDiscordWebhookUrl accepts legacy discordapp.com host", () => {
    expect(
      parseDiscordWebhookUrl(
        "https://discordapp.com/api/webhooks/123/abc"
      )?.id
    ).toBe("123");
  });

  it("parseDiscordWebhookUrl accepts versioned API path /api/v10/webhooks/...", () => {
    expect(
      parseDiscordWebhookUrl(
        "https://discord.com/api/v10/webhooks/999/xyz_-"
      )?.id
    ).toBe("999");
  });

  it("parseDiscordWebhookUrl rejects invalid URLs", () => {
    expect(parseDiscordWebhookUrl("https://example.com/foo")).toBeNull();
    expect(parseDiscordWebhookUrl("http://discord.com/api/webhooks/123/abc")).toBeNull(); // no https
    expect(parseDiscordWebhookUrl("not-a-url")).toBeNull();
    expect(parseDiscordWebhookUrl("")).toBeNull();
  });

  it("parseDiscordWebhookUrl strips a single trailing slash", () => {
    const r = parseDiscordWebhookUrl(
      "https://discord.com/api/webhooks/123/abc/"
    );
    expect(r?.url).toBe("https://discord.com/api/webhooks/123/abc");
  });
});

describe("Discord — OAuth helpers", () => {
  const ORIGINAL_ENV = { ...process.env };
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID = "discord-client-id";
    process.env.DISCORD_CLIENT_SECRET = "discord-client-secret";
    process.env.NEXT_PUBLIC_BASE_URL = "https://postyapp.ai";
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("isDiscordOAuthConfigured reflects env var presence", () => {
    expect(isDiscordOAuthConfigured()).toBe(true);
    delete process.env.DISCORD_CLIENT_SECRET;
    expect(isDiscordOAuthConfigured()).toBe(false);
  });

  it("getDiscordAuthUrl forwards a signed state through the URL", () => {
    // The state is HMAC-signed upstream by signOAuthState — getDiscordAuthUrl
    // is dumb pass-through. Caller is responsible for signing.
    const signedState = "payload-base64.signature-base64";
    const url = getDiscordAuthUrl(signedState);

    expect(url.startsWith(DISCORD_OAUTH_AUTHORIZE_URL + "?")).toBe(true);
    expect(url).toContain("client_id=discord-client-id");
    expect(url).toContain("response_type=code");
    expect(url).toContain("scope=webhook.incoming");
    expect(url).toContain(
      "state=" + encodeURIComponent(signedState).replace(/%20/g, "+")
    );
    expect(url).toContain(
      "redirect_uri=" +
        encodeURIComponent("https://postyapp.ai/api/auth/discord/callback")
    );
  });
});

describe("Discord — connect flow (OAuth code → webhook)", () => {
  const ORIGINAL_ENV = { ...process.env };
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID = "discord-client-id";
    process.env.DISCORD_CLIENT_SECRET = "discord-client-secret";
    process.env.NEXT_PUBLIC_BASE_URL = "https://postyapp.ai";
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("exchangeDiscordCode POSTs to oauth/token with code + correct redirect_uri and parses webhook payload", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const fakeWebhook = {
      id: "111",
      token: "tok",
      url: "https://discord.com/api/webhooks/111/tok",
      name: "Posty Hook",
      avatar: null,
      channel_id: "ch-1",
      guild_id: "g-1",
    };
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        access_token: "at-1",
        token_type: "Bearer",
        expires_in: 604800,
        scope: "webhook.incoming",
        webhook: fakeWebhook,
      })
    );

    const tokenResp = await exchangeDiscordCode("auth-code-123");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(DISCORD_OAUTH_TOKEN_URL);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/x-www-form-urlencoded",
    });

    const params = new URLSearchParams(init.body);
    expect(params.get("grant_type")).toBe("authorization_code");
    expect(params.get("code")).toBe("auth-code-123");
    expect(params.get("client_id")).toBe("discord-client-id");
    expect(params.get("client_secret")).toBe("discord-client-secret");
    expect(params.get("redirect_uri")).toBe(
      "https://postyapp.ai/api/auth/discord/callback"
    );

    expect(tokenResp.webhook).toEqual(fakeWebhook);
  });

  it("exchangeDiscordCode throws when client credentials are missing", async () => {
    delete process.env.DISCORD_CLIENT_SECRET;
    await expect(exchangeDiscordCode("c")).rejects.toThrow(/credentials missing/);
  });

  it("exchangeDiscordCode throws on Discord API error", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse("invalid_grant", { ok: false, status: 400 })
    );

    await expect(exchangeDiscordCode("bad-code")).rejects.toThrow(/token exchange failed/);
  });

  it("fetchDiscordWebhookInfo GETs the webhook URL and returns metadata", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        id: "wh-1",
        name: "general",
        avatar: "abc123",
        channel_id: "ch-1",
        guild_id: "g-1",
      })
    );

    const info = await fetchDiscordWebhookInfo(
      "https://discord.com/api/webhooks/wh-1/secret"
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://discord.com/api/webhooks/wh-1/secret");
    expect(init.method).toBe("GET");

    expect(info).toEqual({
      id: "wh-1",
      name: "general",
      avatar: "https://cdn.discordapp.com/avatars/wh-1/abc123.png",
      channelId: "ch-1",
      guildId: "g-1",
    });
  });

  it("fetchDiscordWebhookInfo throws on invalid webhook (404)", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ message: "Unknown Webhook" }, { ok: false, status: 404 })
    );

    await expect(
      fetchDiscordWebhookInfo("https://discord.com/api/webhooks/0/0")
    ).rejects.toThrow(/Unknown Webhook/);
  });
});

describe("Discord — publish flow", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("createDiscordMessage POSTs to webhook with ?wait=true and disables @everyone mentions", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        id: "msg-1",
        channel_id: "ch-1",
        guild_id: "g-1",
      })
    );

    const result = await createDiscordMessage({
      webhookUrl: "https://discord.com/api/webhooks/111/tok",
      content: "Hello @everyone — but Posty disables this",
      username: "Posty",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://discord.com/api/webhooks/111/tok?wait=true");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });

    const sentBody = JSON.parse(init.body);
    expect(sentBody.content).toBe("Hello @everyone — but Posty disables this");
    expect(sentBody.username).toBe("Posty");
    // Mentions guard is critical — no accidental @everyone pings.
    expect(sentBody.allowed_mentions).toEqual({ parse: [] });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg-1");
    expect(result.postUrl).toBe(
      "https://discord.com/channels/g-1/ch-1/msg-1"
    );
  });

  it("createDiscordMessage uses @me path for DM webhooks (no guild_id)", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ id: "m1", channel_id: "ch-dm" })
    );

    const result = await createDiscordMessage({
      webhookUrl: "https://discord.com/api/webhooks/x/y",
      content: "DM",
    });

    expect(result.postUrl).toBe("https://discord.com/channels/@me/ch-dm/m1");
  });

  it("createDiscordMessage appends &wait=true when the URL already has a query string", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ id: "m1", channel_id: "c" })
    );

    await createDiscordMessage({
      webhookUrl: "https://discord.com/api/webhooks/x/y?thread_id=42",
      content: "thread post",
    });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(
      "https://discord.com/api/webhooks/x/y?thread_id=42&wait=true"
    );
  });

  it("createDiscordMessage returns success: false with the Discord error message", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ message: "Invalid Webhook Token" }, { ok: false, status: 401 })
    );

    const result = await createDiscordMessage({
      webhookUrl: "https://discord.com/api/webhooks/x/y",
      content: "oops",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid Webhook Token");
    expect(result.messageId).toBeUndefined();
  });

  it("createDiscordMessage catches network errors and returns success: false", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValueOnce(new Error("getaddrinfo ENOTFOUND"));

    const result = await createDiscordMessage({
      webhookUrl: "https://discord.com/api/webhooks/x/y",
      content: "hi",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/ENOTFOUND/);
  });

  it("end-to-end smoke: OAuth callback → store webhook → publish via webhook", async () => {
    process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID = "discord-client-id";
    process.env.DISCORD_CLIENT_SECRET = "discord-client-secret";
    process.env.NEXT_PUBLIC_BASE_URL = "https://postyapp.ai";

    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    // 1. exchangeDiscordCode
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        access_token: "at-1",
        token_type: "Bearer",
        expires_in: 604800,
        scope: "webhook.incoming",
        webhook: {
          id: "111",
          token: "tok",
          url: "https://discord.com/api/webhooks/111/tok",
          channel_id: "ch-1",
          guild_id: "g-1",
        },
      })
    );
    // 2. createDiscordMessage
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        id: "msg-final",
        channel_id: "ch-1",
        guild_id: "g-1",
      })
    );

    const tok = await exchangeDiscordCode("callback-code");
    expect(tok.webhook?.url).toBeDefined();

    const post = await createDiscordMessage({
      webhookUrl: tok.webhook!.url,
      content: "First Discord post via Posty",
    });

    expect(post.success).toBe(true);
    expect(post.postUrl).toBe(
      "https://discord.com/channels/g-1/ch-1/msg-final"
    );
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
