"use client";

/**
 * useVoiceCapture — hybrid voice dictation for the chat input.
 *
 * Strategy (chosen with the user): best of both worlds.
 *   1. While recording, the browser's Web Speech API streams LIVE interim text
 *      into the input so the user gets instant visual feedback as they speak.
 *      (Web Speech is weak/absent on Safari/Firefox — that's fine, it's only
 *      the live preview; the authoritative transcript comes from step 2.)
 *   2. In parallel, MediaRecorder captures the raw audio. When the user stops,
 *      the audio is sent to OpenAI gpt-4o-transcribe (/api/transcribe) and the
 *      high-accuracy, VERBATIM transcript REPLACES the live preview text.
 *   3. If transcription fails (offline, quota, etc.) we keep the live Web Speech
 *      text as a graceful fallback and surface a discreet notice.
 *
 * Hard rule: the transcript is treated as the user's exact words — never
 * summarized or reformulated. Post-processing only fixes brand/proper-noun
 * spelling + stray whitespace (see lib/voice/post-process).
 *
 * The hook owns the whole microphone lifecycle and exposes the exact surface
 * UniversalChatInput expects, so both /app and /app/c/[id] share one
 * implementation instead of two drifting copies.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { UniversalChatInputRef } from "@/components/chat/UniversalChatInput";
import { transcribeAudio } from "@/lib/voice/transcription";
import { postProcessTranscript, buildTranscriptionGlossary } from "@/lib/voice/post-process";

export type VoiceErrorKind = "mic-denied" | "start-failed";

export interface UseVoiceCaptureOptions {
  /** Ref to the chat input's imperative handle (getValue/setValue). */
  inputRef: React.RefObject<UniversalChatInputRef | null>;
  /** UI language as a 2-letter code ("fr", "en", …). Drives both engines. */
  language?: string;
  /** Extra domain terms (sector, company…) to bias Whisper spelling. */
  glossaryTerms?: string[];
  /** Recoverable error (mic denied / failed to start) — page shows a toast. */
  onError?: (kind: VoiceErrorKind) => void;
  /** Whisper failed and we kept the live text — page shows a discreet notice. */
  onTranscriptionFallback?: () => void;
}

export interface UseVoiceCaptureReturn {
  /** Whether voice input can be offered at all (record OR live recognition). */
  speechSupported: boolean;
  /** Currently capturing audio. */
  isRecording: boolean;
  /** Recording stopped, transcribing the audio via Whisper. */
  isVoiceProcessing: boolean;
  /** Live interim text from Web Speech (for the input's status bar). */
  interimText: string;
  /** Mic button handler — starts if idle, stops + transcribes if recording. */
  toggleRecording: () => void;
  /** Force-stop everything WITHOUT transcribing (used on submit / unmount). */
  cancelRecording: () => void;
}

/** Map a 2-letter UI language to a Web Speech BCP-47 tag. */
function toSpeechLang(lang: string | undefined): string {
  const code = (lang || "fr").slice(0, 2).toLowerCase();
  const map: Record<string, string> = {
    fr: "fr-FR",
    en: "en-US",
    es: "es-ES",
    de: "de-DE",
    it: "it-IT",
    pt: "pt-PT",
    nl: "nl-NL",
    zh: "zh-CN",
    ja: "ja-JP",
    ko: "ko-KR",
  };
  return map[code] || `${code}-${code.toUpperCase()}`;
}

/** Pick the best MediaRecorder mime type the current browser supports. */
function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4", // Safari / iOS
    "audio/mpeg",
  ];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported?.(c)) return c;
    } catch {
      /* ignore */
    }
  }
  return "";
}

