/**
 * Acquisition source classification — the single place that decides where a
 * visit "came from". Pure and dependency-free so it runs (and is tested) on
 * both the server and in unit tests.
 *
 * Attribution hierarchy (first rule that yields a source wins):
 *   1. utm_source              → explicit campaign tagging (most reliable)
 *   2. paid click ids          → gclid / msclkid / ttclid (auto-tagging)
 *   3. recognised referrer     → search engine, AI assistant, social, webmail
 *   4. unrecognised referrer   → "<domain> / referral"
 *   5. no referrer             → "direct / none"
 *   6. unusable referrer       → "unknown / none"
 *
 * utm_campaign / utm_content / utm_term are carried alongside whichever rung
 * produced the source. Domains are matched on a normalised hostname — exact
 * match or true subdomain — never by substring, so "example-chatgpt.com" is
 * NOT a ChatGPT referral.
 *
 * Honest limits: many apps (incl. AI assistants, mobile apps, private
 * windows, strict browsers) strip the referrer, so those visits land in
 * "direct / none". We never guess a source from behaviour.
 */

import type { RawTouch } from "./events";

export type Channel =
  | "search"
  | "ai"
  | "social"
  | "email"
  | "paid"
  | "affiliate"
  | "referral"
  | "direct"
  | "unknown";

export type AttributionMethod =
  | "utm"
  | "click_id"
  | "referrer"
  | "direct"
  | "unknown";

export interface Classification {
  source: string;
  medium: string;
  /** `${source}/${medium}` — the stable aggregation key. */
  key: string;
  channel: Channel;
  method: AttributionMethod;
  campaign?: string;
  content?: string;
  term?: string;
  /** Normalised referring host (no "www."), when an external one existed. */
  referrerDomain?: string;
}

export const DIRECT_KEY = "direct/none";
export const UNKNOWN_KEY = "unknown/none";

// ───────────────────────── Domain registry ─────────────────────────

interface DomainRule {
  /** Registrable domain; matches itself and any subdomain. */
  domain: string;
  source: string;
  medium: string;
  channel: Channel;
}

