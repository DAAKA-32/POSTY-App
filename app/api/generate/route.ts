import { NextRequest } from "next/server";
import { getMockResponses } from "@/lib/mock-responses";

// Streaming configuration
const CHUNK_SIZE = 3; // Characters per chunk
const CHUNK_DELAY = 20; // Milliseconds between chunks

/**
 * POST /api/generate
 * Generates LinkedIn post content with streaming support
 *
 * Request body:
 * - prompt: string - The user's prompt
 *
 * Response: Server-Sent Events stream
 * Event types:
 * - start: { type: "storytelling" | "business" } - Signals start of a response
 * - chunk: { content: string, type: "storytelling" | "business" } - Text chunk
 * - done: { type: "storytelling" | "business" } - Signals end of a response
 * - complete: {} - All responses finished
 * - error: { message: string } - Error occurred
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get mock responses (will be replaced with actual AI later)
    const responses = getMockResponses(prompt);

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Helper to send SSE events
        const sendEvent = (event: string, data: object) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          // Stream each response (storytelling then business)
          for (const response of responses) {
            // Signal start of this response
            sendEvent("start", { type: response.type, title: response.title });

            // Stream the content character by character
            const content = response.content;
            for (let i = 0; i < content.length; i += CHUNK_SIZE) {
              const chunk = content.slice(i, i + CHUNK_SIZE);
              sendEvent("chunk", { content: chunk, type: response.type });

              // Add delay between chunks for natural typing effect
              await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY));
            }

            // Signal end of this response
            sendEvent("done", { type: response.type });

            // Small pause between responses
            await new Promise((resolve) => setTimeout(resolve, 300));
          }

          // Signal all responses complete
          sendEvent("complete", {});
        } catch (error) {
          sendEvent("error", { message: "Generation failed" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error("Generate API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
