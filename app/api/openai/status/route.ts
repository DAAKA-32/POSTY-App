import { isOpenAIConfigured, getAvailableModels } from "@/lib/openai";

/**
 * GET /api/openai/status
 * Returns OpenAI configuration status
 *
 * Response:
 * - configured: boolean - Whether global API key is configured
 * - models: Array - Available models
 * - features: object - Available features based on configuration
 */
export async function GET() {
  const configured = isOpenAIConfigured();
  const models = getAvailableModels();

  return new Response(
    JSON.stringify({
      configured,
      models,
      features: {
        postGeneration: true, // Always available (mock fallback)
        chat: configured, // Only with API key
        customApiKey: true, // Users can always add their own key
      },
      message: configured
        ? "OpenAI is fully configured"
        : "OpenAI not configured. Post generation will use mock responses. Users can add their own API key.",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
}
