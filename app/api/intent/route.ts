/**
 * POST /api/intent
 *
 * Tiny classifier endpoint. Takes a free-form prompt, returns:
 *   { intent: "post"|"image"|"both"|"conversation", postBrief?, imageBrief?, confidence }
 *
 * The client uses the result to decide which downstream pipeline to call —
 * /api/generate (post text), /api/image/generate (visual), both, or just an
 * inline conversational reply.
 *
 * Cost target: ~$0.0001 per call. The fast regex pre-pass short-circuits
 * the 80% of obvious cases without spending an LLM call.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth";
import {
  classifyContentIntent,
  fastClassifyIntent,
  type ContentIntent,
  type PostType,
} from "@/lib/ai/content-intent";

/**
 * Map a top-level intent onto a default postType. The LLM classifier doesn't
 * emit postType directly — we infer it here so /api/generate can trust the
 * value as a routing hint and skip its own classification.
 *
 *   - intent="image"        → undefined (no post pipeline involved)
 *   - intent="both"         → "PRODUCTION" (always a real post)
 *   - intent="post"         → "PRODUCTION" by default, "HYBRID" if the prompt
 *                             also has explanation triggers (best-effort regex)
 *   - intent="conversation" → "ASSISTANCE" by default, "SOCIAL" if greeting
 */
function inferPostType(intent: ContentIntent["intent"], prompt: string): PostType | undefined {
  if (intent === "image") return undefined;
  if (intent === "both") return "PRODUCTION";
  const lower = prompt.toLowerCase().trim();
  if (intent === "conversation") {
    const isGreeting = /^(coucou|salut|hello|hey|hi|yo|bonjour|bonsoir|hola|wesh)[\s!.,?]*$/i.test(lower)
      || /^(ça va|ca va|comment ça va|comment ca va|how are you|what's up|quoi de neuf|sup)[\s!?,]*$/i.test(lower)
      || /^(merci|thanks|thank you|cool|nickel|parfait|super|génial|great|ok|d'accord|ouais|yes|no|non)[\s!.,]*$/i.test(lower);
    return isGreeting ? "SOCIAL" : "ASSISTANCE";
  }
  // intent === "post"
  const EXPLAIN_TRIGGERS = /\b(explique|explique-moi|parle-moi|raconte-moi|dis-moi|d[eé]taille|r[eé]sume|c'?est quoi|qu'?est[- ]ce que|peux-tu (m')?expliquer|explain|tell me (about|what)|describe|walk me through|summarize)/i;
  return EXPLAIN_TRIGGERS.test(lower) ? "HYBRID" : "PRODUCTION";
}

export const runtime = "nodejs";
export const maxDuration = 15;

const RequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  hasPriorConversation: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { prompt, hasPriorConversation } = parsed.data;

  // Fast path: regex pre-pass on obvious cases. Save ~250ms + token cost on
  // the most common patterns ("fais une image sur X", "tu connais Y ?", etc.).
  const t0 = Date.now();
  const fast = fastClassifyIntent(prompt);
  if (fast) {
    const postType = fast.postType ?? inferPostType(fast.intent, prompt);
    console.info("[intent]", { source: "fast", intent: fast.intent, postType, elapsedMs: Date.now() - t0, promptLen: prompt.length });
    return NextResponse.json({ ...fast, postType, source: "fast" });
  }

  // Slow path: actual LLM classification.
  try {
    const intent = await classifyContentIntent(prompt, hasPriorConversation);
    const postType = inferPostType(intent.intent, prompt);
    console.info("[intent]", { source: "llm", intent: intent.intent, postType, confidence: intent.confidence, elapsedMs: Date.now() - t0, promptLen: prompt.length });
    return NextResponse.json({ ...intent, postType, source: "llm" });
  } catch (err) {
    console.error("[intent] classifier error:", { elapsedMs: Date.now() - t0, err: (err as Error)?.message });
    // Default to "post" so the user still gets SOMETHING useful — never a
    // hard 5xx for a classification miss. The post pipeline is the safest
    // fallback because that's what Posty was built around.
    return NextResponse.json({
      intent: "post" as const,
      confidence: 0.4,
      postBrief: prompt,
      postType: inferPostType("post", prompt),
      source: "fallback",
    });
  }
}
