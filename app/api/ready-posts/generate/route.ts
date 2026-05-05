import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { verifyAuth } from "@/lib/auth";
import {
  getUserProfileAdmin,
  getUserMemoryAdmin,
} from "@/lib/db/firestore-admin";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import { isOpenAIConfigured } from "@/lib/openai";
import { buildReadyPostPrompt } from "@/lib/services/ready-posts-prompt";
import { getFounderOverridePlan } from "@/lib/config/plans";
import type { ReadyPostCategory } from "@/lib/data/ready-posts";

const VALID_CATEGORIES: ReadyPostCategory[] = [
  "storytelling",
  "tips",
  "controversial",
  "success",
  "lesson",
  "question",
];

const VALID_LANGUAGES = ["fr", "en"] as const;
type SupportedLanguage = (typeof VALID_LANGUAGES)[number];

/**
 * POST /api/ready-posts/generate
 *
 * Generates ONE personalized LinkedIn post for the requested category.
 * Max plan only — server-side gated. Reads the caller's profile + memory
 * from Firestore and feeds them to a Max-tier prompt assembled by
 * buildReadyPostPrompt().
 *
 * Request body: { category: ReadyPostCategory; language?: "fr" | "en" }
 * Response 200: { content: string }
 * Response 401: missing/invalid auth
 * Response 403: not on Max plan
 * Response 400: invalid category
 * Response 503: OpenAI not configured
 */
export async function POST(request: NextRequest) {
  // 1) Auth
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  const userId = auth.uid;

  // 2) Admin SDK gate
  if (!isAdminInitialized()) {
    return NextResponse.json(
      { error: "auth_unavailable", message: "Authentication service unavailable" },
      { status: 503 },
    );
  }

  // 3) Parse + validate body
  let body: { category?: unknown; language?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request", message: "Invalid JSON body" }, { status: 400 });
  }

  const category = body.category;
  if (typeof category !== "string" || !VALID_CATEGORIES.includes(category as ReadyPostCategory)) {
    return NextResponse.json(
      { error: "invalid_category", message: "Unknown category" },
      { status: 400 },
    );
  }

  const rawLanguage = typeof body.language === "string" ? body.language : "fr";
  const language: SupportedLanguage = (VALID_LANGUAGES as readonly string[]).includes(rawLanguage)
    ? (rawLanguage as SupportedLanguage)
    : "fr";

  // 4) Load profile + plan gate (Max only). We resolve the founder override
  //    against the token-verified email too, because the Firestore user doc
  //    may not always carry an `email` field (signup paths differ) and we
  //    want client/server plan resolution to stay in lockstep.
  const userRecord = await getUserProfileAdmin(userId);
  if (!userRecord) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }
  const tokenFounderPlan = getFounderOverridePlan(auth.email);
  const effectivePlan = tokenFounderPlan ?? userRecord.plan;
  if (effectivePlan !== "max") {
    return NextResponse.json(
      { error: "plan_required", message: "Max plan required" },
      { status: 403 },
    );
  }

  // 5) OpenAI configured?
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "openai_unconfigured", message: "Generation service unavailable" },
      { status: 503 },
    );
  }

  // 6) Optional contextual memory
  const memoryRecord = await getUserMemoryAdmin(userId).catch(() => null);
  const memoryItems = memoryRecord?.enabled ? memoryRecord.items : [];

  // 7) Build the prompt pair
  const profileFields = {
    displayName: userRecord.displayName,
    profileType: userRecord.profile?.profileType,
    sector: userRecord.profile?.sector,
    role: userRecord.profile?.role,
    objective: userRecord.profile?.objective,
    linkedinStyle: userRecord.profile?.linkedinStyle,
    targetAudience: userRecord.profile?.targetAudience,
    communicationTone: userRecord.profile?.communicationTone,
    publishingFrequency: userRecord.profile?.publishingFrequency,
  };

  const { systemPrompt, userPrompt, temperature } = buildReadyPostPrompt({
    category: category as ReadyPostCategory,
    profile: profileFields,
    language,
    memoryItems,
  });

  // 8) Generate (single-shot, non-streaming — modal renders the full preview at once)
  const apiKey = process.env.OPENAI_API_KEY!;
  const client = new OpenAI({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!content) {
      return NextResponse.json(
        { error: "empty_response", message: "Generation returned empty content" },
        { status: 502 },
      );
    }

    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json(
      { error: "generation_failed", message },
      { status: 502 },
    );
  }
}
