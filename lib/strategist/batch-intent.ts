/**
 * Strategist intent detector (client-side, pure regex, <1ms, no LLM).
 *
 * Decides what a free-form message should produce:
 *   - "plan"  → /api/strategist/batch-plan with N briefs (a plan card)
 *   - "post"  → the same pipeline with 1 brief (a single-post card, written
 *               in one click)
 *   - "chat"  → the conversational advisor
 *
 * Conservative by design: anything ambiguous goes to the advisor, which can
 * always hand back to a plan ("Turn into a plan"). Known false positives that
 * are now routed to the advisor:
 *   - past / reporting statements ("j'ai fait 3 posts cette semaine, tu en penses quoi ?")
 *   - questions ("Quel plan de contenu pour le mois ?", "Comment faire 3 posts par semaine ?")
 *   - ideation asks ("Génère 10 angles d'accroche pour mes prochains posts")
 *   - reviews ("Analyse mes 5 derniers posts")
 */

export type PlanPeriod = "day" | "week" | "month" | "none";

export type StrategistIntent =
  | { kind: "chat" }
  | { kind: "post" }
  | { kind: "plan"; count: number; period: PlanPeriod };

const NUMBER_WORDS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8,
  neuf: 9, dix: 10, douze: 12, quinze: 15,
  one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5, seven: 7, eight: 8,
  nine: 9, ten: 10, twelve: 12, fifteen: 15,
};

const POST_NOUN = String.raw`(?:posts?|publications?|articles?|briefs?|contenus?)`;
const NUM = String.raw`(\d{1,2}|${Object.keys(NUMBER_WORDS).join("|")})`;
/** "5 posts", "trois publications", "a post", "un nouveau post", "5 idées de posts", "5 post ideas". */
const COUNT_RE = new RegExp(
  String.raw`(?:^|[^\p{L}\d])${NUM}\s+(?:(?:nouveaux?|nouvelles?|new|petits?|courts?|short|linkedin)\s+)?(?:${POST_NOUN}|id[ée]es?\s+de\s+posts?|post\s+ideas?)(?![\p{L}])`,
  "iu",
);

const VERB_RE =
  /(?:^|[^\p{L}])(?:pr[ée]pare[sz]?|pr[ée]parer|g[ée]n[èe]re[sz]?|g[ée]n[ée]rer|cr[ée]e[sz]?|cr[ée]er|fais|faire|donne[sz]?|donner|planifie[sz]?|planifier|organise[sz]?|organiser|propose[sz]?|proposer|r[ée]dige[sz]?|r[ée]diger|[ée]cris|[ée]crire|construis|construire|programme[sz]?|programmer|sors|sortir|prepare|generate|create|give|make|plan|write|draft|build|schedule|propose|suggest|come up with)(?![\p{L}])/iu;
const POLITE_RE =
  /(?:^|[^\p{L}])(?:peux[- ]tu|pourrais[- ]tu|tu peux|tu pourrais|pouvez[- ]vous|j['’]aimerais|je voudrais|je veux|il me faut|j['’]ai besoin d['’e]|can you|could you|would you|i want|i need|i['’]d like)(?![\p{L}])/iu;

