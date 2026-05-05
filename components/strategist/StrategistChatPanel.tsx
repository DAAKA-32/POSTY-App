"use client";

/**
 * StrategistChatPanel — host-agnostic chat experience for the Strategist.
 *
 * Sober rebuild. Hero is plain typography (eyebrow + title + subtitle +
 * starter cards). Conversation is a Notion-style document (gray user bubbles,
 * bare assistant markdown). No avatars in the thread, no agent header,
 * no ambient gradients.
 *
 * Self-contained: holds its own messages state, SSE parser, AbortController.
 * Composer is mounted inside but is the visually richer element (it has the
 * amber send button — the second of two amber accents per screen).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAuthHeaders } from "@/lib/api/client";
import StrategistStarterCard from "./StrategistStarterCard";
import StrategistMessageBubble from "./StrategistMessageBubble";
import StrategistComposer from "./StrategistComposer";

type Msg = { id: string; role: "user" | "assistant"; content: string };

/**
 * Splits the editorial title at the first comma to highlight the second
 * clause in amber. Falls back to last word. Works across EN/FR/etc.
 *   "Build a strategy, not just posts." → ["Build a strategy,", "not just posts."]
 */
function splitTitleForAccent(title: string): [string, string] {
  const idx = title.indexOf(",");
  if (idx > -1) return [title.slice(0, idx + 1), title.slice(idx + 1).trim()];
  const words = title.split(" ");
  if (words.length < 2) return [title, ""];
  return [words.slice(0, -1).join(" "), words.slice(-1).join(" ")];
}

const STARTER_ICONS = [
  // Audit — magnifying glass
  <svg key="i1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M16.65 11.5a5.15 5.15 0 11-10.3 0 5.15 5.15 0 0110.3 0z" />
  </svg>,
  // 30-day plan — calendar
  <svg key="i2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>,
  // Positioning — target
  <svg key="i3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-4 h-4">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </svg>,
  // Hooks — lightning
  <svg key="i4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>,
];

