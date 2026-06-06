"use client";

/**
 * StrategistDrawer — sober slide-in drawer hosting the Strategist assistant.
 *
 * Visual restraint: white surface, 1px borders, no glow, no halo, no
 * decorative effects. The header is a simple flex row with the agent name,
 * a tiny "Max" badge (single amber accent), and a close button.
 *
 *   - Desktop (lg+): right-anchored panel, 560px wide, full height. NO drag.
 *   - Mobile: bottom-sheet 92vh, dismissible by swiping it down.
 *
 * ── Gesture dismiss (mobile only) ──────────────────────────────────────────
 * The sheet follows the finger in real time and closes on a sufficient
 * downward swipe (distance OR velocity), otherwise springs back. Implemented
 * with framer-motion's drag system in manual mode (`dragListener={false}` +
 * `useDragControls`) so we control exactly WHERE a drag may begin:
 *
 *   1. The header / grab-handle always starts a drag (the guaranteed path).
 *   2. The scrollable body starts a drag ONLY when its inner scroll is at the
 *      top and the gesture is downward — so scrolling the chat thread never
 *      dismisses the sheet by accident.
 *
 * On desktop (`lg+`) and under reduced-motion the drag is disabled entirely,
 * preserving the original slide animation with zero behavioural change.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useMotionValue,
  useTransform,
  useDragControls,
  type PanInfo,
} from "framer-motion";
import { useStrategistDrawer } from "@/contexts/StrategistDrawerContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useStrategistEligibility } from "@/hooks/strategist/useStrategistEligibility";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useHapticFeedback } from "@/hooks/ui/useHapticFeedback";
import StrategistChatPanel from "./StrategistChatPanel";
import StrategistMark from "./StrategistMark";
import StrategistActivePill from "./StrategistActivePill";

const PREMIUM_EASE = [0.22, 1, 0.36, 1] as const;

// ── Gesture thresholds (mirrors components/ui/BottomSheet.tsx) ──────────────
/** Fast flick down → dismiss regardless of distance (px/s). */
const VELOCITY_THRESHOLD = 750;
/** Slow drag past this fraction of sheet height → dismiss. */
const CLOSE_FRACTION = 0.22;
/** Below this fraction, only a moderate downward velocity still dismisses. */
const VELOCITY_ASSIST = 250;
/** Mobile breakpoint — matches the `lg:` desktop layout switch (1024px). */
const MOBILE_QUERY = "(max-width: 1023px)";
/** Min downward travel (px) before the body decides to claim a drag. */
const BODY_CLAIM_DELTA = 8;

/**
 * Walk up from `start` to `boundary` and return the first ancestor that is a
 * live vertical scroller (overflow auto/scroll + actually overflowing). Lets
 * the body-drag logic tell "user is mid-scroll" from "content is at the top".
 */