function hasRecorderSupport(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export function useVoiceCapture({
  inputRef,
  language,
  glossaryTerms,
  onError,
  onTranscriptionFallback,
}: UseVoiceCaptureOptions): UseVoiceCaptureReturn {
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [interimText, setInterimText] = useState("");

  // Refs (stable across renders; safe to read inside async/event callbacks).
  const isRecordingRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionSupportedRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef<string>("");
  const preRecordingTextRef = useRef("");
  const liveTranscriptRef = useRef("");
  const transcribeAbortRef = useRef<AbortController | null>(null);

  // Keep the latest options in a ref so the long-lived recognition handlers
  // and async transcription read current values without being re-created.
  const optionsRef = useRef({ inputRef, language, glossaryTerms, onError, onTranscriptionFallback });
  optionsRef.current = { inputRef, language, glossaryTerms, onError, onTranscriptionFallback };

  /** Replace the dictated portion of the input with `text`, preserving the
   *  text that existed before recording started. */
  const setVoiceText = useCallback((voice: string) => {
    const prefix = preRecordingTextRef.current;
    const sep = prefix && voice && !/\s$/.test(prefix) ? " " : "";
    const full = voice ? prefix + sep + voice : prefix;
    optionsRef.current.inputRef.current?.setValue(full);
  }, []);

  /** Stop and release the microphone stream. */
  const stopStream = useCallback(() => {
    const s = mediaStreamRef.current;
    if (s) {
      s.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          /* ignore */
        }
      });
      mediaStreamRef.current = null;
    }
  }, []);

  // ── Initialise Web Speech recognition once on mount ──────────────────────
  useEffect(() => {
    const SpeechRecognitionImpl =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;

    if (SpeechRecognitionImpl) {
      recognitionSupportedRef.current = true;
      const recognition = new SpeechRecognitionImpl();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = toSpeechLang(optionsRef.current.language);

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let newFinals = "";
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) newFinals += transcript;
          else interim += transcript;
        }
        if (newFinals) liveTranscriptRef.current += newFinals;
        setVoiceText(liveTranscriptRef.current + interim);
        setInterimText(interim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          isRecordingRef.current = false;
          setIsRecording(false);
          optionsRef.current.onError?.("mic-denied");
        } else if (event.error === "no-speech" || event.error === "aborted") {
          // Expected during pauses / manual stop — ignore.
        } else {
          console.warn("[voice] speech recognition error:", event.error);
        }
      };

      recognition.onend = () => {
        // continuous=true can still stop unexpectedly (silence/network). Restart
        // only while the user is still recording.
        if (isRecordingRef.current) {
          try {
            recognition.start();
          } catch {
            /* already started or stopping */
          }
        }
      };

      recognitionRef.current = recognition;
    }

    // Voice is offered if we can record audio (Whisper path) OR do live
    // recognition. In practice all target browsers have MediaRecorder.
    setSpeechSupported(hasRecorderSupport() || recognitionSupportedRef.current);

    return () => {
      // Full teardown on unmount — drop recognition, recorder, stream, timers.
      isRecordingRef.current = false;
      if (transcribeAbortRef.current) {
        try {
          transcribeAbortRef.current.abort();
        } catch {
          /* ignore */
        }
        transcribeAbortRef.current = null;
      }
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
      }
      mediaRecorderRef.current = null;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          /* ignore */
        }
        recognitionRef.current = null;
      }
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Transcription: runs when MediaRecorder finishes assembling the blob ──
  const handleRecorderStop = useCallback(async () => {
    const mime = mimeRef.current || "audio/webm";
    const blob = new Blob(chunksRef.current, { type: mime });
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    stopStream();

    // Too short to contain speech → keep whatever live text we have.
    if (blob.size < 1024) {
      setIsVoiceProcessing(false);
      return;
    }

    const ctrl = new AbortController();
    transcribeAbortRef.current = ctrl;
    const { language: lang, glossaryTerms: terms } = optionsRef.current;
    const t0 = Date.now();
    try {
      const glossary = buildTranscriptionGlossary(terms ?? []);
      const { text } = await transcribeAudio(blob, {
        language: (lang || "fr").slice(0, 2).toLowerCase(),
        glossary,
        signal: ctrl.signal,
      });
      const cleaned = postProcessTranscript(text);
      if (cleaned) {
        // Authoritative Whisper transcript replaces the live preview text.
        liveTranscriptRef.current = cleaned;
        setVoiceText(cleaned);
        if (process.env.NODE_ENV !== "production") {
          console.debug(
            `[voice] transcript applied chars=${cleaned.length} bytes=${blob.size} ms=${Date.now() - t0}`
          );
        }
      }
      // Empty transcript (pure silence) → keep live text as-is.
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        // Cancelled by the user (submit/unmount) — keep current text.
      } else {
        console.warn("[voice] transcription failed, keeping live text:", err);
        optionsRef.current.onTranscriptionFallback?.();
      }
    } finally {
      transcribeAbortRef.current = null;
      setIsVoiceProcessing(false);
    }
  }, [setVoiceText, stopStream]);

  // ── Start recording ──────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    preRecordingTextRef.current = optionsRef.current.inputRef.current?.getValue() ?? "";
    liveTranscriptRef.current = "";
    chunksRef.current = [];
    setInterimText("");

    // Optimistic UI — show the recording state immediately; we revert if every
    // capture path fails below.
    isRecordingRef.current = true;
    setIsRecording(true);
    setIsVoiceProcessing(false);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(50);
      } catch {
        /* ignore */
      }
    }

    // Live interim (best effort; no-op on Safari/Firefox).
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = toSpeechLang(optionsRef.current.language);
        recognitionRef.current.start();
      } catch {
        // Often "already started" — harmless.
      }
    }

    // Authoritative audio capture for Whisper.
    if (hasRecorderSupport()) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // The user may have stopped while the permission prompt was open.
        if (!isRecordingRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        mediaStreamRef.current = stream;
        const mime = pickMimeType();
        mimeRef.current = mime;
        const recorder = mime
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = handleRecorderStop;
        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.warn("[voice] mic capture unavailable:", err);
        // If live recognition is also unavailable, this is a hard failure.
        if (!recognitionRef.current) {
          isRecordingRef.current = false;
          setIsRecording(false);
          optionsRef.current.onError?.(
            (err as DOMException)?.name === "NotAllowedError" ? "mic-denied" : "start-failed"
          );
        }
        // Otherwise keep going in live-only mode (recognition.onerror covers
        // the denied case for the Web Speech path).
      }
    } else if (!recognitionRef.current) {
      isRecordingRef.current = false;
      setIsRecording(false);
      optionsRef.current.onError?.("start-failed");
    }
  }, [handleRecorderStop]);

  // ── Stop recording (normal path → transcribe) ────────────────────────────
  const stopRecording = useCallback(() => {
    // Load-bearing: clear the ref BEFORE stopping recognition so its onend
    // handler does not auto-restart the session.
    isRecordingRef.current = false;
    setIsRecording(false);
    setInterimText("");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      setIsVoiceProcessing(true); // "Transcription…" until Whisper returns
      try {
        recorder.stop(); // → handleRecorderStop assembles + transcribes
      } catch {
        setIsVoiceProcessing(false);
        stopStream();
      }
    } else {
      // No audio captured (live-only mode) → keep the Web Speech text.
      stopStream();
    }
  }, [stopStream]);

  // ── Cancel (force stop, NO transcription) ────────────────────────────────
  const cancelRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setInterimText("");
    setIsVoiceProcessing(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
    }
    if (transcribeAbortRef.current) {
      try {
        transcribeAbortRef.current.abort();
      } catch {
        /* ignore */
      }
      transcribeAbortRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null; // do NOT transcribe on this stop
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    stopStream();
  }, [stopStream]);

  const toggleRecording = useCallback(() => {
    if (isVoiceProcessing) return; // ignore taps while transcribing
    if (isRecordingRef.current) {
      stopRecording();
    } else {
      void startRecording();
    }
  }, [isVoiceProcessing, startRecording, stopRecording]);

  return {
    speechSupported,
    isRecording,
    isVoiceProcessing,
    interimText,
    toggleRecording,
    cancelRecording,
  };
}
