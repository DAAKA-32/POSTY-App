/**
 * Tagged-link builder.
 *
 * AI assistants, many apps and some browsers send no referrer, so those
 * visits would land in "direct / none". A tagged link carries the source
 * explicitly (utm_*), which the attribution rules (attribution.ts) rank above
 * any referrer — the only reliable way to measure ChatGPT & co.
 *
 * The builder normalises values with the SAME sanitiser the server uses, so
 * what you copy is exactly what will be recorded (round-trip tested).
 */

import { classifyTouch, sanitizeTag } from "./attribution";

/** Hosts a tagged link may point to — never an arbitrary domain. */
export const ALLOWED_LINK_HOSTS = ["postyapp.ai", "www.postyapp.ai"] as const;
export const DEFAULT_LINK_BASE = "https://postyapp.ai/";

export interface ChannelPreset {
  id: string;
  label: string;
  source: string;
  medium: string;
  note?: string;
}

export const CHANNEL_PRESETS: readonly ChannelPreset[] = [
  { id: "chatgpt", label: "ChatGPT", source: "chatgpt.com", medium: "referral", note: "Liens partagés dans ChatGPT / réponses IA" },
  { id: "perplexity", label: "Perplexity", source: "perplexity", medium: "referral" },
  { id: "claude", label: "Claude", source: "claude", medium: "referral" },
  { id: "gemini", label: "Gemini", source: "gemini", medium: "referral" },
  { id: "linkedin", label: "LinkedIn (post)", source: "linkedin", medium: "social" },
  { id: "linkedin-ads", label: "LinkedIn (pub)", source: "linkedin", medium: "cpc" },
  { id: "instagram", label: "Instagram (bio / story)", source: "instagram", medium: "social", note: "Instagram n'envoie pas toujours de referrer : balisez toujours" },
  { id: "tiktok", label: "TikTok (bio)", source: "tiktok", medium: "social" },
  { id: "youtube", label: "YouTube (description)", source: "youtube", medium: "social" },
  { id: "reddit", label: "Reddit", source: "reddit", medium: "social" },
  { id: "x", label: "X", source: "x", medium: "social" },
  { id: "newsletter", label: "Newsletter", source: "newsletter", medium: "email" },
  { id: "outreach", label: "E-mail de prospection", source: "outreach", medium: "email" },
  { id: "partner", label: "Partenaire / affilié", source: "partner", medium: "affiliate", note: "Remplacez « partner » par le nom du partenaire" },
];

export interface TaggedLinkInput {
  base?: string;
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
}

export type TaggedLinkResult =
  | {
      ok: true;
      url: string;
      /** How the server will classify a visit through this link. */
      recorded: { key: string; campaign?: string; content?: string; term?: string };
    }
  | { ok: false; error: string };

export function buildTaggedUrl(input: TaggedLinkInput): TaggedLinkResult {
  let url: URL;
  try {
    url = new URL(input.base?.trim() || DEFAULT_LINK_BASE);
  } catch {
    return { ok: false, error: "URL de base invalide." };
  }
  if (url.protocol !== "https:" || !(ALLOWED_LINK_HOSTS as readonly string[]).includes(url.hostname)) {
    return { ok: false, error: "L'URL doit pointer vers https://postyapp.ai." };
  }

  const source = sanitizeTag(input.source);
  const medium = sanitizeTag(input.medium);
  const campaign = sanitizeTag(input.campaign);
  if (!source) return { ok: false, error: "Source manquante ou invalide." };
  if (!medium) return { ok: false, error: "Support (medium) manquant ou invalide." };
  if (!campaign) return { ok: false, error: "Nom de campagne manquant ou invalide." };
  const content = sanitizeTag(input.content);
  const term = sanitizeTag(input.term);

  // Drop any stale campaign params so the link carries exactly one set.
  for (const k of [...url.searchParams.keys()]) {
    if (k.startsWith("utm_")) url.searchParams.delete(k);
  }
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", campaign);
  if (content) url.searchParams.set("utm_content", content);
  if (term) url.searchParams.set("utm_term", term);

  const c = classifyTouch({
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
    utm_content: content,
    utm_term: term,
  });
  return {
    ok: true,
    url: url.toString(),
    recorded: { key: c.key, campaign: c.campaign, content: c.content, term: c.term },
  };
}