function getScrollableAncestor(
  start: Element | null,
  boundary: Element | null
): HTMLElement | null {
  let node = start as HTMLElement | null;
  while (node && node !== boundary) {
    const oy = getComputedStyle(node).overflowY;
    if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight + 1) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export default function StrategistDrawer() {
  const { isOpen, close } = useStrategistDrawer();
  const eligibility = useStrategistEligibility();
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const { trigger: haptic } = useHapticFeedback();

  // Only wire the gesture on phone-sized viewports. Desktop keeps the original
  // right-anchored slide with no drag affordances whatsoever.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const dragEnabled = isMobile && !reduced;

  const dragControls = useDragControls();
  const bodyRef = useRef<HTMLDivElement>(null);

  // Live drag offset (px, downward-positive) used to fade the backdrop so the
  // dismiss feels physically connected to the page behind it.
  const dragY = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const [sheetH, setSheetH] = useState(800);
  const backdropOpacity = useTransform(dragY, [0, sheetH * 0.6], [1, 0]);

  // Capture viewport-derived sheet height (92vh) for threshold math + backdrop
  // mapping. Recomputed on open and resize.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const measure = () => setSheetH(window.innerHeight * 0.92);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isOpen]);

  // Per-gesture bookkeeping for the body-initiated drag.
  const dragActiveRef = useRef(false);
  const gestureRef = useRef<{ y: number; target: Element | null; decided: boolean }>({
    y: 0,
    target: null,
    decided: false,
  });

  const startDragFromHeader = useCallback(
    (e: React.PointerEvent) => {
      if (!dragEnabled) return;
      // Let the close button (and any future header control) receive its tap.
      if ((e.target as Element).closest("button, a")) return;
      dragControls.start(e);
    },
    [dragEnabled, dragControls]
  );

  const onBodyPointerDown = useCallback((e: React.PointerEvent) => {
    gestureRef.current = { y: e.clientY, target: e.target as Element, decided: false };
  }, []);

  const onBodyPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragEnabled || dragActiveRef.current) return;
      const g = gestureRef.current;
      if (g.decided) return;
      const dy = e.clientY - g.y;
      if (dy < BODY_CLAIM_DELTA) return; // upward / not enough downward intent yet
      g.decided = true; // decide once per gesture, in either direction
      const scroller = getScrollableAncestor(g.target, bodyRef.current);
      // Claim the drag only when there is nothing to scroll up into — i.e. the
      // content is already at the very top. Otherwise it's a normal scroll.
      if (!scroller || scroller.scrollTop <= 0) {
        dragControls.start(e);
      }
    },
    [dragEnabled, dragControls]
  );

  const resetGesture = useCallback(() => {
    gestureRef.current.decided = false;
  }, []);

  const handleDragStart = useCallback(() => {
    dragActiveRef.current = true;
    dragY.set(0); // clear any stale offset from a prior gesture before tracking
    setIsDragging(true);
  }, [dragY]);

  const handleDrag = useCallback(
    (_e: PointerEvent, info: PanInfo) => {
      dragY.set(Math.max(0, info.offset.y));
    },
    [dragY]
  );

  const handleDragEnd = useCallback(
    (_e: PointerEvent, info: PanInfo) => {
      dragActiveRef.current = false;
      setIsDragging(false);
      gestureRef.current.decided = false;

      const offset = info.offset.y;
      const velocity = info.velocity.y;
      const shouldClose =
        velocity > VELOCITY_THRESHOLD ||
        offset > sheetH * CLOSE_FRACTION ||
        (offset > sheetH * 0.12 && velocity > VELOCITY_ASSIST);

      if (shouldClose) {
        haptic("medium");
        close(); // AnimatePresence plays the exit slide from the current offset
      } else {
        // Snap back: framer auto-springs to the {top:0,bottom:0} constraint.
        // Reset the backdrop instantly via isDragging→false fallback.
        dragY.set(0);
      }
    },
    [sheetH, haptic, close, dragY]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — quiet dim, no blur. Opacity tracks the live drag. */}
          <motion.div
            key="strategist-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={isDragging ? { opacity: backdropOpacity } : undefined}
            onClick={close}
            className="fixed inset-0 z-[100] bg-gray-900/30 dark:bg-black/55"
          />

          {/* Drawer panel */}
          <motion.aside
            key="strategist-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t.strategist.pageTitle}
            initial={reduced ? { opacity: 0 } : { y: "100%", opacity: 0.6 }}
            animate={reduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: "100%", opacity: 0.4 }}
            transition={{ duration: 0.4, ease: PREMIUM_EASE }}
            drag={dragEnabled ? "y" : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.9 }}
            dragMomentum={false}
            dragTransition={{ bounceStiffness: 450, bounceDamping: 34 }}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className="
              fixed z-[101]
              bg-white dark:bg-dark-card
              flex flex-col
              shadow-[0_0_0_1px_rgba(15,23,42,0.04),_-12px_0_40px_-20px_rgba(15,23,42,0.18)]
              dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04),_-12px_0_40px_-20px_rgba(0,0,0,0.5)]

              /* Mobile: bottom sheet */
              inset-x-0 bottom-0 top-auto
              h-[92vh]
              rounded-t-[16px]
              border-t border-gray-200 dark:border-dark-border

              /* Desktop: right-anchored drawer */
              lg:inset-y-0 lg:right-0 lg:left-auto lg:bottom-auto
              lg:h-full lg:w-[min(560px,92vw)]
              lg:rounded-t-none
              lg:border-t-0 lg:border-l lg:border-gray-200 lg:dark:border-dark-border
              overflow-hidden
            "
          >
            <DrawerHeader
              onClose={close}
              onGrabStart={startDragFromHeader}
              draggable={dragEnabled}
            />

            <div
              ref={bodyRef}
              className="flex-1 flex flex-col min-h-0"
              onPointerDown={dragEnabled ? onBodyPointerDown : undefined}
              onPointerMove={dragEnabled ? onBodyPointerMove : undefined}
              onPointerUp={dragEnabled ? resetGesture : undefined}
              onPointerCancel={dragEnabled ? resetGesture : undefined}
            >
              {eligibility.reason === "loading" ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 dark:border-gray-700 dark:border-t-gray-300 rounded-full animate-spin" />
                </div>
              ) : eligibility.reason === "no-access" ? (
                <StrategistTeaser />
              ) : eligibility.reason === "no-linkedin" ? (
                <StrategistLinkedInRequired />
              ) : (
                <StrategistChatPanel />
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Header ────────────────────────────────────────────────────────────────

function DrawerHeader({
  onClose,
  onGrabStart,
  draggable,
}: {
  onClose: () => void;
  onGrabStart: (e: React.PointerEvent) => void;
  draggable: boolean;
}) {
  const { t } = useLanguage();

  return (
    <header
      onPointerDown={draggable ? onGrabStart : undefined}
      className={`
        relative flex items-center justify-between
        px-5 py-3.5
        border-b border-gray-200 dark:border-dark-border
        ${draggable ? "lg:cursor-default cursor-grab active:cursor-grabbing touch-none select-none" : ""}
      `}
    >
      {/* Mobile grab handle — the drag affordance for swipe-to-dismiss.
          Enlarged tap zone, subtly springs on press. Hidden on desktop. */}
      <span
        aria-hidden
        className="lg:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-[4px] rounded-full bg-gray-300 dark:bg-gray-600 transition-transform duration-150 active:scale-x-90"
      />

      <div className="flex items-center gap-2 mt-1.5 lg:mt-0">
        {/* Canonical Strategist mark — single source of truth, same glyph
            as the FAB, the dropdown row, the batch cards, the banner. */}
        <StrategistMark className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
        <h2 className="text-[14px] font-medium text-gray-900 dark:text-white tracking-tight">
          {t.strategist.pageTitle}
        </h2>
        {/* Conditional "Actif" status pill — visible only when the user has
            turned on the autonomous weekly mode. Tells them at a glance
            that the agent is on duty without opening the config. */}
        <StrategistActivePill />
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="
          mt-1.5 lg:mt-0
          flex items-center justify-center w-7 h-7 rounded-md
          text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
          hover:bg-gray-100 dark:hover:bg-dark-hover
          transition-colors
        "
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </header>
  );
}

// ── Teaser (Free/Pro) ─────────────────────────────────────────────────────
// Renders the real chat panel underneath, blurred and non-interactive, so
// Free/Pro users get a real preview of the Max-only experience. A centered
// glass card explains the gate and links to /subscription.

function StrategistTeaser() {
  const { t } = useLanguage();
  const l = t.strategist.locked;

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      {/* Real panel — visible but blurred and inert */}
      <div
        aria-hidden
        className="flex-1 flex flex-col min-h-0 pointer-events-none select-none blur-[3px]"
      >
        <StrategistChatPanel />
      </div>

      {/* Lock overlay — transparent so the blurred panel reads through */}
      <div className="absolute inset-0 z-10 flex items-center justify-center px-5">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="
            w-full max-w-sm text-center
            bg-white/75 dark:bg-dark-card/75
            backdrop-blur-xl
            border border-white/60 dark:border-white/10
            rounded-xl p-6
            shadow-[0_20px_60px_-15px_rgba(15,23,42,0.35)]
          "
        >
          <span
            className="
              inline-flex items-center
              px-1.5 py-[2px] rounded
              bg-amber-50 dark:bg-amber-400/10
              text-amber-700 dark:text-amber-400
              text-[9.5px] font-semibold uppercase tracking-wider
              border border-amber-200/60 dark:border-amber-400/15
            "
          >
            {l.eyebrow}
          </span>

          <h3 className="mt-3 text-[15px] font-medium text-gray-900 dark:text-white leading-snug">
            {l.title}
          </h3>

          <p className="mt-1.5 text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
            {l.description}
          </p>

          <Link
            href="/subscription"
            className="
              mt-5 inline-flex items-center justify-center w-full
              px-4 py-2.5 rounded-lg
              bg-amber-500 hover:bg-amber-600
              text-white font-medium text-[13.5px]
              transition-colors
            "
          >
            {l.cta}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

// ── LinkedIn-required state ──────────────────────────────────────────────
// User passed the allowlist but has no LinkedIn account connected. Distinct
// from the access teaser: this is RECOVERABLE — one click → /settings →
// connect → come back. Use the same blurred-panel pattern so the affordance
// reads as a soft block, not a hard error.

function StrategistLinkedInRequired() {
  const { close } = useStrategistDrawer();
  const { connectLinkedIn } = useLinkedIn();

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      {/* Real panel — visible but blurred and inert, same as the access teaser */}
      <div
        aria-hidden
        className="flex-1 flex flex-col min-h-0 pointer-events-none select-none blur-[3px]"
      >
        <StrategistChatPanel />
      </div>

      {/* Connect overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center px-5">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="
            w-full max-w-sm text-center
            bg-white/85 dark:bg-dark-card/85
            backdrop-blur-xl
            border border-white/60 dark:border-white/10
            rounded-xl p-6
            shadow-[0_20px_60px_-15px_rgba(15,23,42,0.35)]
          "
        >
          <span
            className="
              inline-flex items-center
              px-1.5 py-[2px] rounded
              bg-blue-50 dark:bg-blue-400/10
              text-blue-700 dark:text-blue-400
              text-[9.5px] font-semibold uppercase tracking-wider
              border border-blue-200/60 dark:border-blue-400/15
            "
          >
            LinkedIn requis
          </span>

          <h3 className="mt-3 text-[15px] font-medium text-gray-900 dark:text-white leading-snug">
            Connecte ton compte LinkedIn
          </h3>

          <p className="mt-1.5 text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
            Le Stratège planifie, génère et programme des posts directement
            sur LinkedIn. Sans compte connecté, il ne sert à rien.
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                close();
                connectLinkedIn();
              }}
              className="
                inline-flex items-center justify-center gap-2
                px-4 py-2 rounded-lg
                bg-[#0A66C2] hover:bg-[#004182]
                text-white font-medium text-[13.5px]
                transition-colors shadow-sm
              "
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M19 0H5a5 5 0 00-5 5v14a5 5 0 005 5h14a5 5 0 005-5V5a5 5 0 00-5-5zM8 19H5V8h3v11zM6.5 6.7a1.8 1.8 0 110-3.6 1.8 1.8 0 010 3.6zM20 19h-3v-5.6c0-1.4-.5-2.4-1.8-2.4-1 0-1.6.7-1.9 1.4-.1.2-.1.6-.1.9V19h-3V8h3v1.3c.4-.6 1.1-1.5 2.7-1.5 2 0 3.5 1.3 3.5 4.1V19z" />
              </svg>
              Connecter LinkedIn
            </button>
            <Link
              href="/settings"
              onClick={close}
              className="
                text-[12px] text-text-muted hover:text-gray-900 dark:hover:text-white
                transition-colors
              "
            >
              Gérer mes connexions dans les paramètres
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
