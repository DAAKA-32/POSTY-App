"use client";

/**
 * JourneyState — state of the guided strategy journey.
 *
 * Mounted next to StrategistSessionProvider in app/(app)/layout.tsx so the
 * answers, the current step and a plan being generated survive Posty Post ⇄
 * Posty Stratège switches (and a visit to the calendar). A localStorage draft
 * (lib/strategist/journey.ts) survives a reload; nothing new is stored in
 * Firestore — the answers ARE the existing editorial settings.
 *
 * Generating a plan: the answers are saved as the editorial line (the same
 * `strategistParams` the Settings view edits and the autonomous run reads),
 * then sent to the planner with an explicit `advanced`, exactly like the
 * conversation does. Errors keep every answer.
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
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics/tracker";
import toast from "@/components/ui/Toast";
import { useStrategistCopy } from "@/lib/strategist/copy";
import { useJourneyCopy } from "@/lib/strategist/journey-copy";
import { requestBatchPlan } from "@/lib/strategist/request-plan";
import {
  JOURNEY_STEPS,
  answersToParams,
  buildSourcePrompt,
  clampCount,
  draftKey,
  firstIncompleteStep,
  parseDraft,
  prefillAnswers,
  serializeDraft,
  stepIndex,
  stepIssue,
  type JourneyAnswers,
  type JourneyStep,
  type StepIssue,
} from "@/lib/strategist/journey";
import type { StrategyBatch } from "@/types";
import { useStrategistSession } from "../StrategistSession";

type Status = "idle" | "generating" | "error";

interface JourneyValue {
  /** Answers are initialised (saved settings + profile + draft read). */
  ready: boolean;
  step: JourneyStep;
  /** Furthest step reached: every step up to it is clickable. */
  reached: JourneyStep;
  answers: JourneyAnswers;
  /** "result" shows the generated plan instead of the steps. */
  phase: "steps" | "result";
  status: Status;
  error: string | null;
  batch: StrategyBatch | null;
  update: (patch: Partial<JourneyAnswers>) => void;
  goTo: (step: JourneyStep) => void;
  /** Move on, or return why the user can't yet. */
  next: () => StepIssue | null;
  back: () => void;
  generate: () => void;
  cancel: () => void;
  /** Open a plan in the result view (e.g. "resume my last plan"). */
  showResult: (batch: StrategyBatch) => void;
  editStrategy: () => void;
  newPlan: () => void;
  updateBatch: (batch: StrategyBatch) => void;
}

const JourneyContext = createContext<JourneyValue | null>(null);

export function useJourney(): JourneyValue {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error("useJourney must be used inside <StrategistJourneyProvider>");
  return ctx;
}

const later = (a: JourneyStep, b: JourneyStep) => (stepIndex(a) >= stepIndex(b) ? a : b);

function readDraft(uid: string) {
  try {
    return parseDraft(window.localStorage.getItem(draftKey(uid)));
  } catch {
    return null;
  }
}

