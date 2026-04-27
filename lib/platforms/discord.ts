// Discord integration uses OAuth2 with the `webhook.incoming` scope. The user
// clicks "Connecter Discord", gets redirected to Discord to pick a server +
// channel, and Discord returns a fully-formed webhook URL ready to use.
// No bot, no App Review — the `webhook.incoming` scope is auto-approved.
//
// Admin setup (one-time):
//   1. Create an application at https://discord.com/developers/applications
//   2. In OAuth2 settings, add redirect: {NEXT_PUBLIC_BASE_URL}/api/auth/discord/callback
//   3. Set env: NEXT_PUBLIC_DISCORD_CLIENT_ID + DISCORD_CLIENT_SECRET

export const DISCORD_MAX_CONTENT_LENGTH = 2000;

export const DISCORD_OAUTH_AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize";
export const DISCORD_OAUTH_TOKEN_URL = "https://discord.com/api/oauth2/token";

function getDiscordRedirectUri(): string {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai").trim();
  return `${baseUrl}/api/auth/discord/callback`;
}

/**
 * Build the Discord OAuth authorize URL. `state` should be an HMAC-signed
 * string produced by `signOAuthState` so the callback can verify the
 * round-trip wasn't tampered with. Discord echoes `state` back unchanged.
 */
export function getDiscordAuthUrl(state: string): string {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getDiscordRedirectUri(),
    response_type: "code",
    // `webhook.incoming` asks Discord to show a server + channel picker and
    // returns a fully-formed webhook object in the token response.
    scope: "webhook.incoming",
    state,
  });
  return `${DISCORD_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

export interface DiscordOAuthWebhook {
  id: string;
  token: string;
  url: string;
  name?: string;
  avatar?: string | null;
  channel_id: string;
  guild_id?: string;
}

export interface DiscordOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  webhook?: DiscordOAuthWebhook;
}

/**
 * Exchange the authorization code from Discord for a token response. With the
 * `webhook.incoming` scope this response includes a complete `webhook` object
 * (id, token, url, channel_id, guild_id) we can store directly.
 */
export async function exchangeDiscordCode(
  code: string
): Promise<DiscordOAuthTokenResponse> {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Discord client credentials missing — set NEXT_PUBLIC_DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET"
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: getDiscordRedirectUri(),
  });

  const res = await fetch(DISCORD_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord token exchange failed: ${text}`);
  }
  return (await res.json()) as DiscordOAuthTokenResponse;
}

export function isDiscordOAuthConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
}

// Valid Discord webhook URLs look like:
//   https://discord.com/api/webhooks/{id}/{token}
//   https://discordapp.com/api/webhooks/{id}/{token}  (legacy alias)
// plus optional "/v{n}" API-version prefix like /api/v10/webhooks/...
const WEBHOOK_URL_REGEX =
  /^https:\/\/(?:discord|discordapp)\.com\/api(?:\/v\d+)?\/webhooks\/(\d+)\/([A-Za-z0-9_-]+)\/?$/;

export interface DiscordWebhookInfo {
  /** Snowflake id of the webhook */
  id: string;
  name?: string;
  avatar?: string;
  channelId?: string;
  guildId?: string;
}

export interface DiscordPostResult {
  success: boolean;
  messageId?: string;
  postUrl?: string;
  error?: string;
}

/**
 * Parse a user-pasted string and return the canonical webhook URL + id.
 * Returns null when the URL doesn't look like a valid Discord webhook.
 */
export function parseDiscordWebhookUrl(
  raw: string
): { url: string; id: string } | null {
  const trimmed = raw.trim();
  const match = trimmed.match(WEBHOOK_URL_REGEX);
  if (!match) return null;
  return { url: trimmed.replace(/\/$/, ""), id: match[1] };
}

/**
 * Validate a webhook URL by performing a GET on it. Discord returns the
 * webhook's metadata (name, avatar, channel_id, guild_id) when the URL is
 * valid. We use that for display only — no token is exchanged, no state
 * modified.
 */
export async function fetchDiscordWebhookInfo(
  webhookUrl: string
): Promise<DiscordWebhookInfo> {
  const res = await fetch(webhookUrl, { method: "GET" });
  if (!res.ok) {
    let message = "Webhook Discord invalide ou introuvable";
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* keep generic */
    }
    throw new Error(message);
  }
  const data = await res.json();
  return {
    id: data.id,
    name: data.name || undefined,
    avatar: data.avatar
      ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
      : undefined,
    channelId: data.channel_id || undefined,
    guildId: data.guild_id || undefined,
  };
}

/**
 * Post a message via a Discord webhook. Uses ?wait=true so Discord returns
 * the created message (id + url), which we store for history.
 */
export async function createDiscordMessage(params: {
  webhookUrl: string;
  content: string;
  username?: string;
  avatarUrl?: string;
}): Promise<DiscordPostResult> {
  try {
    const endpoint = params.webhookUrl.includes("?")
      ? `${params.webhookUrl}&wait=true`
      : `${params.webhookUrl}?wait=true`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: params.content,
        username: params.username,
        avatar_url: params.avatarUrl,
        allowed_mentions: { parse: [] }, // avoid accidental @everyone/@here pings
      }),
    });

    if (!res.ok) {
      let message = "Discord post failed";
      try {
        const body = await res.json();
        if (body?.message) message = body.message;
      } catch {
        /* keep generic */
      }
      return { success: false, error: message };
    }

    const data = await res.json();
    const messageId: string | undefined = data.id;
    const channelId: string | undefined = data.channel_id;
    const guildId: string | undefined = data.guild_id;
    let postUrl: string | undefined;
    if (messageId && channelId) {
      // Guild messages: https://discord.com/channels/{guildId}/{channelId}/{messageId}
      // DM messages:    https://discord.com/channels/@me/{channelId}/{messageId}
      const guildPart = guildId || "@me";
      postUrl = `https://discord.com/channels/${guildPart}/${channelId}/${messageId}`;
    }

    return {
      success: true,
      messageId,
      postUrl,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Discord post failed";
    return { success: false, error: message };
  }
}
