import { NextRequest } from "next/server";
import OpenAI from "openai";
import { isValidApiKeyFormat } from "@/lib/openai";
import { verifyAuth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/api/rate-limit";

/**
 * POST /api/openai/validate
 * Validates an OpenAI API key against the OpenAI API.
 *
 * SECURITY: This route makes a live OpenAI request with whatever key is
 * provided, so without auth + rate-limit it can be abused as a free
 * key-validation oracle (enumerating leaked/guessed keys). We require
 * a logged-in user and cap to 10 attempts per hour per uid.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const rateLimited = enforceRateLimit(
      request,
      { namespace: "openai-validate", limit: 10, windowMs: 60 * 60 * 1000 },
      auth.uid,
    );
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== "string") {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "API key is required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Basic format validation
    if (!isValidApiKeyFormat(apiKey)) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Invalid API key format. Key should start with 'sk-'",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Test the key by listing models
    const openai = new OpenAI({ apiKey });

    try {
      const models = await openai.models.list();
      const gptModels = models.data
        .filter((m) => m.id.includes("gpt"))
        .map((m) => m.id)
        .slice(0, 10);

      return new Response(
        JSON.stringify({
          valid: true,
          models: gptModels,
          message: "API key is valid",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (openaiError) {
      const error = openaiError as Error & { status?: number };

      if (error.status === 401) {
        return new Response(
          JSON.stringify({
            valid: false,
            error: "Invalid API key. Please check your key and try again.",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (error.status === 429) {
        return new Response(
          JSON.stringify({
            valid: false,
            error: "Rate limited. Please wait a moment and try again.",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          valid: false,
          error: "Failed to validate key: " + error.message,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Validate API key error:", error);
    return new Response(
      JSON.stringify({
        valid: false,
        error: "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