export function StrategistJourneyProvider({ children }: { children: ReactNode }) {
  const { user, userProfile } = useAuth();
  const session = useStrategistSession();
  const { c } = useStrategistCopy();
  const { j, lang } = useJourneyCopy();

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<JourneyStep>("activity");
  const [reached, setReached] = useState<JourneyStep>("activity");
  const [answers, setAnswers] = useState<JourneyAnswers>({ count: 5, period: "week" });
  const [phase, setPhase] = useState<"steps" | "result">("steps");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [batch, setBatch] = useState<StrategyBatch | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initFor = useRef<string | null>(null);

  // Initialise once per user, after the session has read the saved settings.
  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !session.hydrated || initFor.current === uid) return;
    initFor.current = uid;
    const draft = readDraft(uid);
    if (draft) {
      setAnswers(draft.answers);
      setStep(draft.step);
      setReached(draft.reached);
    } else {
      const a = prefillAnswers({
        params: session.savedParams,
        profile: userProfile?.profile,
        bio: userProfile?.bio,
        autonomousCount: session.autonomous?.count,
      });
      // A returning user with a complete editorial line lands on the summary;
      // a new one on the first step that still needs an answer.
      const start = firstIncompleteStep(a);
      setAnswers(a);
      setStep(start);
      setReached(start);
    }
    setReady(true);
  }, [user?.uid, session.hydrated, session.savedParams, session.autonomous?.count, userProfile]);

  // Keep the draft in step with every change.
  useEffect(() => {
    if (!ready || !user?.uid) return;
    try {
      window.localStorage.setItem(draftKey(user.uid), serializeDraft({ step, reached, answers }));
    } catch {
      /* private mode / storage full: the journey still works for this visit */
    }
  }, [ready, user?.uid, step, reached, answers]);

  // A generation still running when the whole session goes away is abandoned.
  useEffect(() => () => abortRef.current?.abort(), []);

  const update = useCallback((patch: Partial<JourneyAnswers>) => {
    setAnswers((prev) => {
      const nextA = { ...prev, ...patch };
      // Keep the count valid when the period changes (a month allows more posts).
      nextA.count = clampCount(nextA.count, nextA.period);
      return nextA;
    });
    setError(null);
  }, []);

  const goTo = useCallback(
    (s: JourneyStep) => {
      if (stepIndex(s) > stepIndex(reached)) return;
      setPhase("steps");
      setStep(s);
    },
    [reached],
  );

  const next = useCallback((): StepIssue | null => {
    const issue = stepIssue(step, answers);
    if (issue) return issue;
    const i = stepIndex(step);
    if (i < JOURNEY_STEPS.length - 1) {
      const target = JOURNEY_STEPS[i + 1];
      setStep(target);
      setReached((r) => later(r, target));
    }
    return null;
  }, [step, answers]);

  const back = useCallback(() => {
    const i = stepIndex(step);
    if (i > 0) setStep(JOURNEY_STEPS[i - 1]);
  }, [step]);

  const generate = useCallback(() => {
    if (status === "generating" || !user) return;
    const blocking = firstIncompleteStep(answers);
    if (blocking !== "review") {
      setStep(blocking);
      return;
    }
    const params = answersToParams(answers);
    setStatus("generating");
    setError(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    void (async () => {
      // The answers become the editorial line (Settings + autonomous mode).
      session.setParams(params);
      const saved = await session.saveParams();
      if (!saved) toast.info(j.saveFailed);
      try {
        const result = await requestBatchPlan({
          sourcePrompt: buildSourcePrompt(answers, lang),
          count: clampCount(answers.count, answers.period),
          period: answers.period,
          language: lang,
          advanced: params,
          signal: ctrl.signal,
        });
        if (ctrl.signal.aborted) return;
        if (!result.ok) {
          const msg =
            result.status === 429
              ? result.message || c.thread.errorRateLimit
              : (result.status === 403 || result.status === 428 || result.status === 400) && result.message
                ? result.message
                : c.thread.errorGeneric;
          setError(msg);
          setStatus("error");
          return;
        }
        setBatch(result.batch);
        setPhase("result");
        setStatus("idle");
        session.rememberPlan(result.batch);
        void trackEvent("marketing_strategy_created", { props: { posts: result.batch.posts.length } });
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setStatus("idle");
          return;
        }
        console.error("[journey] batch-plan error:", err);
        setError(c.thread.errorNetwork);
        setStatus("error");
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
      }
    })();
  }, [status, user, answers, session, lang, j.saveFailed, c.thread]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
  }, []);

  const showResult = useCallback((b: StrategyBatch) => {
    setBatch(b);
    setPhase("result");
  }, []);

  const editStrategy = useCallback(() => {
    setPhase("steps");
    setStep("review");
    setReached("review");
  }, []);

  const newPlan = useCallback(() => {
    // Same strategy, new plan: start from the rhythm / topics step.
    setPhase("steps");
    setStep("content");
    setReached((r) => later(r, "content"));
    setError(null);
    setStatus("idle");
  }, []);

  const updateBatch = useCallback(
    (b: StrategyBatch) => {
      setBatch(b);
      session.updateBatch(b);
      session.rememberPlan(b);
    },
    [session],
  );

  const value = useMemo<JourneyValue>(
    () => ({
      ready, step, reached, answers, phase, status, error, batch,
      update, goTo, next, back, generate, cancel, showResult, editStrategy, newPlan, updateBatch,
    }),
    [ready, step, reached, answers, phase, status, error, batch, update, goTo, next, back, generate, cancel, showResult, editStrategy, newPlan, updateBatch],
  );

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}
