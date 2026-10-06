/**
 * Strategist plan quality gate — deterministic checks on the planner's briefs,
 * plus the messages for ONE targeted rewrite of the briefs that fail.
 *
 * Why in code: real generations showed gpt-4o ignoring part of the prompt's
 * hook rules ("Voici comment…", "Pourquoi…", "N conseils pour…") and inventing
 * figures for case studies ("réduit ses no-shows de 30%"). A rule the model
 * skips 1 time out of 4 has to be checked, not just stated.
 *
 * Pure module (no OpenAI / Firestore) — unit-tested.
 */

import type { PostBrief } from "@/types";

type Lang = "fr" | "en";

/** Statistic-like tokens: percentages, amounts, multiples. Plain small counts
 *  ("3 steps", "6 years") are not statistics and are left alone. */
const STAT_TOKEN =
  /\d+(?:[.,]\d+)?\s?%|\d+(?:[.,]\d+)?\s?(?:k€|m€|€|\$|euros?|dollars?)|\bx\s?\d+(?:[.,]\d+)?\b|\b\d+(?:[.,]\d+)?\s?x\b|\b\d+(?:[.,]\d+)?\s?(?:fois plus|times (?:more|faster|less))\b|\b(?:doubl|tripl|quadrupl)(?:[ée]e?s?|ed)(?![a-zà-ÿ])|\b\d+\s?(?:heures?|h|hours?)\s+(?:par|per|\/)\s?(?:semaine|week|mois|month|jour|day)\b/gi;

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, "");

/** Statistic-like figures in any text that do NOT appear in `knownFacts`. */
export function findUnverifiedStats(text: string, knownFacts: string): string[] {
  const known = squash(knownFacts);
  const found = text.match(STAT_TOKEN) ?? [];
  return [...new Set(found.map((f) => f.trim()))].filter((f) => !known.includes(squash(f)));
}

/** Figures in a brief that do NOT appear in what the author actually wrote. */
export function findUnverifiedFigures(
  brief: Pick<PostBrief, "hook" | "angle">,
  knownFacts: string,
): string[] {
  const known = squash(knownFacts);
  const found = `${brief.hook}\n${brief.angle}`.match(STAT_TOKEN) ?? [];
  return [...new Set(found.map((f) => f.trim()))].filter((f) => !known.includes(squash(f)));
}