// More specific entries MUST come before their parent domain
// (gemini.google.com before the google.* search rule).
const DOMAIN_RULES: DomainRule[] = [
  // AI assistants / AI search
  { domain: "gemini.google.com", source: "gemini", medium: "referral", channel: "ai" },
  { domain: "bard.google.com", source: "gemini", medium: "referral", channel: "ai" },
  { domain: "chatgpt.com", source: "chatgpt", medium: "referral", channel: "ai" },
  { domain: "chat.openai.com", source: "chatgpt", medium: "referral", channel: "ai" },
  { domain: "perplexity.ai", source: "perplexity", medium: "referral", channel: "ai" },
  { domain: "claude.ai", source: "claude", medium: "referral", channel: "ai" },
  { domain: "copilot.microsoft.com", source: "copilot", medium: "referral", channel: "ai" },
  { domain: "you.com", source: "you", medium: "referral", channel: "ai" },
  { domain: "phind.com", source: "phind", medium: "referral", channel: "ai" },
  { domain: "poe.com", source: "poe", medium: "referral", channel: "ai" },
  { domain: "grok.com", source: "grok", medium: "referral", channel: "ai" },
  { domain: "chat.mistral.ai", source: "mistral", medium: "referral", channel: "ai" },
  { domain: "chat.deepseek.com", source: "deepseek", medium: "referral", channel: "ai" },
  { domain: "meta.ai", source: "meta-ai", medium: "referral", channel: "ai" },

  // Webmail (a click out of an inbox is email traffic)
  { domain: "mail.google.com", source: "gmail", medium: "email", channel: "email" },
  { domain: "outlook.live.com", source: "outlook", medium: "email", channel: "email" },
  { domain: "outlook.office.com", source: "outlook", medium: "email", channel: "email" },
  { domain: "outlook.office365.com", source: "outlook", medium: "email", channel: "email" },
  { domain: "mail.yahoo.com", source: "yahoo-mail", medium: "email", channel: "email" },

  // Search engines (google.<tld> handled separately below)
  { domain: "bing.com", source: "bing", medium: "organic", channel: "search" },
  { domain: "duckduckgo.com", source: "duckduckgo", medium: "organic", channel: "search" },
  { domain: "search.yahoo.com", source: "yahoo", medium: "organic", channel: "search" },
  { domain: "ecosia.org", source: "ecosia", medium: "organic", channel: "search" },
  { domain: "search.brave.com", source: "brave", medium: "organic", channel: "search" },
  { domain: "qwant.com", source: "qwant", medium: "organic", channel: "search" },
  { domain: "yandex.com", source: "yandex", medium: "organic", channel: "search" },
  { domain: "yandex.ru", source: "yandex", medium: "organic", channel: "search" },
  { domain: "baidu.com", source: "baidu", medium: "organic", channel: "search" },
  { domain: "startpage.com", source: "startpage", medium: "organic", channel: "search" },
  { domain: "kagi.com", source: "kagi", medium: "organic", channel: "search" },

  // Social / community
  { domain: "tiktok.com", source: "tiktok", medium: "social", channel: "social" },
  { domain: "instagram.com", source: "instagram", medium: "social", channel: "social" },
  { domain: "linkedin.com", source: "linkedin", medium: "social", channel: "social" },
  { domain: "lnkd.in", source: "linkedin", medium: "social", channel: "social" },
  { domain: "youtube.com", source: "youtube", medium: "social", channel: "social" },
  { domain: "youtu.be", source: "youtube", medium: "social", channel: "social" },
  { domain: "reddit.com", source: "reddit", medium: "social", channel: "social" },
  { domain: "facebook.com", source: "facebook", medium: "social", channel: "social" },
  { domain: "fb.me", source: "facebook", medium: "social", channel: "social" },
  { domain: "x.com", source: "x", medium: "social", channel: "social" },
  { domain: "twitter.com", source: "x", medium: "social", channel: "social" },
  { domain: "t.co", source: "x", medium: "social", channel: "social" },
  { domain: "threads.net", source: "threads", medium: "social", channel: "social" },
  { domain: "threads.com", source: "threads", medium: "social", channel: "social" },
  { domain: "pinterest.com", source: "pinterest", medium: "social", channel: "social" },
  { domain: "bsky.app", source: "bluesky", medium: "social", channel: "social" },
  { domain: "discord.com", source: "discord", medium: "social", channel: "social" },
  { domain: "news.ycombinator.com", source: "hackernews", medium: "social", channel: "social" },
];

/**
 * Hosts that are part of the product's own plumbing (auth redirects, payment
 * pages). A visit "coming from" them is a return trip, not an acquisition.
 */
const INTERNAL_HOSTS = [
  "postyapp.ai",
  "localhost",
  "checkout.stripe.com",
  "billing.stripe.com",
  "js.stripe.com",
  "accounts.google.com",
  "appleid.apple.com",
  "firebaseapp.com",
  "web.app",
];

/** Android in-app referrers (`android-app://<package>`). */
const ANDROID_APPS: Record<string, { source: string; medium: string; channel: Channel }> = {
  "com.linkedin.android": { source: "linkedin", medium: "social", channel: "social" },
  "com.instagram.android": { source: "instagram", medium: "social", channel: "social" },
  "com.zhiliaoapp.musically": { source: "tiktok", medium: "social", channel: "social" },
  "com.reddit.frontpage": { source: "reddit", medium: "social", channel: "social" },
  "com.google.android.googlequicksearchbox": { source: "google", medium: "organic", channel: "search" },
  "com.openai.chatgpt": { source: "chatgpt", medium: "referral", channel: "ai" },
};

// ───────────────────────── Helpers ─────────────────────────

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** google.com, google.fr, google.co.uk, google.com.br — but not "google.evil.com". */
const GOOGLE_SEARCH_RE = /^(www\.)?google\.(com|co\.[a-z]{2}|com\.[a-z]{2}|[a-z]{2})$/;

