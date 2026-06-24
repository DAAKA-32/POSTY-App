/**
 * POST /api/transcribe
 *
 * High-accuracy speech-to-text for the chat voice input. The browser records
 * the microphone with MediaRecorder and uploads the audio blob here; we run it
 * through OpenAI's best transcription model (gpt-4o-transcribe) and return the
 * transcript VERBATIM — no summarizing, no reformulation. The client uses this
 * authoritative transcript to replace the live Web-Speech interim text.
 *
 * Request (multipart/form-data):
 *   - audio:    Blob        (required) the recorded audio (webm/mp4/ogg/wav)
 *   - language: string      (optional) ISO-639-1 hint, e.g. "fr" — improves
 *                           accuracy and avoids spurious language switches
 *   - prompt:   string      (optional) glossary of proper nouns / domain terms
 *                           that biases spelling (names, brands, jargon)
 *
 * Response (200): { text: string, durationMs?: number }
 *
 * Errors: 400 invalid input · 401 unauthorized · 403 no plan
 *         413 audio too large · 503 service unavailable · 500 internal
 *
 * Quota: transcription is cheap and is NOT counted against the post-generation
 *        quota (a user often re-records several times). We only require an
 *        active plan so anonymous/abandoned accounts can't run up API cost —
 *        the client falls back to the live Web-Speech text on any non-200.
 */

import { NextRequest } from "next/server";
import OpenAI, { toFile } from "openai";
import { verifyAuth } from "@/lib/auth";
import { trackAIUsage } from "@/lib/ai-cost/tracker";
import { checkHourlyQuotaAdmin } from "@/lib/db/firestore-admin";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import { PlanType } from "@/lib/config/plans";

// Audio decoding + the OpenAI SDK need the Node runtime (not edge).
export const runtime = "nodejs";
// Never cache — every request carries a fresh recording.
export const dynamic = "force-dynamic";

/** OpenAI's hard limit for the transcription endpoint is 25 MB. */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
/** Anything under ~1 KB is silence / a mis-fire — not worth an API call. */
const MIN_AUDIO_BYTES = 1024;
/** Glossary prompt is a hint, not content — keep it short. */
const MAX_PROMPT_CHARS = 800;

/** Best available transcription model; env-overridable like the chat models. */
const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-transcribe";

export async function POST(request: NextRequest) {
  const t0 = Date.now();
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;
    const userId = auth.uid;

    /* ── Parse multipart body ─────────────────────────────────── */
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonError(400, "Expected multipart/form-data with an audio file");
    }

    const audio = form.get("audio");
    if (!audio || typeof audio === "string") {
      return jsonError(400, "Missing audio file");
    }
    const blob = audio as Blob;

    if (blob.size < MIN_AUDIO_BYTES) {
      // Too short to contain speech — return empty so the client keeps
      // whatever live text it already has without showing an error.
      return new Response(JSON.stringify({ text: "" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (blob.size > MAX_AUDIO_BYTES) {
      return jsonError(413, "Audio too large (max 25 MB)");
    }

    const language = sanitizeLanguage(form.get("language"));
    const glossary = sanitizePrompt(form.get("prompt"));

    /* ── Require an active plan (cheap call, no quota increment) ─ */
    let userPlan: PlanType | null = null;
    if (isAdminInitialized()) {
      try {
        const hourly = await checkHourlyQuotaAdmin(userId, auth.email);
        userPlan = hourly.plan as PlanType;
      } catch (err) {
        console.error("[transcribe] plan check error:", err);
        if (process.env.NODE_ENV === "production") {
          return jsonError(503, "Service temporarily unavailable", "service_unavailable");
        }
      }
    } else if (process.env.NODE_ENV === "production") {
      return jsonError(503, "Service temporarily unavailable", "service_unavailable");
    }
    if (!userPlan && process.env.NODE_ENV === "production") {
      return jsonError(403, "Active subscription required", "no_active_plan");
    }

    /* ── OpenAI ───────────────────────────────────────────────── */
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonError(503, "Transcription service unavailable", "service_unavailable");
    }
    const openai = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 1 });

    // The SDK accepts a web Blob/File directly in Node 18+, but toFile()
    // guarantees the filename + content-type the API uses to pick its decoder.
    const filename = filenameForType(blob.type);
    const uploadable = await toFile(blob, filename, { type: blob.type || "audio/webm" });

    let text = "";
    let usage: { input?: number; output?: number } = {};
    try {
      const result = await openai.audio.transcriptions.create({
        file: uploadable,
        model: TRANSCRIBE_MODEL,
        // Verbatim transcription: NO summarizing, NO reformulation. The prompt
        // is only a spelling/glossary bias — it never changes wording.
        ...(language ? { language } : {}),
        ...(glossary ? { prompt: glossary } : {}),
        response_format: "json",
        temperature: 0,
      });
      text = (result?.text ?? "").trim();
      // gpt-4o-transcribe returns token usage; whisper-1 does not.
      const u = (result as { usage?: { input_tokens?: number; output_tokens?: number; type?: string } }).usage;
      if (u) {
        usage = { input: u.input_tokens, output: u.output_tokens };
      }
    } catch (err) {
      console.error("[transcribe] OpenAI error:", err);
      return jsonError(502, "Transcription failed", "transcription_failed");
    }

    /* ── Cost tracking (fire-and-forget) ──────────────────────── */
    if (userId) {
      const inputTokens = usage.input ?? 0;
      // Fallback token estimate so the cost dashboard still records the call
      // when the model omits usage (e.g. whisper-1). ~4 chars per token.
      const outputTokens = usage.output ?? Math.max(1, Math.ceil(text.length / 4));
      void trackAIUsage({
        userId,
        route: "transcribe",
        model: TRANSCRIBE_MODEL,
        inputTokens,
        outputTokens,
        metadata: {
          language: language || "auto",
          audioBytes: blob.size,
          chars: text.length,
        },
      });
    }

    const durationMs = Date.now() - t0;
    // Diagnostic log (no transcript content in prod — length only) to help
    // trace accuracy/latency issues without leaking what the user said.
    console.log(
      `[transcribe] ok model=${TRANSCRIBE_MODEL} lang=${language || "auto"} ` +
        `bytes=${blob.size} chars=${text.length} ms=${durationMs}`
    );

    return new Response(JSON.stringify({ text, durationMs }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[transcribe] API error:", err);
    return jsonError(500, "Internal server error");
  }
}

/* ── helpers ──────────────────────────────────────────────────── */

function sanitizeLanguage(raw: FormDataEntryValue | null): string | undefined {
  if (typeof raw !== "string") return undefined;
  // ISO-639-1 (two letters), optionally a region we strip ("fr-FR" -> "fr").
  const code = raw.trim().slice(0, 2).toLowerCase();
  return /^[a-z]{2}$/.test(code) ? code : undefined;
}

function sanitizePrompt(raw: FormDataEntryValue | null): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_PROMPT_CHARS);
}

function filenameForType(mime: string): string {
  const m = (mime || "").toLowerCase();
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "audio.mp4";
  if (m.includes("ogg") || m.includes("opus")) return "audio.ogg";
  if (m.includes("wav")) return "audio.wav";
  if (m.includes("mpeg") || m.includes("mp3")) return "audio.mp3";
  return "audio.webm";
}

function jsonError(status: number, message: string, code?: string) {
  return new Response(
    JSON.stringify(code ? { error: code, message } : { error: message }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}
