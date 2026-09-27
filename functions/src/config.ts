import * as functions from "firebase-functions";
import { tokenKeyStatus } from "./crypto/token-cipher";
import { getZernioApiKey } from "./zernio";

/**
 * Runtime configuration for every function in this codebase.
 *
 * Source of truth: environment variables, loaded at deploy time by
 * firebase-tools from `functions/.env` and `functions/.env.<projectId>`
 * (see functions/.env.example). The legacy `functions.config()` Runtime
 * Config is only read as a fallback: firebase-tools ≥ 14 no longer injects
 * it unless the `legacyRuntimeConfigCommands` experiment is enabled, and
 * Google decommissions it in March 2027 — relying on it alone would let a
 * routine redeploy silently wipe these values.
 */
type LegacyConfig = Record<string, Record<string, unknown> | undefined>;

function readLegacyConfig(): LegacyConfig {
  try {
    return (functions.config() ?? {}) as LegacyConfig;
  } catch {
    return {};
  }
}

export interface RuntimeConfig {
  linkedin: { clientId: string; clientSecret: string; tokenUrl: string; apiBaseUrl: string };
  facebookApiUrl: string;
  threadsApiUrl: string;
  threadsRefreshUrl: string;
  /** Seed comments are always queued, but only posted when this is true. */
  seedCommentAutopost: boolean;
  appUrl: string;
  cronSecret: string;
}

export function loadRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
  legacy: LegacyConfig = readLegacyConfig(),
): RuntimeConfig {
  const pick = (envKey: string, legacyGroup: string, legacyKey: string, fallback: string): string => {
    const fromEnv = env[envKey]?.trim();
    if (fromEnv) return fromEnv;
    const fromLegacy = legacy[legacyGroup]?.[legacyKey];
    if (typeof fromLegacy === "string" && fromLegacy.trim()) return fromLegacy.trim();
    return fallback;
  };
  return {
    linkedin: {
      clientId: pick("LINKEDIN_CLIENT_ID", "linkedin", "client_id", ""),
      clientSecret: pick("LINKEDIN_CLIENT_SECRET", "linkedin", "client_secret", ""),
      tokenUrl: pick("LINKEDIN_TOKEN_URL", "linkedin", "token_url", "https://www.linkedin.com/oauth/v2/accessToken"),
      apiBaseUrl: pick("LINKEDIN_API_BASE_URL", "linkedin", "api_base_url", "https://api.linkedin.com/v2"),
    },
    facebookApiUrl: pick("FACEBOOK_API_URL", "facebook", "api_url", "https://graph.facebook.com/v21.0"),
    threadsApiUrl: pick("THREADS_API_URL", "threads", "api_url", "https://graph.threads.net/v1.0"),
    threadsRefreshUrl: pick(
      "THREADS_REFRESH_URL",
      "threads",
      "refresh_url",
      "https://graph.threads.net/refresh_access_token",
    ),
    seedCommentAutopost: pick("SEED_COMMENT_AUTOPOST", "posty", "seed_comment_autopost", "false") === "true",
    appUrl: pick("POSTY_APP_URL", "posty", "app_url", ""),
    cronSecret: pick("CRON_SECRET", "posty", "cron_secret", ""),
  };
}

/** Non-secret config status, logged every tick and stored in the heartbeat. */
export function configHealth(): Record<string, string> {
  return {
    encryptionKeyStatus: tokenKeyStatus(),
    zernioKeyStatus: getZernioApiKey() ? "ok" : "missing",
  };
}
