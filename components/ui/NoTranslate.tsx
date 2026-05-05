import { Fragment, type ReactNode } from "react";
import { PROTECTED_BRAND_REGEX } from "@/lib/brand/protected-names";

type AsTag = "span" | "strong" | "em" | "b" | "i" | "code" | "div" | "p";

interface NoTranslateProps {
  children: ReactNode;
  /** Inline by default; pick a block tag only if you really need one. */
  as?: AsTag;
  className?: string;
}

/**
 * Wraps content that must never be touched by Google Translate, browser
 * auto-translate, or third-party extension translators.
 *
 * Sends two signals at once because no single one is universal:
 *   - `translate="no"` — the HTML5 attribute (Chrome, Edge)
 *   - `class="notranslate"` — Google Translate's legacy convention (still
 *     respected by older Chrome, the standalone Translate widget, and most
 *     extensions)
 *
 * Use for proper nouns: brand names, product names, user handles, code
 * identifiers, version strings.
 */
export default function NoTranslate({
  children,
  as: Tag = "span",
  className,
}: NoTranslateProps) {
  return (
    <Tag translate="no" className={`notranslate${className ? ` ${className}` : ""}`}>
      {children}
    </Tag>
  );
}

/**
 * Scans a string and wraps every known brand name occurrence in <NoTranslate>.
 * Returns a React fragment ready to render.
 *
 *   autoProtect("Connect your LinkedIn account to Posty")
 *   // → ["Connect your ", <NoTranslate>LinkedIn</NoTranslate>, " account to ",
 *   //    <NoTranslate>Posty</NoTranslate>]
 *
 * Use when a translatable sentence (`t("...")`) embeds a brand name and you
 * can't restructure the i18n key. For static UI prefer <NoTranslate> directly.
 */
export function autoProtect(text: string): ReactNode {
  if (!text) return text;
  // Reset lastIndex defensively — global regexes are stateful when reused.
  PROTECTED_BRAND_REGEX.lastIndex = 0;
  const parts = text.split(PROTECTED_BRAND_REGEX);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (!part) return null;
    // Odd indices are the captured brand matches.
    if (i % 2 === 1) {
      return (
        <NoTranslate key={i}>
          {part}
        </NoTranslate>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