const TITLE_HOOKS: Record<Lang, Array<{ re: RegExp; label: string }>> = {
  fr: [
    { re: /^(comment|pourquoi)\b/i, label: "titre en « Comment / Pourquoi… »" },
    { re: /^voici\b/i, label: "« Voici… »" },
    { re: /^\d+\s+(conseils?|astuces?|erreurs?|[ée]tapes?|raisons?|fa[çc]ons?|cl[ée]s?|secrets?|le[çc]ons?|outils?|r[èe]gles?)\b/i, label: "liste « N conseils… »" },
    { re: /\b(le secret|par o[ùu] commencer|plus que jamais|saviez-vous|et si je vous disais|dans un monde o[ùu]|retour sur)\b/i, label: "formule toute faite" },
    { re: /\b(sont-ils|sont-elles|est-il|est-elle)\b[^?]*\?\s*$/i, label: "question fermée générique" },
    { re: /\b(plonger dans l'inconnu|sortir des sentiers battus|faire toute la diff[ée]rence|changement de paradigme)\b/i, label: "cliché" },
    { re: /^[^:?!.]{3,70}\s?:\s+\S/, label: "titre avec deux-points" },
    { re: /\bvoici\b/i, label: "« voici… »" },
    // `\b` doesn't see accented letters as word chars → explicit lookahead.
    { re: /\b(la cl[ée]|c'est possible|est-ce possible|c'est tout un art|c'est crucial|c'est essentiel|pour r[ée]ussir sur linkedin)(?![a-zà-ÿ])/i, label: "formule de titre" },
    { re: /\b(?:ces|mes|les|en)\s+\d+\s+(?:[ée]tapes|conseils|astuces|erreurs|r[èe]gles|le[çc]ons|raisons|cl[ée]s|outils)\b/i, label: "liste « ces N étapes »" },
    { re: /[.!]\s+[^.!?]{1,40}\?\s*$/, label: "question-teaser en fin d'accroche" },
  ],
  en: [
    { re: /^(how|why)\b/i, label: 'title-style "How / Why…"' },
    { re: /^here'?s\b/i, label: '"Here\'s…"' },
    { re: /^\d+\s+(tips?|ways?|mistakes?|steps?|reasons?|secrets?|lessons?|tools?|rules?|tactics?)\b/i, label: 'listicle "N tips…"' },
    { re: /\b(the secret|where to start|more than ever|did you know|what if i told you|in a world where)\b/i, label: "stock phrase" },
    { re: /^(is|are|do|does|can|should)\b[^?]*\?\s*$/i, label: "generic yes/no question" },
    { re: /\b(think outside the box|game[- ]changer|the backbone of|the cornerstone of|paradigm shift)\b/i, label: "cliché" },
    { re: /^looking to\b|\blet'?s (?:analy[sz]e|explore|dive|dig|talk|unpack)\b|\bstart with these\b/i, label: "stock phrase" },
    { re: /^[^:?!.]{3,70}:\s+\S/, label: "title with a colon" },
    { re: /\bhere'?s (?:why|how|what)\b/i, label: '"here\'s why/how"' },
    { re: /\b(the key to|is it possible|it'?s possible)\b/i, label: "title formula" },
    { re: /\b(?:these|my|the|in)\s+\d+\s+(?:steps|tips|mistakes|rules|lessons|reasons|keys|tools)\b/i, label: 'listicle "these N steps"' },
    { re: /[.!]\s+[^.!?]{1,40}\?\s*$/, label: "teaser question at the end of the hook" },
  ],
};

/** Why a hook reads like an article title / stock phrase (empty = fine). */
export function hookIssues(hook: string, language: Lang): string[] {
  const h = hook.trim();
  const out: string[] = [];
  for (const { re, label } of TITLE_HOOKS[language]) if (re.test(h)) out.push(label);
  if (h.length > 180) out.push(language === "fr" ? "trop long (> 180 caractères)" : "too long (> 180 characters)");
  return out;
}

export interface BriefFlag {
  id: string;
  hook: string;
  angle: string;
  hookProblems: string[];
  unverified: string[];
}

export function flagBriefs(posts: PostBrief[], knownFacts: string, language: Lang): BriefFlag[] {
  return posts
    .map((p) => ({
      id: p.id,
      hook: p.hook,
      angle: p.angle,
      hookProblems: hookIssues(p.hook, language),
      unverified: findUnverifiedFigures(p, knownFacts),
    }))
    .filter((f) => f.hookProblems.length > 0 || f.unverified.length > 0);
}

/** Messages for ONE JSON call that rewrites only the flagged briefs. */
export function buildBriefRepairMessages(
  flags: BriefFlag[],
  language: Lang,
  authorEdge?: string,
): { system: string; user: string } {
  const fr = language === "fr";
  const system = fr
    ? `Tu es un éditeur LinkedIn senior. Tu corriges des briefs de posts. Pour chaque item :
- Réécris le "hook" comme une phrase que l'auteur DIRAIT à voix haute, pas un titre d'article : concrète (un moment, une décision, une phrase entendue, un détail du métier) ou une prise de position nette. 140 caractères maximum, en première personne si c'est naturel.
- Interdits dans le hook : « Comment… », « Pourquoi… », « Voici… », « N conseils… », « Le secret… », « par où commencer », « plus que jamais », les questions fermées génériques, les clichés.
- Le nouveau hook ne contient AUCUNE des formes listées dans "problems", où qu'elles soient dans la phrase (début, milieu ou fin).
- Retire TOUT chiffre listé comme non vérifié, du hook ET de l'angle, sans en inventer d'autre : reformule de façon qualitative.
- Garde l'idée, le format implicite et la langue (français). Ne change pas "id".
Réponds UNIQUEMENT en JSON : {"posts":[{"id","hook","angle"}]}`
    : `You are a senior LinkedIn editor. You fix post briefs. For each item:
- Rewrite the "hook" as a sentence the author would SAY out loud, not an article title: concrete (a moment, a decision, a sentence someone said, a detail of the craft) or a clear stance. 140 characters max, first person when natural.
- Forbidden in the hook: "How…", "Why…", "Here's…", "N tips…", "The secret…", "where to start", "more than ever", generic yes/no questions, clichés.
- The new hook contains NONE of the shapes listed in "problems", anywhere in the sentence (start, middle or end).
- Remove EVERY figure listed as unverified, from the hook AND the angle, without inventing another: rephrase qualitatively.
- Keep the idea, the implicit format and the language (English). Do not change "id".
Respond ONLY with JSON: {"posts":[{"id","hook","angle"}]}`;

  const items = flags.map((f) => ({
    id: f.id,
    hook: f.hook,
    angle: f.angle,
    problems: [...f.hookProblems, ...f.unverified.map((u) => (fr ? `chiffre non vérifié « ${u} »` : `unverified figure "${u}"`))],
  }));
  const user = `${authorEdge ? `${fr ? "Ce qui distingue l'auteur" : "What sets the author apart"} : ${authorEdge}\n\n` : ""}${JSON.stringify({ posts: items }, null, 1)}`;
  return { system, user };
}