/** Lowercased hostname without "www.", or null when unusable. */
export function parseHost(referrer: string | undefined | null): string | null {
  if (!referrer || typeof referrer !== "string") return null;
  const trimmed = referrer.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!host || !host.includes(".") && host !== "localhost") return null;
    return host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Lowercase, collapse whitespace to "-", keep [a-z0-9_.-], cap at 40. */
export function sanitizeTag(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_.-]/g, "")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 40);
  if (!cleaned || /^__.*__$/.test(cleaned)) return undefined;
  return cleaned;
}

const SOURCE_ALIASES: Record<string, string> = {
  "chatgpt.com": "chatgpt",
  "chat.openai.com": "chatgpt",
  openai: "chatgpt",
  gpt: "chatgpt",
  "perplexity.ai": "perplexity",
  "claude.ai": "claude",
  anthropic: "claude",
  "gemini.google.com": "gemini",
  bard: "gemini",
  li: "linkedin",
  "linkedin.com": "linkedin",
  lnkd: "linkedin",
  ig: "instagram",
  insta: "instagram",
  "instagram.com": "instagram",
  tt: "tiktok",
  "tiktok.com": "tiktok",
  yt: "youtube",
  "youtube.com": "youtube",
  fb: "facebook",
  "facebook.com": "facebook",
  twitter: "x",
  "twitter.com": "x",
  "x.com": "x",
  "reddit.com": "reddit",
  "google.com": "google",
  "bing.com": "bing",
};

const MEDIUM_ALIASES: Record<string, string> = {
  cpc: "cpc",
  ppc: "cpc",
  paid: "cpc",
  paidsearch: "cpc",
  "paid-search": "cpc",
  paid_search: "cpc",
  paidsocial: "cpc",
  "paid-social": "cpc",
  paid_social: "cpc",
  display: "cpc",
  email: "email",
  "e-mail": "email",
  newsletter: "email",
  mail: "email",
  social: "social",
  "social-media": "social",
  sm: "social",
  organic: "organic",
  seo: "organic",
  referral: "referral",
  affiliate: "affiliate",
  partner: "affiliate",
  none: "none",
};

const SOCIAL_SOURCES = new Set([
  "linkedin", "instagram", "tiktok", "youtube", "reddit", "facebook", "x",
  "threads", "pinterest", "bluesky", "discord", "hackernews",
]);
const AI_SOURCES = new Set([
  "chatgpt", "perplexity", "claude", "gemini", "copilot", "you", "phind",
  "poe", "grok", "mistral", "deepseek", "meta-ai",
]);
const SEARCH_SOURCES = new Set([
  "google", "bing", "duckduckgo", "yahoo", "ecosia", "brave", "qwant",
  "yandex", "baidu", "startpage", "kagi",
]);

function channelFor(source: string, medium: string): Channel {
  if (medium === "cpc") return "paid";
  if (medium === "email") return "email";
  if (medium === "affiliate") return "affiliate";
  if (AI_SOURCES.has(source)) return "ai";
  if (SOCIAL_SOURCES.has(source) || medium === "social") return "social";
  if (SEARCH_SOURCES.has(source) || medium === "organic") return "search";
  if (source === "direct") return "direct";
  if (source === "unknown") return "unknown";
  return "referral";
}

function finish(
  base: {
    source: string;
    medium: string;
    channel: Channel;
    method: AttributionMethod;
    referrerDomain?: string;
  },
  tags: { campaign?: string; content?: string; term?: string }
): Classification {
  return {
    ...base,
    key: `${base.source}/${base.medium}`,
    ...(tags.campaign ? { campaign: tags.campaign } : {}),
    ...(tags.content ? { content: tags.content } : {}),
    ...(tags.term ? { term: tags.term } : {}),
  };
}