export default function StrategistChatPanel() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const reduced = useReducedMotion();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesRef = useRef<Msg[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastUserMsgRef = useRef<string>("");

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Cleanup any in-flight request on unmount (drawer close)
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || streaming || !user) return;
      setError(null);
      lastUserMsgRef.current = text;

      const userMsg: Msg = { id: `u_${Date.now()}`, role: "user", content: text };
      const assistantId = `a_${Date.now()}`;
      const next: Msg[] = [
        ...messagesRef.current,
        userMsg,
        { id: assistantId, role: "assistant", content: "" },
      ];
      setMessages(next);
      messagesRef.current = next;
      setStreaming(true);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const headers = await getAuthHeaders();
        const history = next
          .filter((m) => m.id !== assistantId)
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/strategist", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({
            messages: history,
            language: language === "fr" ? "fr" : "en",
          }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          const errBody = await res.json().catch(() => ({}));
          setError(
            res.status === 429
              ? t.strategist.errorRateLimit
              : errBody.message || t.strategist.errorGeneric
          );
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let sep;
          while ((sep = buffer.indexOf("\n\n")) !== -1) {
            const raw = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const lines = raw.split("\n");
            const evtLine = lines.find((l) => l.startsWith("event:"));
            const dataLine = lines.find((l) => l.startsWith("data:"));
            if (!evtLine || !dataLine) continue;
            const evt = evtLine.slice(6).trim();
            let data: { content?: string; message?: string } = {};
            try {
              data = JSON.parse(dataLine.slice(5).trim());
            } catch {
              /* malformed event — skip */
            }
            if (evt === "chunk" && typeof data.content === "string") {
              const chunk = data.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + chunk }
                    : m
                )
              );
            } else if (evt === "error") {
              setError(data.message || t.strategist.errorGeneric);
              setMessages((prev) => prev.filter((m) => m.id !== assistantId));
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("[strategist] send error:", err);
        setError(t.strategist.errorGeneric);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [streaming, user, language, t.strategist]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  const clear = useCallback(() => {
    if (messagesRef.current.length === 0) return;
    if (window.confirm(t.strategist.clearChatConfirm)) {
      setMessages([]);
      messagesRef.current = [];
      setError(null);
    }
  }, [t.strategist.clearChatConfirm]);

  const regenerate = useCallback(() => {
    if (!lastUserMsgRef.current || streaming) return;
    const lastPrompt = lastUserMsgRef.current;
    const trimmed = [...messagesRef.current];
    while (trimmed.length && trimmed[trimmed.length - 1].role === "assistant") trimmed.pop();
    while (trimmed.length && trimmed[trimmed.length - 1].role === "user") trimmed.pop();
    setMessages(trimmed);
    messagesRef.current = trimmed;
    requestAnimationFrame(() => send(lastPrompt));
  }, [send, streaming]);

  const isEmpty = messages.length === 0;

  let lastCompletedAssistantId: string | null = null;
  if (!streaming) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && messages[i].content.length > 0) {
        lastCompletedAssistantId = messages[i].id;
        break;
      }
    }
  }

  const starters = [
    { title: t.strategist.starter1Title, prompt: t.strategist.starter1Prompt, icon: STARTER_ICONS[0] },
    { title: t.strategist.starter2Title, prompt: t.strategist.starter2Prompt, icon: STARTER_ICONS[1] },
    { title: t.strategist.starter3Title, prompt: t.strategist.starter3Prompt, icon: STARTER_ICONS[2] },
    { title: t.strategist.starter4Title, prompt: t.strategist.starter4Prompt, icon: STARTER_ICONS[3] },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <AnimatePresence mode="wait">
        {isEmpty ? (
          // ── HERO ─────────────────────────────────────────────────────────
          <motion.section
            key="hero"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto"
          >
            <div className="px-5 pt-12 sm:pt-16 pb-8">
              {/* Eyebrow — amber, the brand signature on this empty state */}
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">
                {t.strategist.headerEyebrow}
              </span>

              {/* Title — clean text with amber accent on the second clause */}
              {(() => {
                const [titleA, titleB] = splitTitleForAccent(t.strategist.headerTitle);
                return (
                  <h1 className="mt-2 text-[22px] sm:text-[24px] font-semibold tracking-tight text-gray-900 dark:text-white leading-[1.2]">
                    {titleA}
                    {titleB && (
                      <>
                        {" "}
                        <span className="bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">
                          {titleB}
                        </span>
                      </>
                    )}
                  </h1>
                );
              })()}

              {/* Subtitle */}
              <p className="mt-2.5 text-[13.5px] text-gray-500 dark:text-gray-400 leading-relaxed max-w-md">
                {t.strategist.headerSubtitle}
              </p>

              {/* Starter cards */}
              <div className="mt-9">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500 mb-3">
                  {t.strategist.starterTitle}
                </p>
                <div className="space-y-2">
                  {starters.map((s, i) => (
                    <StrategistStarterCard
                      key={i}
                      icon={s.icon}
                      title={s.title}
                      preview={s.prompt}
                      onClick={() => void send(s.prompt)}
                      delay={0.04 + i * 0.04}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        ) : (
          // ── CONVERSATION ─────────────────────────────────────────────────
          <motion.section
            key="thread"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-5">
              {messages.map((m, i) => (
                <StrategistMessageBubble
                  key={m.id}
                  role={m.role}
                  content={m.content}
                  isStreaming={
                    streaming && m.role === "assistant" && i === messages.length - 1
                  }
                  showActions={m.id === lastCompletedAssistantId}
                  onRegenerate={regenerate}
                />
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <StrategistComposer
        onSend={(text) => void send(text)}
        onStop={stop}
        onClear={clear}
        hasMessages={!isEmpty}
        streaming={streaming}
        placeholder={t.strategist.inputPlaceholder}
        clearLabel={t.strategist.clearChat}
        sendLabel={t.strategist.sendButton}
        error={error}
        onDismissError={() => setError(null)}
      />
    </div>
  );
}
