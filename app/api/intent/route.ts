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
import { classifyContentIntent, fastClassifyIntent } from "@/lib/ai/content-intent";

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
  const fast = fastClassifyIntent(prompt);
  if (fast) {
    return NextResponse.json({ ...fast, source: "fast" });
  }

  // Slow path: actual LLM classification.
  try {
    const intent = await classifyContentIntent(prompt, hasPriorConversation);
    return NextResponse.json({ ...intent, source: "llm" });
  } catch (err) {
    console.error("[intent] classifier error:", err);
    // Default to "post" so the user still gets SOMETHING useful — never a
    // hard 5xx for a classification miss. The post pipeline is the safest
    // fallback because that's what Posty was built around.
    return NextResponse.json({
      intent: "post" as const,
      confidence: 0.4,
      postBrief: prompt,
      source: "fallback",
    });
  }
}
