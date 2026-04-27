// Mastodon / Fediverse helpers.
//
// Mastodon is federated — each user's account lives on a specific instance
// (mastodon.social, hachyderm.io, fosstodon.org, etc.). We support the full
// OAuth2 flow **per instance**: the first time a user on instance X connects,
// Posty dynamically registers itself as an app on that instance via
// POST /api/v1/apps (no approval needed), caches the returned client_id +
// client_secret in Firestore, and runs the standard authorization_code grant.

// Max length of a Mastodon status on vanilla instances. Some servers configure
// higher limits, but 500 is the federated baseline.
export const MASTODON_DEFAULT_MAX_LENGTH = 500;

export interface MastodonAccount {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  avatar: string;
}

export interface MastodonPostResult {
  success: boolean;
  statusId?: string;
  postUrl?: string;
  error?: string;
}

/**
 * Normalize user-typed instance input into a canonical URL without trailing
 * slash: "mastodon.social", "@alice@mastodon.social", "https://mastodon.social/"
 * all become "https://mastodon.social".
 */
export function normalizeInstance(raw: string): string {
  let s = raw.trim();
  if (!s) return "";
  // Strip user part if user pasted "alice@mastodon.social" or "@alice@..."
  const atIdx = s.lastIndexOf("@");
  if (atIdx > 0 && !s.startsWith("http")) {
    s = s.slice(atIdx + 1);
  }
  s = s.replace(/^@/, "");
  if (!s.startsWith("http://") && !s.startsWith("https://")) {
    s = `https://${s}`;
  }
  return s.replace(/\/+$/, "");
}

/**
 * Verify an access token against an instance and return the account profile.
 * Throws on invalid credentials.
 */
export async function verifyMastodonCredentials(params: {
  instance: string;
  accessToken: string;
}): Promise<MastodonAccount> {
  const res = await fetch(`${params.instance}/api/v1/accounts/verify_credentials`, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
  if (!res.ok) {
    let message = "Invalid Mastodon credentials";
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* keep generic */
    }
    throw new Error(message);
  }
  return (await res.json()) as MastodonAccount;
}

/**
 * Publish a status ("toot") to the user's instance.
 */
export async function createMastodonStatus(params: {
  instance: string;
  accessToken: string;
  text: string;
  visibility?: "public" | "unlisted" | "private" | "direct";
}): Promise<MastodonPostResult> {
  try {
    const res = await fetch(`${params.instance}/api/v1/statuses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.accessToken}`,
        // Idempotency prevents duplicate posts on client retry.
        "Idempotency-Key": `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
      body: JSON.stringify({
        status: params.text,
        visibility: params.visibility || "public",
      }),
    });
    if (!res.ok) {
      let message = "Mastodon post failed";
      try {
        const body = await res.json();
        if (body?.error) message = body.error;
      } catch {
        /* keep generic */
      }
      return { success: false, error: message };
    }
    const data = await res.json();
    return {
      success: true,
      statusId: data.id,
      postUrl: data.url || data.uri,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Mastodon post failed";
    return { success: false, error: message };
  }
}

// ============== OAuth2 (dynamic app registration per instance) ==============

export const MASTODON_OAUTH_SCOPES = "write:statuses read:accounts";

export interface MastodonAppCredentials {
  /** OAuth client_id returned by the instance */
  clientId: string;
  /** OAuth client_secret returned by the instance */
  clientSecret: string;
  /** Exact redirect URI that was registered (must match at authorize/token time) */
  redirectUri: string;
}

/**
 * Register Posty as a new app on the given Mastodon instance. This endpoint
 * is public (no auth required) on every Mastodon server and is the standard
 * onboarding path for third-party clients.
 */
export async function registerMastodonApp(params: {
  instance: string;
  redirectUri: string;
}): Promise<MastodonAppCredentials> {
  const body = new URLSearchParams({
    client_name: "Posty",
    redirect_uris: params.redirectUri,
    scopes: MASTODON_OAUTH_SCOPES,
    website: process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai",
  });

  const res = await fetch(`${params.instance}/api/v1/apps`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mastodon app registration failed: ${text}`);
  }
  const data = await res.json();
  if (!data.client_id || !data.client_secret) {
    throw new Error("Mastodon did not return client credentials");
  }
  return {
    clientId: data.client_id,
    clientSecret: data.client_secret,
    redirectUri: params.redirectUri,
  };
}

export function getMastodonAuthUrl(params: {
  instance: string;
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const qp = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: MASTODON_OAUTH_SCOPES,
    state: params.state,
  });
  return `${params.instance}/oauth/authorize?${qp.toString()}`;
}

export async function exchangeMastodonCode(params: {
  instance: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<{ access_token: string; scope: string; token_type: string }> {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code",
    code: params.code,
    scope: MASTODON_OAUTH_SCOPES,
  });
  const res = await fetch(`${params.instance}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mastodon token exchange failed: ${text}`);
  }
  return res.json();
}

/**
 * Convert an instance URL into a safe Firestore document id.
 * "https://mastodon.social" → "mastodon_social"
 */
export function instanceToDocId(instance: string): string {
  return instance
    .replace(/^https?:\/\//, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100); // Firestore doc id limit is 1500 bytes, but keep tight
}
