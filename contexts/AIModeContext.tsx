"use client";

/**
 * AIModeContext — the single source of truth for the chat persona + post style.
 *
 * These four pieces of state used to live, DUPLICATED, as local `useState` in
 * BOTH chat pages (app/app/page.tsx and app/app/c/[id]/page.tsx). Lifting them
 * here does two things:
 *
 *   1. De-duplicates: one definition, both pages consume it.
 *   2. Lets the PERSISTENT mobile header (which lives in the root layout, above
 *      every page) drive the same state the chat toolbar drives on desktop —
 *      so the new in-navbar mobile selector and the desktop toolbar are two
 *      views of ONE state, never two parallel implementations.
 *
 * What lives here:
 *   - aiMode        "posts" | "support"     (top-level persona)
 *   - selectedStyle "storytelling"|"business" (Pro/Free post style)
 *   - maxMode       "dual"|"storytelling"|"business" (Max plan style selector)
 *
 * `dualMode` (Pro weekly dual toggle) intentionally stays page-local — it's a
 * desktop-only advanced control the mobile navbar never surfaces, so there's no
 * reason to hoist it.
 *
 * Plan-aware convenience view for the mobile navbar:
 *   - postType / setPostType — normalises "the current business/storytelling
 *     choice" across plans so the navbar doesn't have to branch on the plan.
 *     Max plan → maps onto `maxMode`; Pro/Free → maps onto `selectedStyle`.
 *     This mirrors the `effectiveStyle` derivation the chat pages already do.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";
import type { AIMode } from "@/components/chat/AIModeSwitch";
import { useSubscription } from "@/contexts/SubscriptionContext";

export type PostStyle = "storytelling" | "business";
export type MaxMode = "dual" | "storytelling" | "business";
export type { AIMode };

interface AIModeContextValue {
  aiMode: AIMode;
  setAiMode: (mode: AIMode) => void;

  selectedStyle: PostStyle;
  setSelectedStyle: (style: PostStyle) => void;

  maxMode: MaxMode;
  setMaxMode: (mode: MaxMode) => void;

  /** Plan-aware business/storytelling choice — the value the mobile navbar
   *  shows and toggles without knowing the plan. */
  postType: PostStyle;
  setPostType: (style: PostStyle) => void;
}

const AIModeContext = createContext<AIModeContextValue | null>(null);

export function AIModeProvider({ children }: { children: ReactNode }) {
  const { isMaxPlan } = useSubscription();

  // Same initial values the two chat pages used before centralisation.
  const [aiMode, setAiMode] = useState<AIMode>("posts");
  const [selectedStyle, setSelectedStyle] = useState<PostStyle>("business");
  const [maxMode, setMaxMode] = useState<MaxMode>("dual");

  // Plan-aware normalisation — matches the pages' effectiveStyle mapping:
  // Max "dual" has no single style, so we present it as "business".
  const postType: PostStyle = isMaxPlan
    ? maxMode === "dual"
      ? "business"
      : maxMode
    : selectedStyle;

  const setPostType = useCallback(
    (style: PostStyle) => {
      if (isMaxPlan) setMaxMode(style);
      else setSelectedStyle(style);
    },
    [isMaxPlan],
  );

  const value = useMemo<AIModeContextValue>(
    () => ({
      aiMode,
      setAiMode,
      selectedStyle,
      setSelectedStyle,
      maxMode,
      setMaxMode,
      postType,
      setPostType,
    }),
    [aiMode, selectedStyle, maxMode, postType, setPostType],
  );

  return <AIModeContext.Provider value={value}>{children}</AIModeContext.Provider>;
}

export function useAIMode(): AIModeContextValue {
  const ctx = useContext(AIModeContext);
  if (!ctx) {
    throw new Error("useAIMode must be used within an <AIModeProvider>.");
  }
  return ctx;
}
