"use client";

/**
 * StrategistMarkdown — lightweight inline markdown renderer (sober rebuild).
 *
 * All inline accents (italic emphasis, ordered list numerals, bullet dots)
 * use neutral grays — the amber palette is reserved for the Max badge and
 * the Upgrade CTA elsewhere in the drawer.
 *
 * Handles ## headings, **bold**, *italic*, `code`, - bulleted lists, 1.
 * ordered lists, and paragraph breaks. No external dependencies.
 */

import { Fragment, ReactNode, useMemo, memo } from "react";

function StrategistMarkdown({ content }: { content: string }) {
  // Parse once per distinct `content`, and `memo` the component so unrelated
  // parent re-renders don't re-run the parser (it re-parsed the whole markdown
  // on every render, including on each streaming chunk).
  const blocks = useMemo(() => parseBlocks(content), [content]);
  return (
    <div className="space-y-3 text-[14px] leading-[1.65] text-gray-700 dark:text-gray-200">
      {blocks}
    </div>
  );
}

export default memo(StrategistMarkdown);

// ── Block-level parsing ────────────────────────────────────────────────────

function parseBlocks(content: string): ReactNode[] {
  const lines = content.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      out.push(
        <h3
          key={key++}
          className="text-[14px] font-semibold text-gray-900 dark:text-white tracking-tight pt-1 first:pt-0"
        >
          {renderInline(line.slice(3))}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith("# ")) {
      out.push(
        <h2
          key={key++}
          className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight pt-1 first:pt-0"
        >
          {renderInline(line.slice(2))}
        </h2>
      );
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*•]\s+/, ""));
        i++;
      }
      out.push(
        <ul key={key++} className="space-y-1 pl-1">
          {items.map((it, j) => (
            <li key={j} className="flex gap-2.5">
              <span className="mt-[0.6em] flex-shrink-0 w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500" />
              <span className="flex-1">{renderInline(it)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list — quiet gray numerals
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      out.push(
        <ol key={key++} className="space-y-2 pl-0.5">
          {items.map((it, j) => (
            <li key={j} className="flex gap-2.5">
              <span className="flex-shrink-0 inline-flex items-center justify-center w-[18px] h-[18px] mt-[3px] rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-medium text-gray-600 dark:text-gray-400 tabular-nums">
                {j + 1}
              </span>
              <span className="flex-1">{renderInline(it)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(##\s|#\s|[-*•]\s|\d+\.\s)/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(
      <p key={key++}>
        {para.map((pl, j) => (
          <Fragment key={j}>
            {renderInline(pl)}
            {j < para.length - 1 && <br />}
          </Fragment>
        ))}
      </p>
    );
  }

  return out;
}

// ── Inline parsing ─────────────────────────────────────────────────────────

function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const boldRegex = /\*\*([^*]+?)\*\*/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = boldRegex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      parts.push(...renderInlineRest(text.slice(lastIdx, m.index), `pre${key}`));
    }
    parts.push(
      <strong
        key={`b${key++}`}
        className="font-semibold text-gray-900 dark:text-white"
      >
        {renderInlineRest(m[1], `inb${key}`)}
      </strong>
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) {
    parts.push(...renderInlineRest(text.slice(lastIdx), `tail${key}`));
  }

  return parts.length > 0 ? parts : text;
}

function renderInlineRest(text: string, baseKey: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  const regex = /\*([^*]+?)\*|`([^`]+?)`/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let n = 0;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIdx) tokens.push(text.slice(lastIdx, m.index));
    if (m[1] !== undefined) {
      // Italic emphasis — quiet gray (used by *Why:* / *How:* meta labels)
      tokens.push(
        <em
          key={`${baseKey}-i${n++}`}
          className="not-italic font-medium text-gray-500 dark:text-gray-400"
        >
          {m[1]}
        </em>
      );
    } else if (m[2] !== undefined) {
      tokens.push(
        <code
          key={`${baseKey}-c${n++}`}
          className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/80 text-[0.85em] font-mono text-gray-800 dark:text-gray-200"
        >
          {m[2]}
        </code>
      );
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) tokens.push(text.slice(lastIdx));

  return tokens.length > 0 ? tokens : [text];
}
