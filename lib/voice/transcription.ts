/**
 * Client helper: upload a recorded audio blob to /api/transcribe and get back a
 * high-accuracy, VERBATIM transcript. Used by the hybrid voice capture hook to
 * replace the live Web-Speech interim text once recording stops.
 */

import { getAuthHeaders } from "@/lib/api/client";

export interface TranscribeOptions {
  /** ISO-639-1 hint (e.g. "fr"). Improves accuracy + avoids language drift. */
  language?: string;
  /** Glossary/context bias string (proper nouns, jargon). Never an instruction. */
  glossary?: string;
  /** Optional abort signal so an in-flight transcription can be cancelled. */
  signal?: AbortSignal;
}

export interface TranscribeResult {
  text: string;
  durationMs?: number;
}

/** Pick a filename extension that matches the recorded mime type. */
function extForType(mime: string): string {
  const m = (mime || "").toLowerCase();
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "mp4";
  if (m.includes("ogg") || m.includes("opus")) return "ogg";
  if (m.includes("wav")) return "wav";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  return "webm";
}

/** Hard ceiling on the browser→server round-trip. Without this, a stalled
 *  upload (mobile drop, proxy hang) would leave the fetch promise unsettled and
 *  the voice button stuck in "Transcription…" forever. The server has its own
 *  30s OpenAI timeout, so 45s here only guards the network leg around it. */
const CLIENT_TIMEOUT_MS = 45_000;

/**
 * Send `blob` to the transcription route. Throws on any non-2xx, network error,
 * or timeout so the caller can fall back to the live Web-Speech text. A caller
 * abort (user cancelled) is rethrown as an AbortError; a timeout is rethrown as
 * a plain Error so the caller can distinguish "user cancelled" (silent) from
 * "it failed" (show the fallback notice).
 */
export async function transcribeAudio(
  blob: Blob,
  { language, glossary, signal }: TranscribeOptions = {}
): Promise<TranscribeResult> {
  const form = new FormData();
  form.append("audio", blob, `recording.${extForType(blob.type)}`);
  if (language) form.append("language", language);
  if (glossary) form.append("prompt", glossary);

  // NOTE: do NOT set Content-Type — the browser must set the multipart
  // boundary itself. getAuthHeaders only adds Authorization.
  const headers = await getAuthHeaders();

  // Combine the caller's signal with a timeout into a single controller so the
  // fetch always settles. `timedOut` lets us tell a timeout apart from a
  // user-initiated cancel (which arrives via the caller's `signal`).
  const controller = new AbortController();
  let timedOut = false;
  const onCallerAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onCallerAbort, { once: true });
  }
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CLIENT_TIMEOUT_MS);

  try {
    const res = await fetch("/api/transcribe", {
      method: "POST",
      headers,
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = `transcribe failed (${res.status})`;
      try {
        const j = await res.json();
        detail = j.message || j.error || detail;
      } catch {
        /* ignore parse errors */
      }
      throw new Error(detail);
    }

    const data = (await res.json()) as TranscribeResult;
    return { text: data.text ?? "", durationMs: data.durationMs };
  } catch (err) {
    // Timeout → real failure (surface the fallback). Caller abort → rethrow the
    // AbortError so the caller stays silent (the user chose to cancel/send).
    if (timedOut) throw new Error("transcription timed out");
    throw err;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onCallerAbort);
  }
}
