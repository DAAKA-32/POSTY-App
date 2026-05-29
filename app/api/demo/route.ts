import { NextRequest } from "next/server";
import {
  createOpenAIService,
  isOpenAIConfigured,
  OpenAIModel,
} from "@/lib/openai";
import { enforceRateLimit } from "@/lib/api/rate-limit";

/**
 * POST /api/demo
 * Public landing-page demo endpoint. No auth required by design, so the
 * defense-in-depth is: per-IP server-side rate limit (5/hour) + hard input
 * size cap + OpenAI max_tokens=500 to bound cost per call.
 */

const DEMO_MAX_INPUT_CHARS = 1000;

const DEMO_SYSTEM_PROMPT = `Tu es Posty, un assistant IA expert en création de contenu LinkedIn professionnel et engageant.

Pour cette démonstration, tu vas aider l'utilisateur à créer un court post LinkedIn.

RÈGLES:
- Réponds en français par défaut
- Crée un post concis (max 200 mots) mais impactant
- Utilise des emojis avec parcimonie (2-3 max)
- Structure le post avec des paragraphes courts
- Inclus un appel à l'action ou une question à la fin
- Sois professionnel mais authentique

C'est une démo, donc sois impressionnant pour montrer la valeur de Posty!`;

export async function POST(request: NextRequest) {
  try {
    // Per-IP rate limit — bound OpenAI cost from scripted abuse.
    // Cap is intentionally aggressive since this is an anonymous demo.
    const rateLimited = enforceRateLimit(request, {
      namespace: "demo",
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { message } = body;

    // Validate message
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (message.length > DEMO_MAX_INPUT_CHARS) {
      return new Response(
        JSON.stringify({ error: "Message too long" }),
        { status: 413, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check for API key
    if (!isOpenAIConfigured()) {
      return new Response(
        JSON.stringify({
          error: "Demo not available",
          message: "La démo n'est pas disponible pour le moment. Inscrivez-vous pour tester Posty!",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create OpenAI service with gpt-4o-mini for demo (cheap AND better than 3.5)
    const openaiService = createOpenAIService({ model: "gpt-4o-mini" as OpenAIModel });

    if (!openaiService) {
      return new Response(
        JSON.stringify({ error: "Failed to initialize service" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (event: string, data: object) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          sendEvent("start", {});

          // Stream the response
          const streamResponse = await openaiService["client"].chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: DEMO_SYSTEM_PROMPT },
              { role: "user", content: message },
            ],
            temperature: 0.7,
            max_tokens: 500,
            stream: true,
          });

          let fullContent = "";

          for await (const chunk of streamResponse) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullContent += content;
              sendEvent("chunk", { content });
            }
          }

          sendEvent("done", { fullContent });
        } catch (error) {
          console.error("Demo chat error:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Demo failed";
          sendEvent("error", { message: errorMessage });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Demo API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
