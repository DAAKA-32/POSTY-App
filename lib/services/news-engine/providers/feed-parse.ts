/**
 * Tolerant RSS/Atom item extractor.
 *
 * We deliberately avoid a heavyweight XML dependency: the feeds we read are a
 * curated, well-formed allowlist, and we only need title / link / date /
 * summary per entry. Handles both RSS (<item>) and Atom (<entry>) shapes and
 * CDATA. Best-effort — a malformed feed simply yields fewer/no items.
 */

export interface RawFeedEntry {
  title: string;
  link: string;
  publishedAt: number | null;
  summary?: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/<[^>]+>/g, "") // strip any nested tags
    .replace(/\s+/g, " ")
    .trim();
}

function pickTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const m = re.exec(block);
  return m ? decodeEntities(m[1]) : null;
}

/** Atom <link href="..."/> (self-closing) or RSS <link>...</link>. */
function pickLink(block: string): string | null {
  const rss = /<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i.exec(block);
  if (rss && rss[1].trim()) return decodeEntities(rss[1]);
  // Atom: prefer rel="alternate", else first href.
  const alt = /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i.exec(block);
  if (alt) return alt[1];
  const any = /<link[^>]*href=["']([^"']+)["']/i.exec(block);
  return any ? any[1] : null;
}

function parseDate(block: string): number | null {
  const raw =
    pickTag(block, "pubDate") ||
    pickTag(block, "published") ||
    pickTag(block, "updated") ||
    pickTag(block, "dc:date");
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

/** Split a feed body into <item> or <entry> blocks and extract each. */
export function parseFeed(xml: string, limit = 25): RawFeedEntry[] {
  const blocks = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(item|entry)>/gi) || [];
  const out: RawFeedEntry[] = [];
  for (const block of blocks.slice(0, limit)) {
    const title = pickTag(block, "title");
    const link = pickLink(block);
    if (!title || !link) continue;
    out.push({
      title,
      link,
      publishedAt: parseDate(block),
      summary: pickTag(block, "summary") || pickTag(block, "description") || undefined,
    });
  }
  return out;
}