const PLAN_NOUN_RE =
  /(?:^|[^\p{L}])(?:planning|calendrier|calendar|plan\s+(?:de|du|d['’])\s*(?:contenu|publications?|posts?|la\s+semaine|du\s+mois|[ée]ditorial)|plan\s+[ée]ditorial|editorial\s+(?:plan|calendar)|content\s+(?:plan|calendar)|posting\s+plan)(?![\p{L}])/iu;
const PLURAL_POSTS_RE = /(?:^|[^\p{L}])(?:posts|publications|articles|briefs|id[ée]es\s+de\s+posts|post\s+ideas)(?![\p{L}])/iu;
const SINGULAR_POST_RE =
  /(?:^|[^\p{L}])(?:un|une|mon\s+prochain|le\s+prochain|ce|a|my\s+next|one|another|un\s+autre|une\s+autre)\s+(?:(?:nouveau|nouvelle|petit|court|short|new|linkedin)\s+)?(?:post|publication|article)(?![\p{L}])/iu;

const WEEK_RE = /(?:^|[^\p{L}])(?:semaines?|weeks?|hebdo(?:madaire)?|weekly)(?![\p{L}])/iu;
const MONTH_RE = /(?:^|[^\p{L}])(?:mois|months?|mensuel|monthly)(?![\p{L}])/iu;
const DAY_RE = /(?:^|[^\p{L}])(?:aujourd['’]hui|demain|today|tomorrow|ce\s+soir|tonight)(?![\p{L}])/iu;
const PER_DAY_RE = /(?:^|[^\p{L}])(?:par\s+jour|chaque\s+jour|tous\s+les\s+jours|per\s+day|every\s+day|daily)(?![\p{L}])/iu;
const PER_WEEK_RE = /(?:^|[^\p{L}])(?:par\s+semaine|chaque\s+semaine|per\s+week|a\s+week|every\s+week)(?![\p{L}])/iu;

const PAST_RE =
  /(?:^|[^\p{L}])(?:j['’]ai|on\s+a|nous\s+avons|tu\s+as|i['’]ve|i\s+have|we['’]ve|we\s+have|i)\s+(?:d[ée]j[àa]\s+|already\s+)?(?:fait|[ée]crit|publi[ée]|post[ée]|r[ée]dig[ée]|sorti|made|written|posted|published|did|wrote|shipped)(?![\p{L}])/iu;
const QUESTION_START_RE =
  /^\s*(?:quel(?:le)?s?|comment|pourquoi|combien|est[- ]ce|qu['’]est[- ]ce|dois[- ]je|faut[- ]il|vaut[- ]il|what|which|how|why|should|is\s+it|do\s+you|does)(?![\p{L}])/iu;
const IDEATION_RE =
  /(?:^|[^\p{L}])(?:angles?|hooks?|accroches?|titres?|headlines?|sujets?|th[èe]mes?|piliers?|pillars?|topics?|positionnement|positioning)(?![\p{L}])/iu;
const REVIEW_RE =
  /(?:^|[^\p{L}])(?:analyse[sz]?|analyser|audite[sz]?|auditer|critique[sz]?|am[ée]liore[sz]?|relis|review|audit|improve|feedback|corrige[sz]?)(?![\p{L}])/iu;

const CLAMP_MAX = 15;

function clampCount(n: number): number {
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(CLAMP_MAX, Math.round(n)));
}

function parseCount(text: string): number | null {
  const m = text.match(COUNT_RE);
  if (!m) return null;
  const raw = m[1].toLowerCase();
  const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : NUMBER_WORDS[raw];
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function detectStrategistIntent(prompt: string): StrategistIntent {
  const raw = (prompt ?? "").trim();
  if (raw.length < 6) return { kind: "chat" };
  const text = raw.toLowerCase();

  const polite = POLITE_RE.test(text);
  if (PAST_RE.test(text)) return { kind: "chat" };
  if (QUESTION_START_RE.test(text) && !polite) return { kind: "chat" };

  const hasVerb = VERB_RE.test(text) || polite;
  if (!hasVerb) return { kind: "chat" };

  const count = parseCount(text);
  const hasPlanNoun = PLAN_NOUN_RE.test(text);
  const hasPluralPosts = PLURAL_POSTS_RE.test(text);
  const hasSingularPost = SINGULAR_POST_RE.test(text);

  // Reviewing / auditing existing posts is advice, not generation.
  if (REVIEW_RE.test(text) && !/(?:pr[ée]pare|g[ée]n[èe]re|r[ée]dige|[ée]cris|write|draft|generate|prepare)/iu.test(text)) {
    return { kind: "chat" };
  }
  // Asking for angles / hooks / themes → the advisor lists them.
  if (IDEATION_RE.test(text) && count === null && !hasPlanNoun) return { kind: "chat" };

  const period: PlanPeriod = MONTH_RE.test(text)
    ? "month"
    : WEEK_RE.test(text)
      ? "week"
      : DAY_RE.test(text)
        ? "day"
        : "none";

  if (count !== null) {
    // "un post par jour cette semaine" / "3 posts par semaine ce mois-ci"
    if (PER_DAY_RE.test(text) && period === "week") return { kind: "plan", count: 5, period };
    if (PER_WEEK_RE.test(text) && period === "month") {
      return { kind: "plan", count: clampCount(count * 4), period };
    }
    if (count === 1) return { kind: "post" };
    return { kind: "plan", count: clampCount(count), period };
  }

  if (hasPlanNoun || hasPluralPosts) {
    const fallback = period === "month" ? 12 : period === "day" ? 1 : 5;
    return fallback === 1 ? { kind: "post" } : { kind: "plan", count: fallback, period };
  }

  if (hasSingularPost) return { kind: "post" };

  return { kind: "chat" };
}
