/**
 * THE LinkedIn post generation engine — the ONE place a post is written.
 *
 * Both surfaces call this and nothing else:
 *   - the chat            (app/api/generate/route.ts)
 *   - the Strategist      (app/api/strategist/materialize/route.ts)
 *
 * The Strategist is ONLY an orchestration layer (it plans WHAT to publish and
 * WHEN); it must never own its own generation logic. Historically it did — it
 * ran gpt-4o-mini, skipped the quality gate and skipped the language
 * enforcement — which is exactly why its posts felt flatter (fewer emojis,
 * weaker hooks, less rhythm) than the same topic typed into the chat.
 *
 * Everything that decides post QUALITY lives here and here only:
 *   - the canonical system prompt      (buildOptimizedPrompt — single call site)
 *   - the language enforcement
 *   - the model                        (PRIMARY_MODEL = gpt-4o for both)
 *   - the temperature                  (getGenerationTemperature)
 *   - the hashtag normalization
 *   - the quality gate                 (lintPost + one gpt-4o-mini repair)
 *
 * Callers may only supply INPUT (the user turn + extra context blocks) and
 * transport concerns (streaming, tracking route). Any future improvement made
 * here automatically benefits the chat AND the Strategist.
 */

import type OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
} from "openai/resources/chat/completions";
import {
  buildOptimizedPrompt,
  getGenerationTemperature,
  estimateTokens,
  type ProfileFields,
  type PlanTier,
  type PostType,
} from "@/lib/services/prompt-builder";
import { lintPost, buildRepairMessages } from "@/lib/services/post-quality";
import { normalizeHashtagsInText } from "@/lib/hashtags/normalize";
import { PRIMARY_MODEL, MINI_MODEL } from "@/lib/openai";
import {
  trackAIUsage,
  readUsageFromResponse,
  readUsageFromChunk,
  emptyUsage,
} from "@/lib/ai-cost/tracker";

export interface GenerateLinkedInPostOptions {
  client: OpenAI;
  type: PostType;
  language: "fr" | "en";
  profile?: ProfileFields | null;
  plan: PlanTier;
  userId: string;
  /** Cost-tracking route label, e.g. "generate" | "strategist.materialize". */
  route: string;
  /** The user turn: the raw prompt (chat) or the approved brief (Strategist). */
  userMessage: string;
  /** Extra system blocks appended AFTER the canonical prompt — memory, realtime
   *  facts, follow-up rules, file/URL context, Strategist brief-mode… Callers
   *  may add CONTEXT, never re-define the writing rules. */
  systemBlocks?: Array<string | null | undefined>;
  /** Vision input (chat only). Forces gpt-4o. */
  imagePart?: { mimeType: string; base64: string } | null;
  /** Prior turns (chat follow-ups). Last 6 are kept. */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens: number;
  /** Escape hatch only. Defaults to PRIMARY_MODEL so both surfaces match. */
  model?: string;
  /** Stream tokens out. When omitted, one non-streaming call is made. */
  onChunk?: (chunk: string) => void;
  onPhase?: (phase: string, message: string) => void;
  /** Follow-up edits are surgical — re-polishing them would undo the edit. */
  skipQualityGate?: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface GeneratedPost {
  content: string;
  model: string;
}

export async function generateLinkedInPost(
  opts: GenerateLinkedInPostOptions,
): Promise<GeneratedPost> {
  const {
    client, type, language, profile, plan, userId, route, userMessage,
    systemBlocks = [], imagePart, history, maxTokens,
    onChunk, onPhase, skipQualityGate = false, metadata = {},
  } = opts;

  // ── 1. The canonical system prompt (SINGLE call site of buildOptimizedPrompt)
  let systemPrompt = buildOptimizedPrompt(type, language, profile ?? undefined, plan);
  systemPrompt +=
    language === "fr"
      ? "\n\nLANGUE: Réponds STRICTEMENT en français. Tout le contenu généré doit être en français."
      : "\n\nLANGUAGE: Respond STRICTLY in English. All generated content must be in English.";
  for (const block of systemBlocks) {
    if (block) systemPrompt += block;
  }

  // ── 2. Messages
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];
  if (history?.length) {
    for (const m of history.slice(-6)) {
      messages.push({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      });
    }
  }
  if (imagePart) {
    const parts: ChatCompletionContentPart[] = [
      { type: "text", text: userMessage },
      {
        type: "image_url",
        image_url: {
          url: `data:${imagePart.mimeType};base64,${imagePart.base64}`,
          detail: "auto",
        },
      },
    ];
    messages.push({ role: "user", content: parts });
  } else {
    messages.push({ role: "user", content: userMessage });
  }

  // ── 3. Model + params — IDENTICAL for the chat and the Strategist
  const model = opts.model || (imagePart ? "gpt-4o" : PRIMARY_MODEL);
  const temperature = getGenerationTemperature(type, plan);
  const baseMeta = { type, plan: plan ?? "unknown", language, ...metadata };

  let raw = "";
  if (onChunk) {
    const stream = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    });
    let usage = emptyUsage();
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        raw += delta;
        onChunk(delta);
      }
      const captured = readUsageFromChunk(chunk);
      if (captured) usage = captured;
    }
    void trackAIUsage({
      userId, route, model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      metadata: baseMeta,
    });
  } else {
    const completion = await client.chat.completions.create({
      model, messages, temperature, max_tokens: maxTokens,
    });
    const usage = readUsageFromResponse(completion);
    void trackAIUsage({
      userId, route, model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      metadata: baseMeta,
    });
    raw = completion.choices[0]?.message?.content?.trim() ?? "";
  }

  let content = normalizeHashtagsInText(raw);
  if (!content) return { content: "", model };

  // ── 4. Quality gate — same lint + single mini repair for BOTH surfaces.
  // Only a HARD issue triggers a repair; a truncated repair is discarded.
  if (!skipQualityGate) {
    try {
      const report = lintPost(content, language);
      if (report.needsRepair) {
        onPhase?.("polishing", language === "fr" ? "Relecture finale…" : "Final polish…");
        const { system, user } = buildRepairMessages(content, report.issues, language);
        const repair = await client.chat.completions.create({
          model: MINI_MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.4,
          // Independent budget: the repair re-emits the WHOLE post and a
          // 'too-short' issue may ask it to EXPAND.
          max_tokens: Math.min(2048, Math.max(maxTokens, estimateTokens(content) * 2 + 256)),
        });
        const usage = readUsageFromResponse(repair);
        void trackAIUsage({
          userId,
          route: `${route}.quality-repair`,
          model: MINI_MODEL,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cachedInputTokens: usage.cachedInputTokens,
          metadata: { type, issues: report.issues.map((i) => i.code).join(",") },
        });
        const choice = repair.choices[0];
        const repaired = choice?.message?.content?.trim();
        if (repaired && repaired.length > 50 && choice?.finish_reason === "stop") {
          content = normalizeHashtagsInText(repaired);
        }
      }
    } catch (err) {
      // Non-blocking: a gate failure must never break generation.
      console.error("[post-generator] quality gate failed (non-blocking):", err);
    }
  }

  return { content, model };
}
