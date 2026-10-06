"use client";

/**
 * StrategistSession — the conversation state of the Strategist drawer.
 *
 * Lives ABOVE the drawer's animated content (mounted by StrategistDrawer, which
 * stays mounted for the whole authenticated session), so closing the drawer —
 * backdrop tap, Esc, swipe — no longer wipes the conversation or the plans in
 * it, and a request in flight keeps running and lands in the thread. Only
 * "Stop" and "New conversation" abort.
 *
 * Owns:
 *   - messages + routing (plan / single post / advisor) + SSE parsing
 *   - errors with a real retry
 *   - "Turn into a plan" from an advisor answer
 *   - the editorial settings (saved defaults + this session's working copy)
 *   - the autonomous-mode config (header pill + hero row stay in sync)
 *   - the latest plan (resume after a reload) and batches queued by the banner
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/db/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useStrategistDrawer } from "@/contexts/StrategistDrawerContext";
import { getAuthHeaders } from "@/lib/api/client";
import {
  detectStrategistIntent,
  type StrategistIntent,
} from "@/lib/strategist/batch-intent";
import { getStrategyBatch, listStrategyBatches } from "@/lib/db/strategy-batches";
import { FORMATS, normalizeFormat } from "@/lib/ai/post-formats";
import { useStrategistCopy, type StrategistLang } from "@/lib/strategist/copy";
import type {
  AutonomousStrategistConfig,
  StrategyBatch,
  StrategistAdvancedParams,
} from "@/types";

export type StrategistMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Assistant turn carrying a plan → rendered as a plan card. */
  batch?: StrategyBatch;
  /** Assistant placeholder while waiting — what we are waiting for. */
  pending?: "chat" | "plan" | "post";
};

export type StrategistView = "chat" | "settings";

interface SessionError {
  message: string;
  canRetry: boolean;
}

interface SendOptions {
  /** Explicit routing (suggestions, autonomous "generate now"). */
  intent?: StrategistIntent;
  /** What to show in the user bubble when it differs from the request text. */
  display?: string;
}

interface StrategistSessionValue {
  lang: StrategistLang;
  messages: StrategistMsg[];
  busy: boolean;
  error: SessionError | null;
  /** Polite live-region text for screen readers ("Plan ready"…). */
  announcement: string;
  send: (text: string, opts?: SendOptions) => void;
  stop: () => void;
  retry: () => void;
  dismissError: () => void;
  newChat: () => void;
  regenerate: () => void;
  turnIntoPlan: (assistantMsgId: string) => void;
  updateBatch: (batch: StrategyBatch) => void;

  view: StrategistView;
  setView: (v: StrategistView) => void;

  /** Composer prefill requests (e.g. "Write a post about "). */
  prefill: { text: string; nonce: number } | null;
  requestPrefill: (text: string) => void;

  /** Editorial settings: saved defaults + this session's working copy. */
  savedParams: StrategistAdvancedParams;
  params: StrategistAdvancedParams;
  setParams: (p: StrategistAdvancedParams) => void;
  saveParams: () => Promise<boolean>;
  /** Number of working-copy fields that differ from the saved defaults. */
  unsavedCount: number;

  autonomous: AutonomousStrategistConfig | null;
  patchAutonomous: (patch: Partial<AutonomousStrategistConfig>) => Promise<boolean>;

  lastPlan: StrategyBatch | null;
  openLastPlan: () => void;
  /** Append a plan generated elsewhere (autonomous "generate now"). */
  showBatch: (batch: StrategyBatch, intro?: string) => void;
}

const SessionContext = createContext<StrategistSessionValue | null>(null);

export function useStrategistSession(): StrategistSessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useStrategistSession must be used inside <StrategistSessionProvider>");
  return ctx;
}

/** Strip empty fields so comparisons and persistence stay clean. */
export function cleanParams(p: StrategistAdvancedParams): StrategistAdvancedParams {
  const out: StrategistAdvancedParams = {};
  if (p.context?.trim()) out.context = p.context.trim();
  if (p.objective) out.objective = p.objective;
  if (p.tone) out.tone = p.tone;
  if (p.audience?.trim()) out.audience = p.audience.trim();
  if (p.formality) out.formality = p.formality;
  if (p.ctaIntensity) out.ctaIntensity = p.ctaIntensity;
  if (p.hookStyle) out.hookStyle = p.hookStyle;
  if (p.orientation) out.orientation = p.orientation;
  if (p.emotion) out.emotion = p.emotion;
  return out;
}

function diffCount(a: StrategistAdvancedParams, b: StrategistAdvancedParams): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof StrategistAdvancedParams>;
  let n = 0;
  keys.forEach((k) => {
    if (a[k] !== b[k]) n++;
  });
  return n;
}

