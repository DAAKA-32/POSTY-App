import React from "react";

/**
 * Render a translation string that contains inline emphasis markup
 * (`<strong>...</strong>` or `<em>...</em>`) as React nodes — WITHOUT going
 * through `dangerouslySetInnerHTML`.
 *
 * Everything outside the recognized tags is rendered as plain text, so React
 * automatically escapes any stray HTML. Translations files are author-trusted
 * today, but routing them through `innerHTML` would be a footgun the day a
 * translation becomes user-editable (community translations, CMS, etc.).
 *
 * Supported markup: only nesting-free <strong>...</strong> and <em>...</em>.
 * Anything else (script, anchor, attribute) renders verbatim as text.
 */
const INLINE_TAG_REGEX = /<(strong|em)>([\s\S]*?)<\/\1>/gi;

export function renderInlineMarkup(input: string): React.ReactNode {
  if (!input) return null;

  const out: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  // Reset state — exec()'s lastIndex is sticky with /g
  INLINE_TAG_REGEX.lastIndex = 0;

  while ((match = INLINE_TAG_REGEX.exec(input)) !== null) {
    if (match.index > lastIndex) {
      out.push(input.slice(lastIndex, match.index));
    }
    const tag = match[1].toLowerCase();
    const inner = match[2];
    if (tag === "strong") {
      out.push(<strong key={key++}>{inner}</strong>);
    } else {
      out.push(<em key={key++}>{inner}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    out.push(input.slice(lastIndex));
  }

  return out;
}