/** Classify a referrer host/URL on its own (no UTM). Null = not external. */
function classifyReferrer(
  referrer: string | undefined
): { source: string; medium: string; channel: Channel; domain?: string } | "unusable" | null {
  if (!referrer || !referrer.trim()) return null;

  const androidMatch = /^android-app:\/\/([a-z0-9._]+)/i.exec(referrer.trim());
  if (androidMatch) {
    const app = ANDROID_APPS[androidMatch[1].toLowerCase()];
    if (app) return { ...app };
    return "unusable";
  }

  const host = parseHost(referrer);
  if (!host) return "unusable";

  if (INTERNAL_HOSTS.some((d) => hostMatches(host, d))) return null;

  for (const rule of DOMAIN_RULES) {
    if (hostMatches(host, rule.domain)) {
      return {
        source: rule.source,
        medium: rule.medium,
        channel: rule.channel,
        domain: host,
      };
    }
  }
  if (GOOGLE_SEARCH_RE.test(host)) {
    return { source: "google", medium: "organic", channel: "search", domain: host };
  }

  return { source: host, medium: "referral", channel: "referral", domain: host };
}

// ───────────────────────── Public API ─────────────────────────

export function classifyTouch(touch: RawTouch | null | undefined): Classification {
  const t = touch ?? {};

  const campaign = sanitizeTag(t.utm_campaign);
  const content = sanitizeTag(t.utm_content);
  const term = sanitizeTag(t.utm_term);
  const tags = { campaign, content, term };

  const ref = classifyReferrer(t.referrer);
  const refDomain =
    ref && ref !== "unusable" ? ref.domain : undefined;

  // 1. Explicit UTM source
  const rawSource = sanitizeTag(t.utm_source);
  if (rawSource) {
    const source = SOURCE_ALIASES[rawSource] ?? rawSource;
    const rawMedium = sanitizeTag(t.utm_medium);
    let medium = rawMedium ? MEDIUM_ALIASES[rawMedium] ?? rawMedium : undefined;
    if (!medium) {
      medium = SOCIAL_SOURCES.has(source)
        ? "social"
        : SEARCH_SOURCES.has(source)
          ? "organic"
          : "referral";
    }
    return finish(
      {
        source,
        medium,
        channel: channelFor(source, medium),
        method: "utm",
        referrerDomain: refDomain,
      },
      tags
    );
  }

  // 2. Paid click ids (auto-tagged ads)
  if (t.gclid === true) {
    return finish(
      { source: "google", medium: "cpc", channel: "paid", method: "click_id", referrerDomain: refDomain },
      tags
    );
  }
  if (t.msclkid === true) {
    return finish(
      { source: "bing", medium: "cpc", channel: "paid", method: "click_id", referrerDomain: refDomain },
      tags
    );
  }
  if (t.ttclid === true) {
    return finish(
      { source: "tiktok", medium: "cpc", channel: "paid", method: "click_id", referrerDomain: refDomain },
      tags
    );
  }

  // 3/4. Referrer
  if (ref && ref !== "unusable") {
    return finish(
      {
        source: ref.source,
        medium: ref.medium,
        channel: ref.channel,
        method: "referrer",
        referrerDomain: ref.domain,
      },
      tags
    );
  }

  // 6. A referrer was sent but we can't read it
  if (ref === "unusable") {
    return finish(
      { source: "unknown", medium: "none", channel: "unknown", method: "unknown" },
      tags
    );
  }

  // 5. Nothing to go on
  return finish(
    { source: "direct", medium: "none", channel: "direct", method: "direct" },
    tags
  );
}

export function isDirect(c: Pick<Classification, "key">): boolean {
  return c.key === DIRECT_KEY;
}

/** Direct and unknown visits never overwrite a "latest non-direct" touch. */
export function isAttributable(c: Pick<Classification, "key">): boolean {
  return c.key !== DIRECT_KEY && c.key !== UNKNOWN_KEY;
}

/** Slug safe for use inside a Firestore document id. */
export function keySlug(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9._-]/g, "_").slice(0, 80);
}

/** Human label for the dashboard ("chatgpt / referral"). */
export function labelForKey(key: string): string {
  return key.replace("/", " / ");
}