/** Compact plan summary sent to the advisor so it can discuss "post 3". */
function summarizeBatch(batch: StrategyBatch, lang: StrategistLang): string {
  const head = lang === "fr" ? `Plan « ${batch.theme} » :` : `Plan "${batch.theme}":`;
  const rows = batch.posts.map((p, i) => {
    const label = FORMATS[normalizeFormat(p.format)].label[lang];
    return `${i + 1}. [${label}] ${p.hook}`;
  });
  return [head, ...rows].join("\n");
}

const uid = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const timezone = () =>
  (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";

export function StrategistSessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { c, lang } = useStrategistCopy();
  const { isOpen, pendingBatchId, takePendingBatch } = useStrategistDrawer();

  const [messages, setMessages] = useState<StrategistMsg[]>([]);
  const messagesRef = useRef<StrategistMsg[]>([]);
  const commit = useCallback((next: StrategistMsg[] | ((prev: StrategistMsg[]) => StrategistMsg[])) => {
    setMessages((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      messagesRef.current = value;
      return value;
    });
  }, []);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SessionError | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [view, setView] = useState<StrategistView>("chat");
  const [prefill, setPrefill] = useState<{ text: string; nonce: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<{ text: string; opts?: SendOptions } | null>(null);

  const [savedParams, setSavedParams] = useState<StrategistAdvancedParams>({});
  const [params, setParamsState] = useState<StrategistAdvancedParams>({});
  const paramsRef = useRef<StrategistAdvancedParams>({});
  const [autonomous, setAutonomous] = useState<AutonomousStrategistConfig | null>(null);
  const [lastPlan, setLastPlan] = useState<StrategyBatch | null>(null);
  const hydratedRef = useRef(false);

  // Hydrate settings + autonomous config + latest plan the first time the
  // drawer opens (not on every app load — most users never open it).
  useEffect(() => {
    if (!isOpen || !user?.uid || hydratedRef.current) return;
    hydratedRef.current = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.exists() ? snap.data() : {};
        const saved = cleanParams((data.strategistParams ?? {}) as StrategistAdvancedParams);
        setSavedParams(saved);
        setParamsState(saved);
        paramsRef.current = saved;
        setAutonomous((data.autonomousMode as AutonomousStrategistConfig | undefined) ?? null);
      } catch (err) {
        console.warn("[StrategistSession] hydrate failed:", err);
      }
      const batches = await listStrategyBatches(user.uid, 5);
      setLastPlan(batches.find((b) => b.status !== "discarded" && b.posts.length > 0) ?? null);
    })();
  }, [isOpen, user?.uid]);

  // Abort only when the whole session goes away (logout / layout unmount).
  useEffect(() => () => abortRef.current?.abort(), []);

  const appendBatchMessage = useCallback(
    (batch: StrategyBatch, intro: string) => {
      if (messagesRef.current.some((m) => m.batch?.id === batch.id)) return;
      commit((prev) => [...prev, { id: uid("a"), role: "assistant", content: intro, batch }]);
      setAnnouncement(c.thread.planReady);
    },
    [commit, c.thread.planReady],
  );

  // Batches queued by the "weekly plan ready" banner.
  useEffect(() => {
    if (!isOpen || !pendingBatchId) return;
    const id = takePendingBatch();
    if (!id) return;
    setView("chat");
    void getStrategyBatch(id).then((batch) => {
      if (batch) appendBatchMessage(batch, c.thread.autoPlanIntro);
    });
  }, [isOpen, pendingBatchId, takePendingBatch, appendBatchMessage, c.thread.autoPlanIntro]);

  const failWith = useCallback(
    (placeholderId: string, message: string, canRetry = true) => {
      commit((prev) => prev.filter((m) => m.id !== placeholderId));
      setError({ message, canRetry });
    },
    [commit],
  );

  const errorFromResponse = useCallback(
    async (res: Response): Promise<string> => {
      const body = await res.json().catch(() => ({} as { message?: string }));
      if (res.status === 429) return body.message || c.thread.errorRateLimit;
      if ((res.status === 403 || res.status === 428 || res.status === 400) && body.message) return body.message;
      return c.thread.errorGeneric;
    },
    [c.thread],
  );

  const send = useCallback(
    (rawText: string, opts?: SendOptions) => {
      const text = rawText.trim();
      if (!text || busy || !user) return;
      setError(null);
      setAnnouncement("");
      lastRequestRef.current = { text, opts };

      const intent = opts?.intent ?? detectStrategistIntent(text);
      const kind = intent.kind === "plan" ? "plan" : intent.kind === "post" ? "post" : "chat";
      const placeholderId = uid("a");
      const historyBefore = messagesRef.current;
      commit([
        ...historyBefore,
        { id: uid("u"), role: "user", content: opts?.display ?? text },
        { id: placeholderId, role: "assistant", content: "", pending: kind },
      ]);
      setBusy(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const finish = () => {
        setBusy(false);
        if (abortRef.current === ctrl) abortRef.current = null;
      };

      // ── Plan / single post → batch-plan pipeline ──────────────────────
      if (kind !== "chat") {
        const count = intent.kind === "plan" ? intent.count : 1;
        const period = intent.kind === "plan" ? intent.period : "none";
        void (async () => {
          try {
            const headers = await getAuthHeaders();
            const advanced = cleanParams(paramsRef.current);
            const res = await fetch("/api/strategist/batch-plan", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...headers },
              body: JSON.stringify({
                sourcePrompt: text.slice(0, 2000),
                count,
                period,
                timezone: timezone(),
                language: lang,
                ...(Object.keys(advanced).length ? { advanced } : {}),
              }),
              signal: ctrl.signal,
            });
            if (!res.ok) return failWith(placeholderId, await errorFromResponse(res));
            const data = await res.json();
            const batch = data?.batch as StrategyBatch | undefined;
            if (!batch || !Array.isArray(batch.posts) || batch.posts.length === 0) {
              return failWith(placeholderId, c.thread.errorGeneric);
            }
            commit((prev) =>
              prev.map((m) =>
                m.id === placeholderId
                  ? { ...m, pending: undefined, content: c.thread.planIntro(batch.posts.length), batch }
                  : m,
              ),
            );
            setLastPlan(batch);
            setAnnouncement(c.thread.planReady);
          } catch (err) {
            if ((err as Error).name === "AbortError") {
              commit((prev) => prev.filter((m) => m.id !== placeholderId));
              return;
            }
            console.error("[strategist] batch-plan error:", err);
            failWith(placeholderId, c.thread.errorNetwork);
          } finally {
            finish();
          }
        })();
        return;
      }

      // ── Advisor (SSE stream) ───────────────────────────────────────────
      void (async () => {
        let received = false;
        try {
          const headers = await getAuthHeaders();
          const history = historyBefore
            .filter((m) => !m.pending && (m.content || m.batch))
            .slice(-20)
            .map((m) =>
              m.batch
                ? { role: "assistant" as const, content: summarizeBatch(m.batch, lang) }
                : { role: m.role, content: m.content },
            );
          history.push({ role: "user", content: text });

          const res = await fetch("/api/strategist", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify({ messages: history, language: lang }),
            signal: ctrl.signal,
          });
          if (!res.ok || !res.body) return failWith(placeholderId, await errorFromResponse(res));

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let sep;
            while ((sep = buffer.indexOf("\n\n")) !== -1) {
              const rawEvt = buffer.slice(0, sep);
              buffer = buffer.slice(sep + 2);
              const lines = rawEvt.split("\n");
              const evt = lines.find((l) => l.startsWith("event:"))?.slice(6).trim();
              const dataLine = lines.find((l) => l.startsWith("data:"));
              if (!evt || !dataLine) continue;
              let data: { content?: string } = {};
              try {
                data = JSON.parse(dataLine.slice(5).trim());
              } catch {
                /* malformed event — skip */
              }
              if (evt === "chunk" && typeof data.content === "string") {
                received = true;
                const chunk = data.content;
                commit((prev) =>
                  prev.map((m) =>
                    m.id === placeholderId ? { ...m, pending: undefined, content: m.content + chunk } : m,
                  ),
                );
              } else if (evt === "error") {
                // Provider errors are raw English — show our own message.
                return failWith(placeholderId, c.thread.errorGeneric);
              }
            }
          }
          if (!received) return failWith(placeholderId, c.thread.errorGeneric);
          setAnnouncement(c.thread.answerReady);
        } catch (err) {
          if ((err as Error).name === "AbortError") {
            // Keep a partial answer; drop an empty placeholder.
            commit((prev) =>
              prev
                .filter((m) => !(m.id === placeholderId && !m.content))
                .map((m) => (m.id === placeholderId ? { ...m, pending: undefined } : m)),
            );
            return;
          }
          console.error("[strategist] send error:", err);
          failWith(placeholderId, c.thread.errorNetwork);
        } finally {
          finish();
        }
      })();
    },
    [busy, user, commit, lang, c.thread, failWith, errorFromResponse],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const retry = useCallback(() => {
    const last = lastRequestRef.current;
    if (!last || busy) return;
    // Drop the user bubble of the failed request — send() adds it back.
    const msgs = [...messagesRef.current];
    while (msgs.length && msgs[msgs.length - 1].role === "user") msgs.pop();
    commit(msgs);
    setError(null);
    send(last.text, last.opts);
  }, [busy, commit, send]);

  const regenerate = useCallback(() => {
    const last = lastRequestRef.current;
    if (!last || busy) return;
    const msgs = [...messagesRef.current];
    while (msgs.length && msgs[msgs.length - 1].role === "assistant") msgs.pop();
    while (msgs.length && msgs[msgs.length - 1].role === "user") msgs.pop();
    commit(msgs);
    send(last.text, last.opts);
  }, [busy, commit, send]);

  const turnIntoPlan = useCallback(
    (assistantMsgId: string) => {
      const msgs = messagesRef.current;
      const idx = msgs.findIndex((m) => m.id === assistantMsgId);
      if (idx < 0) return;
      const answer = msgs[idx].content;
      const question = [...msgs.slice(0, idx)].reverse().find((m) => m.role === "user")?.content ?? "";
      // As many posts as numbered ideas in the answer (3-7), else 5.
      const numbered = (answer.match(/^\s*(?:\*\*)?\d+[.)]/gm) ?? []).length;
      const count = numbered >= 3 ? Math.min(7, numbered) : 5;
      const prompt = c.thread.turnIntoPlanPrompt(question.slice(0, 300), answer.slice(0, 1500)).slice(0, 2000);
      send(prompt, { intent: { kind: "plan", count, period: "week" }, display: c.thread.turnIntoPlan });
    },
    [c.thread, send],
  );

  const updateBatch = useCallback(
    (batch: StrategyBatch) => {
      commit((prev) => prev.map((m) => (m.batch?.id === batch.id ? { ...m, batch } : m)));
      setLastPlan((lp) => (lp?.id === batch.id ? batch : lp));
    },
    [commit],
  );

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    commit([]);
    setError(null);
    setAnnouncement("");
    setView("chat");
    lastRequestRef.current = null;
  }, [commit]);

  const requestPrefill = useCallback((text: string) => {
    setView("chat");
    setPrefill({ text, nonce: Date.now() });
  }, []);

  const setParams = useCallback((p: StrategistAdvancedParams) => {
    const cleaned = cleanParams(p);
    paramsRef.current = cleaned;
    setParamsState(cleaned);
  }, []);

  const saveParams = useCallback(async () => {
    if (!user?.uid) return false;
    try {
      const cleaned = cleanParams(paramsRef.current);
      await updateDoc(doc(db, "users", user.uid), {
        strategistParams: cleaned,
        updatedAt: serverTimestamp(),
      });
      setSavedParams(cleaned);
      return true;
    } catch (err) {
      console.error("[StrategistSession] save params failed:", err);
      return false;
    }
  }, [user?.uid]);

  const patchAutonomous = useCallback(
    async (patch: Partial<AutonomousStrategistConfig>) => {
      if (!user?.uid) return false;
      const prev = autonomous;
      setAutonomous((cur) => ({ enabled: false, dayOfWeek: 1, count: 5, ...(cur ?? {}), ...patch }));
      try {
        const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
        if (patch.enabled !== undefined) update["autonomousMode.enabled"] = patch.enabled;
        if (patch.dayOfWeek !== undefined) update["autonomousMode.dayOfWeek"] = patch.dayOfWeek;
        if (patch.count !== undefined) update["autonomousMode.count"] = patch.count;
        if (patch.customPrompt !== undefined) update["autonomousMode.customPrompt"] = patch.customPrompt || null;
        await updateDoc(doc(db, "users", user.uid), update);
        return true;
      } catch (err) {
        console.error("[StrategistSession] autonomous save failed:", err);
        setAutonomous(prev);
        return false;
      }
    },
    [user?.uid, autonomous],
  );

  const openLastPlan = useCallback(() => {
    if (lastPlan) appendBatchMessage(lastPlan, c.thread.planIntro(lastPlan.posts.length));
  }, [lastPlan, appendBatchMessage, c.thread]);

  const showBatch = useCallback(
    (batch: StrategyBatch, intro?: string) => {
      setView("chat");
      setLastPlan(batch);
      appendBatchMessage(batch, intro ?? c.thread.planIntro(batch.posts.length));
    },
    [appendBatchMessage, c.thread],
  );

  const value = useMemo<StrategistSessionValue>(
    () => ({
      lang,
      messages,
      busy,
      error,
      announcement,
      send,
      stop,
      retry,
      dismissError: () => setError(null),
      newChat,
      regenerate,
      turnIntoPlan,
      updateBatch,
      view,
      setView,
      prefill,
      requestPrefill,
      savedParams,
      params,
      setParams,
      saveParams,
      unsavedCount: diffCount(params, savedParams),
      autonomous,
      patchAutonomous,
      lastPlan,
      openLastPlan,
      showBatch,
    }),
    [
      lang, messages, busy, error, announcement, send, stop, retry, newChat, regenerate,
      turnIntoPlan, updateBatch, view, prefill, requestPrefill, savedParams, params, setParams,
      saveParams, autonomous, patchAutonomous, lastPlan, openLastPlan, showBatch,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
