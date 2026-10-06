/**
 * Deterministic last pass on a Strategist post, applied after the shared
 * engine (generation + quality gate) and before the post is stored.
 *
 * Fixes what the model reliably gets wrong and what LinkedIn renders badly —
 * observed in real generations (scripts/strategist-eval.ts):
 *   - markdown emphasis / headings: LinkedIn shows "**" and "##" literally
 *   - indented continuation lines under list items
 *   - hashtags glued to the last sentence instead of their own line
 *   - acronym hashtags mangled by the shared normalizer ("#HR" → "#hR")
 *   - 3+ consecutive blank lines
 *
 * Pure and idempotent. Strategist-only: the chat path is not touched.
 */

const HASHTAG = /#[\p{L}\p{N}_-]+/gu;

/** "#hR" → "#hr", "#sEO" → "#seo", "#hRStrategy" → "#hrStrategy",
 *  "#hRstrategy" → "#hrstrategy". */
function fixAcronymHashtag(tag: string): string {
  const body = tag.slice(1);
  const m = body.match(/^([a-z])([A-Z0-9]+)(?=[A-Z][a-z]|$)/);
  if (m) return `#${(m[1] + m[2]).toLowerCase()}${body.slice(m[0].length)}`;
  const one = body.match(/^([a-z])([A-Z])(?=[a-z])/);
  if (one) return `#${one[1]}${one[2].toLowerCase()}${body.slice(2)}`;
  return tag;
}

function stripMarkdown(line: string): string {
  return line
    .replace(/^\s{0,3}#{1,6}\s+/, "") // headings
    .replace(/\*\*([^*\n]+?)\*\*/g, "$1") // **bold**
    .replace(/__([^_\n]+?)__/g, "$1") // __bold__
    .replace(/(^|[\s(«"'])\*([^*\n]+?)\*(?=[\s.,!?;:)»"']|$)/g, "$1$2") // *italic*
    .replace(/^\s*\*\s+/, "- "); // "* item" → "- item"
}

const isHashtagOnly = (line: string) => /^(#[\p{L}\p{N}_-]+\s*)+$/u.test(line.trim());

export function polishStrategistPost(raw: string): string {
  if (!raw) return raw;
  let lines = raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => stripMarkdown(l).replace(/^[ \t]+/, "").replace(/[ \t]+$/, ""));

  // Move hashtags glued at the end of the last text line to their own line.
  let lastIdx = lines.length - 1;
  while (lastIdx >= 0 && !lines[lastIdx].trim()) lastIdx--;
  if (lastIdx >= 0 && !isHashtagOnly(lines[lastIdx])) {
    const m = lines[lastIdx].match(/^(.*?[^\s#])\s+((?:#[\p{L}\p{N}_-]+\s*){1,6})$/u);
    if (m) {
      lines[lastIdx] = m[1];
      lines.splice(lastIdx + 1, 0, "", m[2].trim());
    }
  }

  // Exactly one blank line before a trailing hashtag line.
  lastIdx = lines.length - 1;
  while (lastIdx >= 0 && !lines[lastIdx].trim()) lastIdx--;
  if (lastIdx > 0 && isHashtagOnly(lines[lastIdx]) && lines[lastIdx - 1].trim()) {
    lines.splice(lastIdx, 0, "");
  }

  let text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  // Hashtags: no diacritics ("#gestionSimplifiée" splits the tag on LinkedIn
  // search), acronyms unmangled.
  text = text.replace(HASHTAG, (tag) =>
    fixAcronymHashtag(tag.normalize("NFD").replace(/[̀-ͯ]/g, "")),
  );
  lines = text.split("\n");
  return lines.join("\n");
}
