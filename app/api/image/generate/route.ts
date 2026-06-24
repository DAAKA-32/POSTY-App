/**
 * POST /api/image/generate
 *
 * Pipeline:
 *   1. Auth (Firebase token)
 *   2. Per-day image quota check (Pro=3, Max=5, Free=0)
 *   3. AI fills the DSL via OpenAI JSON mode
 *   4. Zod validates the response
 *   5. Satori → resvg renders to PNG
 *   6. PNG uploaded to Firebase Storage
 *   7. Quota incremented atomically
 *   8. Returns { url, dsl, quota } JSON
 *
 * Anything before step 7 short-circuits with a structured error. The quota
 * is only consumed after a successful render+upload so a 5xx mid-pipeline
 * doesn't burn the user's daily budget.
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth";
import {
  ACCENT_KEYS,
  ImageDSLSchema,
  PHOTO_TEMPLATES,
  TEMPLATE_IDS,
  isPhotoTemplate,
  type ImageDSL,
  type AccentKey,
  type TemplateId,
} from "@/lib/image-gen/dsl";
import { buildSystemPrompt, buildUserPrompt, buildRetryPrompt } from "@/lib/image-gen/prompt";
import { renderDSL } from "@/lib/image-gen/render";
import { uploadGeneratedImage } from "@/lib/image-gen/storage";
import { checkImageQuota, incrementImageQuota } from "@/lib/image-gen/quota";
import { IMAGE_GEN_QUOTA_ENABLED } from "@/lib/image-gen/config";
import {
  readRecentHistory,
  appendToHistory,
  computeDiversityBias,
  type ImageGenHistoryEntry,
} from "@/lib/image-gen/history";
import { trackAIUsage, readUsageFromResponse } from "@/lib/ai-cost/tracker";

export const runtime = "nodejs";
// Satori font fetch + render typically takes 800-2000ms end-to-end. With
// variantCount > 1 the renders run in parallel so total wall time stays
// close to a single-variant call (≈ 2-4s p95).
export const maxDuration = 45;

const RequestSchema = z.object({
  brief: z.string().min(3).max(800),
  postContext: z.string().max(2000).optional(),
  language: z.enum(["fr", "en"]).default("fr"),
  /** How many visual variants to generate in one call (1–3). The route
   *  enforces a per-plan cap on top of this value: Pro ≤ 2, Max ≤ 3. */
  variantCount: z.number().int().min(1).max(3).optional().default(1),
});

/** Plan-specific cap on variants per call. The day-quota gate above stays
 *  unchanged — one multi-variant call still costs one quota credit, the cap
 *  is what prevents abuse via "give me 10 variants from one credit". */
