import { NextRequest } from "next/server";
import OpenAI from "openai";
import { isValidApiKeyFormat } from "@/lib/openai";

/**
 * POST /api/openai/validate
 * Validates an OpenAI API key
 *
 * Request body:
 * - apiKey: string - The API key to validate
 *
 * Response:
 * - valid: boolean - Whether the key is valid
 * - models?: string[] - Available models if key is valid
 * - error?: string - Error message if validation failed
 */
export async function POST(request: NextRequest) {
  try {
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
