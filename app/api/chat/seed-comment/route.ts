/**
 * POST /api/chat/seed-comment
 *
 * Generates a *seed comment* — the post-author's own first reply, designed to
 * be dropped 2–7 minutes after publishing to boost early engagement (LinkedIn
 * algorithm weights early author-comments very heavily).
 *
 * Request body:
 *   - postContent: string         (required) The full text of the post
 *   - language?: "fr" | "en"      (default: "fr")
 *   - userApiKey?: string         (optional, BYOK)
 *   - model?: OpenAIModel         (default: "gpt-4o")
 *   - userProfile?: UserProfile   (optional, voice tuning)
 *
 * Response (200):
 *   { comment: string }
 *
 * Errors:
 *   400 invalid input · 401 no API key · 403 no plan
 *   429 quota exceeded · 500/503 service errors
 *
 * Quota: counts as 1 generation against the user's hourly + daily quota
 *        (same bucket as post generation — seed comments are cheap but
 *        we keep a single accounting model for simplicity).
 */

import { NextRequest } from "next/server";
import {
  createOpenAIService,
  createUserOpenAIService,
  isOpenAIConfigured,
  isValidApiKeyFormat,
  OpenAIModel,
  UserProfile,
} from "@/lib/openai";
import {
  checkHourlyQuotaAdmin,
  checkUserQuotaAdmin,
  incrementUserQuotaAdmin,
} from "@/lib/db/firestore-admin";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import { PlanType } from "@/lib/config/plans";
import { verifyAuth } from "@/lib/auth";

const MAX_POST_CHARS = 4000;

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const {
      userId: bodyUserId,
      postContent,
      language = "fr",
      userApiKey,
      model = "gpt-4o",
      userProfile,
    }: {
      userId?: string;
      postContent?: string;
      language?: "fr" | "en";
      userApiKey?: string;
      model?: OpenAIModel;
      userProfile?: UserProfile;
    } = body ?? {};

    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    /* ── Validation ───────────────────────────────────────────── */
    if (!userId || typeof userId !== "string") {
      return jsonError(400, "userId is required");
    }
    if (!postContent || typeof postContent !== "string" || postContent.trim().length < 20) {
      return jsonError(400, "postContent must be a non-empty string of at least 20 characters");
    }
    if (postContent.length > MAX_POST_CHARS) {
      return jsonError(400, `postContent exceeds ${MAX_POST_CHARS} characters`);
    }

    /* ── Quota (hourly + daily) ───────────────────────────────── */
    let userPlan: PlanType | null = null;
    if (isAdminInitialized()) {
      try {
        const hourly = await checkHourlyQuotaAdmin(userId, auth.email);
        userPlan = hourly.plan as PlanType;
        if (!hourly.canGenerate) {
          return jsonError(
            429,
            language === "fr"
              ? `Quota horaire atteint. Réessayez dans ${Math.ceil(hourly.resetInSeconds / 60)} min.`
              : `Hourly quota reached. Try again in ${Math.ceil(hourly.resetInSeconds / 60)} min.`,
            "quota_exceeded",
          );
        }
        const daily = await checkUserQuotaAdmin(userId, auth.email);
        if (!daily.canGenerate) {
          return jsonError(
            429,
            language === "fr"
              ? "Quota quotidien atteint."
              : "Daily quota reached.",
            "daily_quota_exceeded",
          );
        }
      } catch (err) {
        console.error("Seed comment quota check error:", err);
        if (process.env.NODE_ENV === "production") {
          return jsonError(503, "Service temporarily unavailable", "service_unavailable");
        }
      }
    } else if (process.env.NODE_ENV === "production") {
      return jsonError(503, "Service temporarily unavailable", "service_unavailable");
    }

    if (!userPlan) {
      return jsonError(403, "Active subscription required", "no_active_plan");
    }

    /* ── OpenAI service init ─────────────────────────────────── */
    const hasUserKey = !!userApiKey && isValidApiKeyFormat(userApiKey);
    const hasGlobalKey = isOpenAIConfigured();
    if (!hasUserKey && !hasGlobalKey) {
      return jsonError(401, "No API key configured", "NO_API_KEY");
    }
    const openai = hasUserKey
      ? createUserOpenAIService(userApiKey!, { model })
      : createOpenAIService({ model });
    if (!openai) {
      return jsonError(500, "Failed to initialize OpenAI service");
    }

    /* ── Generate ─────────────────────────────────────────────── */
    const comment = await openai.generateSeedComment({
      postContent,
      language,
      userProfile,
    });

    if (!comment || comment.length < 10) {
      return jsonError(500, "AI returned an empty comment");
    }

    /* ── Quota increment (after success) ──────────────────────── */
    if (isAdminInitialized()) {
      try {
        await incrementUserQuotaAdmin(userId);
      } catch (err) {
        console.error("Seed comment quota increment error:", err);
        // Soft-fail: still return the comment.
      }
    }

    return new Response(JSON.stringify({ comment }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Seed comment API error:", err);
    return jsonError(500, "Internal server error");
  }
}

function jsonError(status: number, message: string, code?: string) {
  return new Response(JSON.stringify(code ? { error: code, message } : { error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