const MAX_VARIANTS_PER_PLAN: Record<"free" | "pro" | "max", number> = {
  free: 0,
  pro: 2,
  max: 3,
};

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  const { uid, email } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedReq = RequestSchema.safeParse(body);
  if (!parsedReq.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsedReq.error.flatten() },
      { status: 400 }
    );
  }
  const { brief, postContext, language, variantCount: requestedVariantCount } = parsedReq.data;

  // ── Quota ────────────────────────────────────────────────────────────────
  // When the master flag is off, skip both the check AND the increment so
  // we don't pollute `users/{uid}.imageGenUsage` with throwaway data during
  // the open-beta window. The `quota` object returned to the client is then
  // synthetic — "max" plan, effectively unlimited.
  const quota = IMAGE_GEN_QUOTA_ENABLED
    ? await checkImageQuota(uid, email)
    : { allowed: true, plan: "max" as const, limit: -1, used: 0, remaining: -1 };
  if (IMAGE_GEN_QUOTA_ENABLED && !quota.allowed) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        message: quota.reason || "Quota atteint.",
        quota: {
          plan: quota.plan,
          limit: quota.limit,
          used: quota.used,
          remaining: quota.remaining,
        },
      },
      { status: 403 }
    );
  }

  // ── AI → DSL ─────────────────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Service indisponible", message: "OpenAI non configuré." },
      { status: 503 }
    );
  }
  // 20s ceiling on every OpenAI call — without this the SDK retries with
  // exponential backoff for up to 10 minutes when the API stalls, and the
  // user sees a "loading…" placeholder forever. 20s is plenty for a 600-token
  // JSON completion (median ≈ 1-2s, p95 ≈ 4-6s).
  const openai = new OpenAI({ apiKey, timeout: 20_000, maxRetries: 1 });

  const systemPrompt = buildSystemPrompt(language);
  const userPrompt = buildUserPrompt(brief, postContext);

  // Clamp the requested variant count by the caller's plan. Free is already
  // blocked by the quota check above so this branch only runs for Pro/Max.
  const planKey = (quota.plan ?? "pro") as keyof typeof MAX_VARIANTS_PER_PLAN;
  const planCap = MAX_VARIANTS_PER_PLAN[planKey] ?? 1;
  const variantCount = Math.max(1, Math.min(requestedVariantCount, planCap));

  // ── Concept Director (multi-variant only) ────────────────────────────────
  // The previous diversification was cosmetic — same brief, different accent.
  // Users got 3 cards saying nearly the same thing in different colors. This
  // step makes the variants meaningfully different: one extra ~400ms call to
  // gpt-4o-mini brainstorms N distinct CREATIVE ANGLES (a storytelling hook,
  // a punchy stat, a contrarian take, etc.) for the same underlying topic.
  // Each angle is then fed as its own brief to the per-variant DSL pass, so
  // every card gets a different headline AND a different composition.
  //
  // Skipped for variantCount === 1: a single visual doesn't need
  // diversification, and the brainstorm call would just add latency.
  interface VariantAngle {
    focus: string;     // 2-6 word headline-ish angle the visual will lead with
    direction: string; // 1 sentence brief — what message this card must carry
    accent: AccentKey; // suggested palette so colors also differ across cards
    template: TemplateId; // assigned template so layouts also differ
  }
  const ROTATING_ACCENTS: AccentKey[] = [...ACCENT_KEYS];

  // ── Anti-repetition bias from per-user history ───────────────────────────
  // Best-effort read: bias to push away from recently-used (template, accent)
  // combos. Falls back to empty bias on any read error so a Firestore hiccup
  // never blocks a generation. The bias is SOFT — it's injected into the
  // brainstorm prompt and the per-variant directive, the model is free to
  // overrule when the brief truly demands a specific template (e.g., a stat-
  // heavy brief should still get kpi-card even if it's "recent").
  const history = await readRecentHistory(uid).catch(() => [] as ImageGenHistoryEntry[]);
  const bias = computeDiversityBias(history);
  // Anti-repetition is scoped to TEXT cards only. Photo templates (photo-hero
  // is the default) are EXEMPT — their variety comes from the photo + headline,
  // not the layout, so penalising "you used photo-hero recently" would just
  // push the system away from the message-over-photo default we want.
  const overTextTemplates: TemplateId[] = bias.recentTemplates
    .filter((t) => !isPhotoTemplate(t))
    .slice(0, 2);
  // Fresh text cards = text cards NOT recently over-used. Used to vary which
  // text card gets picked when one is genuinely warranted.
  const freshTextTemplates: TemplateId[] = TEMPLATE_IDS.filter(
    (t) => !isPhotoTemplate(t) && !overTextTemplates.includes(t),
  );
  const freshAccents: AccentKey[] = ACCENT_KEYS.filter(
    (a) => !bias.recentAccents.slice(0, 2).includes(a),
  );

  /**
   * Build the steering directive used both by the brainstorm and the
   * single-variant fallback. Reinforces photo-first and lists over-used text
   * cards so the model knows which minority layouts to push AGAINST.
   */
  const buildAvoidDirective = (isFr: boolean): string => {
    const overAccents = bias.recentAccents.slice(0, 2);
    if (overTextTemplates.length === 0 && overAccents.length === 0) return "";
    const tFr = overTextTemplates.length
      ? `\n  • Cartes texte sur-utilisées récemment : ${overTextTemplates.join(", ")} → privilégie photo-hero (titre fort sur une vraie photo), sinon ${freshTextTemplates.join(" ou ") || "une autre carte"}.`
      : "";
    const tEn = overTextTemplates.length
      ? `\n  • Recently over-used text cards: ${overTextTemplates.join(", ")} → prefer photo-hero (a strong headline over a real photo), otherwise ${freshTextTemplates.join(" or ") || "another card"}.`
      : "";
    return isFr
      ? `\nAnti-répétition (historique récent de cet utilisateur) :${tFr}\n  • Accents sur-utilisés : ${overAccents.join(", ") || "aucun"} → préfère ${freshAccents.join(" ou ") || "n'importe lequel"}.\nN'ignore cette consigne que si le brief impose clairement le template écarté.`
      : `\nAnti-repetition (this user's recent history):${tEn}\n  • Over-used accents: ${overAccents.join(", ") || "none"} → prefer ${freshAccents.join(" or ") || "any"}.\nOnly override if the brief clearly demands the avoided template.`;
  };

  const brainstormConcepts = async (n: number): Promise<VariantAngle[] | null> => {
    if (n <= 1) return null;
    const isFr = language === "fr";
    const avoidBlock = buildAvoidDirective(isFr);
    const directorSystem = isFr
      ? `Tu es directrice artistique pour Posty (visuels marketing LinkedIn carrés). Pour un même sujet, tu inventes ${n} angles créatifs RADICALEMENT différents — pas ${n} reformulations du même message. Chaque angle attaque le sujet sous une lentille distincte (émotion, scène, donnée chiffrée, punchline, métaphore, témoignage, etc.).

LE MESSAGE D'ABORD : un bon visuel LinkedIn fait comprendre l'idée clé en 2 secondes, même en miniature mobile. Le TEXTE est l'élément principal, l'image n'est qu'un support. Chaque variante doit porter une ACCROCHE forte et lisible. Évite l'effet "fait par une IA / Canva" : le défaut est une VRAIE PHOTO en arrière-plan avec un titre incrusté au premier plan (photo-hero).

Templates disponibles :
  • photo-hero — DÉFAUT. Vraie photo en arrière-plan + TITRE court et percutant au premier plan. À utiliser pour la majorité des angles. Fais varier la SCÈNE photographiée ET l'accroche d'une variante à l'autre.
  • kpi-card — texte seul. Si l'angle EST une donnée chiffrée (le nombre est le message).
  • quote-card — texte seul. Si l'angle EST une citation / punchline verbatim.
  • announcement-card — texte seul. Pour une annonce formelle.
  • photo-clean — vraie photo quasi sans texte. RARE : seulement pour un angle volontairement atmosphérique, sans message à asséner.

Réponds UNIQUEMENT par cet objet JSON :
{
  "angles": [
    {
      "focus": "<2 à 6 mots — l'accroche-titre qui sera INCRUSTÉE sur le visuel, courte et percutante>",
      "direction": "<1 phrase — quel angle / quelle scène / quel insight cette variante doit porter>",
      "accent": "<une valeur parmi: ${ACCENT_KEYS.join(", ")}>",
      "template": "<une valeur parmi: ${TEMPLATE_IDS.join(", ")}>"
    }
  ]
}

Règles :
- ${n} entrées exactement, ordre = ordre d'affichage chez l'utilisateur.
- Aucun "focus" en doublon, aucun "direction" en paraphrase.
- MAJORITÉ de photo-hero. Tu PEUX réutiliser photo-hero entre variantes — la photo ET l'accroche diffèrent, donc le visuel diffère.
- Utilise une carte texte (kpi/quote/announcement) quand l'angle est intrinsèquement un chiffre / une citation / une annonce.
- N'utilise photo-clean (sans texte) que très rarement, au plus UNE fois sur les ${n}.
- Accents différents entre variantes quand c'est possible.
- Sujet reste le même, lentille change.${avoidBlock}`
      : `You are art director for Posty (square LinkedIn marketing visuals). For one topic you invent ${n} RADICALLY different creative angles — not ${n} rewordings of the same message. Each angle attacks the topic through a distinct lens (emotion, scene, data, punchline, metaphor, testimonial, etc.).

MESSAGE FIRST: a good LinkedIn visual makes the key idea understandable in 2 seconds, even as a mobile thumbnail. TEXT is the primary element, the image is only support. Every variant must carry a strong, legible HOOK. Avoid the "AI-made / Canva" look: the default is a REAL PHOTO in the background with a headline burned over it in the foreground (photo-hero).

Available templates:
  • photo-hero — DEFAULT. Real photo in the background + a short, punchy HEADLINE in the foreground. Use for most angles. Vary the photographed SCENE AND the hook across variants.
  • kpi-card — text only. If the angle IS a number (the number is the message).
  • quote-card — text only. If the angle IS a verbatim quote / one-liner.
  • announcement-card — text only. For a formal announcement.
  • photo-clean — real photo with almost no text. RARE: only for a deliberately atmospheric angle with no message to assert.

Reply with ONLY this JSON:
{
  "angles": [
    {
      "focus": "<2 to 6 words — the headline hook that will be BURNED on the visual, short and punchy>",
      "direction": "<1 sentence — which angle / scene / insight this variant must carry>",
      "accent": "<one of: ${ACCENT_KEYS.join(", ")}>",
      "template": "<one of: ${TEMPLATE_IDS.join(", ")}>"
    }
  ]
}

Rules:
- Exactly ${n} entries, order = display order to the user.
- No duplicate "focus", no paraphrased "direction".
- MAJORITY of photo-hero. You MAY reuse photo-hero across variants — the photo AND the hook differ, so the visual differs.
- Use a text card (kpi/quote/announcement) when the angle is intrinsically a number / quote / announcement.
- Use photo-clean (no text) only very rarely, at most ONE of the ${n}.
- Different accents across variants when possible.
- Topic stays the same, lens changes.${avoidBlock}`;

    const directorUser = isFr
      ? `Brief: ${brief.trim()}${postContext ? `\n\nPost associé:\n"""${postContext.trim().slice(0, 1200)}"""` : ""}`
      : `Brief: ${brief.trim()}${postContext ? `\n\nAssociated post:\n"""${postContext.trim().slice(0, 1200)}"""` : ""}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.85, // higher temp on the director — we WANT spread
        max_tokens: 500,
        messages: [
          { role: "system", content: directorSystem },
          { role: "user", content: directorUser },
        ],
      });
      const directorUsage = readUsageFromResponse(completion);
      void trackAIUsage({
        userId: uid,
        route: "image.generate",
        model: "gpt-4o-mini",
        inputTokens: directorUsage.inputTokens,
        outputTokens: directorUsage.outputTokens,
        cachedInputTokens: directorUsage.cachedInputTokens,
        metadata: { step: "director", variants: n },
      });
      const raw = completion.choices[0]?.message?.content;
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { angles?: Array<Partial<VariantAngle>> };
      if (!Array.isArray(parsed.angles)) return null;

      // Sanitise: keep only entries with required fields, pad missing accents
      // and templates with rotated defaults, clip to n. Better to ship fewer
      // good angles than wait on a retry — the per-variant pass will absorb
      // any gap. The template-rotation fallback below also enforces "no
      // duplicate templates across variants" client-side: if the model
      // returned two identical templates we override one with the next
      // unused template (cycling through TEMPLATE_IDS biased by freshness).
      // Message-first rotation: photo-hero leads, then fresh text cards, then
      // the rest. Uniqueness is enforced for TEXT cards only — photo templates
      // may repeat across variants (the photo + headline differ, so does the
      // visual), which is exactly the message-first behaviour we want.
      // photo-clean sits last so it's never auto-injected as a fallback fill
      // (photo-hero, always usable, is found first by `canUse`).
      const templateRotation: TemplateId[] = [
        ...PHOTO_TEMPLATES,
        ...freshTextTemplates,
        ...TEMPLATE_IDS.filter((t) => !isPhotoTemplate(t) && !freshTextTemplates.includes(t)),
      ];
      const usedTextTemplates = new Set<TemplateId>();
      const canUse = (t: TemplateId): boolean => isPhotoTemplate(t) || !usedTextTemplates.has(t);
      const cleaned: VariantAngle[] = parsed.angles
        .slice(0, n)
        .filter((a): a is Partial<VariantAngle> => !!a && typeof a.focus === "string" && typeof a.direction === "string")
        .map((a, i) => {
          // Default accent: prefer model pick, else rotate over fresh accents.
          const accent: AccentKey = (ACCENT_KEYS as readonly string[]).includes(a.accent ?? "")
            ? (a.accent as AccentKey)
            : ROTATING_ACCENTS[i % ROTATING_ACCENTS.length];
          // Pick template: model pick if valid AND usable (photo always usable;
          // a text card only if not already used in this batch), else the next
          // usable template from the photo-first rotation.
          const modelTemplate = (TEMPLATE_IDS as readonly string[]).includes(a.template ?? "")
            ? (a.template as TemplateId)
            : null;
          let template: TemplateId;
          if (modelTemplate && canUse(modelTemplate)) {
            template = modelTemplate;
          } else {
            template = templateRotation.find(canUse) ?? PHOTO_TEMPLATES[0];
          }
          if (!isPhotoTemplate(template)) usedTextTemplates.add(template);
          return {
            focus: a.focus!.slice(0, 80),
            direction: a.direction!.slice(0, 280),
            accent,
            template,
          };
        });

      return cleaned.length >= 2 ? cleaned : null;
    } catch (err) {
      // Brainstorm failure must NOT block the run — we degrade gracefully to
      // the simple accent-rotation diversification we had before.
      console.warn("[image/generate] concept brainstorm failed, falling back to accent rotation:", err);
      return null;
    }
  };

  // Build the per-variant hint. When the brainstorm succeeded we inject the
  // angle + direction so the DSL pass actually changes the message; when it
  // failed we degrade to the previous accent-only rotation.
  const buildVariantBrief = (
    index: number,
    concepts: VariantAngle[] | null
  ): string => {
    const isFr = language === "fr";
    if (concepts && concepts[index]) {
      const a = concepts[index];
      // Template is now a HARD directive: the model must set
      // dsl.template === a.template. This is what actually drives layout
      // diversity across variants — otherwise the AI defaults to whichever
      // template matches the brief best for all variants.
      return isFr
        ? `${userPrompt}\n\nVariante ${index + 1}/${variantCount} — directive artistique :\n  • Angle / accroche cible : ${a.focus}\n  • Message à porter : ${a.direction}\n  • Palette suggérée : ${a.accent}\n  • TEMPLATE OBLIGATOIRE : "${a.template}" — tu DOIS retourner un DSL dont le champ "template" vaut exactement "${a.template}". Reformule le contenu pour qu'il colle naturellement à ce template ; ne change PAS le template.\nLe sujet reste identique aux autres variantes, c'est la LENTILLE et la COMPOSITION qui changent. Évite toute formulation déjà vue dans une autre variante.`
        : `${userPrompt}\n\nVariant ${index + 1}/${variantCount} — art direction:\n  • Target angle / headline: ${a.focus}\n  • Message to carry: ${a.direction}\n  • Suggested palette: ${a.accent}\n  • REQUIRED TEMPLATE: "${a.template}" — you MUST return a DSL whose "template" field is exactly "${a.template}". Reshape the content to fit this template naturally; do NOT change the template.\nTopic stays identical across variants, the LENS and COMPOSITION change. Avoid any wording reused from another variant.`;
    }
    // Fallback: accent rotation (used if brainstorm failed). Message-first —
    // default to photo-hero (a bold headline over a real photo) so even the
    // degraded path carries the message instead of a wordless photo.
    const accent = ROTATING_ACCENTS[index % ROTATING_ACCENTS.length];
    return isFr
      ? `${userPrompt}\n\nVariante ${index + 1}/${variantCount} — template "photo-hero" : une VRAIE PHOTO en arrière-plan (sujet concret distinct des autres variantes) + un TITRE court et percutant qui porte le message, accent "${accent}". Utilise une carte texte (kpi/quote/announcement) uniquement si le contenu est intrinsèquement un chiffre, une citation ou une annonce.`
      : `${userPrompt}\n\nVariant ${index + 1}/${variantCount} — template "photo-hero": a REAL PHOTO in the background (concrete subject distinct from the other variants) + a short, punchy HEADLINE carrying the message, accent "${accent}". Use a text card (kpi/quote/announcement) only if the content is intrinsically a number, a quote, or an announcement.`;
  };

  /** Run one DSL generation round (with one repair retry on Zod failure). */
  const generateOneDsl = async (
    variantIndex: number,
    concepts: VariantAngle[] | null
  ): Promise<
    | { ok: true; dsl: ImageDSL }
    | { ok: false; error: "ai_error" | "ai_empty" | "ai_invalid_json" | "ai_invalid_dsl"; details?: unknown }
  > => {
    // Single-variant calls still benefit from the anti-repetition bias —
    // even though they don't have a brainstorm to inject a hard template
    // directive, we append the same "avoid recent buckets" block so the
    // model knows what NOT to pick by default.
    const singleVariantPrompt =
      variantCount > 1
        ? null
        : `${userPrompt}${buildAvoidDirective(language === "fr")}`;
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: variantCount > 1 ? buildVariantBrief(variantIndex, concepts) : singleVariantPrompt!,
      },
    ];

    let lastErrors: Record<string, string[] | undefined> | null = null;
    let lastRaw: string | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      let raw: string | null = null;
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          // Slight temperature spread across variants — variant 0 stays at 0.7
          // (predictable best-of), variants 1+ creep up toward 0.95 for spread.
          temperature: 0.7 + Math.min(variantIndex, 2) * 0.1,
          max_tokens: 600,
          messages,
        });
        const dslUsage = readUsageFromResponse(completion);
        void trackAIUsage({
          userId: uid,
          route: "image.generate",
          model: "gpt-4o-mini",
          inputTokens: dslUsage.inputTokens,
          outputTokens: dslUsage.outputTokens,
          cachedInputTokens: dslUsage.cachedInputTokens,
          metadata: { step: "dsl", variantIndex, attempt },
        });
        raw = completion.choices[0]?.message?.content ?? null;
      } catch (err) {
        console.error("[image/generate] OpenAI error (variant", variantIndex, ")", err);
        return { ok: false, error: "ai_error" };
      }
      if (!raw) return { ok: false, error: "ai_empty" };
      lastRaw = raw;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { ok: false, error: "ai_invalid_json" };
      }

      const check = ImageDSLSchema.safeParse(parsed);
      if (check.success) {
        return { ok: true, dsl: check.data };
      }

      lastErrors = check.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      console.warn(
        "[image/generate] DSL validation failed (variant",
        variantIndex,
        ", attempt",
        attempt + 1,
        ")",
        lastErrors
      );

      if (attempt === 0) {
        messages.push({ role: "assistant", content: raw });
        messages.push({ role: "user", content: buildRetryPrompt(raw, lastErrors, language) });
      }
    }

    return {
      ok: false,
      error: "ai_invalid_dsl",
      details: { fieldErrors: lastErrors, raw: lastRaw?.slice(0, 500) },
    };
  };

  /** One end-to-end variant: DSL → render → upload. */
  const runOneVariant = async (
    variantIndex: number,
    concepts: VariantAngle[] | null
  ): Promise<
    | {
        ok: true;
        url: string;
        imageId: string;
        dsl: ImageDSL;
        attribution: Awaited<ReturnType<typeof renderDSL>>["attribution"];
      }
    | { ok: false; error: string; details?: unknown }
  > => {
    const dslResult = await generateOneDsl(variantIndex, concepts);
    if (!dslResult.ok) {
      return { ok: false, error: dslResult.error, details: dslResult.details };
    }
    const dsl = dslResult.dsl;

    let png: Buffer;
    let attribution: Awaited<ReturnType<typeof renderDSL>>["attribution"];
    try {
      const result = await renderDSL(dsl);
      png = result.png;
      attribution = result.attribution;
    } catch (err) {
      console.error("[image/generate] Satori/resvg render failed (variant", variantIndex, ")", err);
      return { ok: false, error: "render_failed" };
    }

    let uploaded;
    try {
      uploaded = await uploadGeneratedImage(uid, png);
    } catch (err) {
      console.error("[image/generate] Storage upload failed (variant", variantIndex, ")", err);
      return { ok: false, error: "upload_failed" };
    }

    return { ok: true, url: uploaded.url, imageId: uploaded.imageId, dsl, attribution };
  };

  // Brainstorm the N creative angles BEFORE fanning out the renders. This
  // is the one extra serial step (≈300-500ms) that buys us truly different
  // variants instead of N near-duplicates. Null on failure → graceful
  // degradation to the legacy accent-only rotation inside buildVariantBrief.
  const concepts = await brainstormConcepts(variantCount);

  // Fan out — `Promise.all` runs the N pipelines in parallel. Total wall
  // time stays close to single-variant because the bottleneck is OpenAI
  // latency, not CPU/render. If one variant fails, we still return any
  // successful ones (graceful degradation rather than all-or-nothing).
  const results = await Promise.all(
    Array.from({ length: variantCount }, (_, i) => runOneVariant(i, concepts))
  );

  const succeeded = results.filter(
    (r): r is Extract<typeof r, { ok: true }> => r.ok
  );
  const firstFailure = results.find((r): r is Extract<typeof r, { ok: false }> => !r.ok);

  if (succeeded.length === 0) {
    // All variants failed — surface the first error verbatim so the client
    // shows a meaningful message instead of a generic 500.
    const code = firstFailure?.error ?? "ai_error";
    const status =
      code === "ai_error" || code === "ai_empty" || code === "ai_invalid_json" || code === "ai_invalid_dsl"
        ? 502
        : 500;
    const message =
      code === "ai_invalid_dsl"
        ? "L'IA a produit un schéma invalide. Réessayez."
        : code === "render_failed"
          ? "Le rendu visuel a échoué."
          : code === "upload_failed"
            ? "Sauvegarde impossible."
            : "L'IA n'a pas pu produire le visuel. Réessayez.";
    return NextResponse.json(
      { error: code, message, details: firstFailure?.details },
      { status }
    );
  }

  // ── Consume quota once per call (not per variant) ────────────────────────
  // The per-call charge keeps the user contract simple: "you spent one image
  // credit, you got 1-3 variants of it." The per-plan cap above prevents
  // abuse of this generosity.
  if (IMAGE_GEN_QUOTA_ENABLED) {
    try {
      await incrementImageQuota(uid);
    } catch (err) {
      console.error("[image/generate] Quota increment failed (image still served)", err);
    }
  }

  const quotaPayload = IMAGE_GEN_QUOTA_ENABLED
    ? {
        plan: quota.plan,
        limit: quota.limit,
        used: quota.used + 1,
        remaining: Math.max(0, quota.remaining - 1),
      }
    : { plan: quota.plan, limit: -1, used: 0, remaining: -1 };

  const images = succeeded.map((r) => ({
    url: r.url,
    imageId: r.imageId,
    dsl: r.dsl,
    attribution: r.attribution,
  }));

  // Persist (template, accent) per generated variant so the NEXT call's
  // diversity bias has something to push away from. Fire-and-forget —
  // we never block the response on this write.
  const now = Date.now();
  const historyEntries: ImageGenHistoryEntry[] = succeeded.map((r, i) => ({
    template: r.dsl.template,
    accent: r.dsl.accent,
    // Tiny offset preserves variant ordering when sorted by ts desc.
    ts: now - i,
  }));
  if (historyEntries.length > 0) {
    void appendToHistory(uid, historyEntries).catch(() => {});
  }

  // Back-compat: callers that pre-date the multi-variant change still read
  // `url`/`imageId`/`dsl`/`attribution` at the top level. We mirror the
  // first variant there so they keep working unchanged.
  const primary = images[0];

  return NextResponse.json({
    images,
    variantCount: images.length,
    requestedVariantCount: variantCount,
    // Legacy fields (variant 0)
    url: primary.url,
    imageId: primary.imageId,
    dsl: primary.dsl,
    attribution: primary.attribution,
    quota: quotaPayload,
  });
}
