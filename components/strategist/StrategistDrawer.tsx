"use client";

/**
 * StrategistDrawer — the drawer hosting the Strategist.
 *
 *   - Desktop (lg+): right-anchored panel, 560px wide, full height. NO drag.
 *   - Mobile: bottom-sheet 92% of the viewport, dismissible by swiping it down.
 *   (Placement and open animation are a product constraint — unchanged.)
 *
 * The conversation lives in <StrategistSessionProvider>, mounted HERE, outside
 * the animated content: closing the drawer (backdrop, Esc, swipe) no longer
 * wipes the conversation or the plans in it.
 *
 * ── Gesture dismiss (mobile only) ──────────────────────────────────────────
 * framer-motion drag in manual mode (`dragListener={false}` + useDragControls)
 * so we control exactly WHERE a drag may begin — framer must never set
 * touch-action on the aside or the thread could not scroll:
 *   1. The header / grab-handle always starts a drag.
 *   2. The scrollable body starts a drag ONLY when its inner scroll is at the
 *      top and the gesture is downward — and never from a field or a control
 *      marked data-no-drag (sliders, date inputs, text areas).
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  MotionConfig,
  useReducedMotion,
  useMotionValue,
  useTransform,
  useDragControls,
  type PanInfo,
} from "framer-motion";
import { ArrowLeft, SlidersHorizontal, SquarePen, X } from "lucide-react";
import { useStrategistDrawer } from "@/contexts/StrategistDrawerContext";
import { useStrategistEligibility } from "@/hooks/strategist/useStrategistEligibility";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useHapticFeedback } from "@/hooks/ui/useHapticFeedback";
import { useFocusTrap } from "@/hooks/input/useFocusTrap";
import { useKeyboardHeight } from "@/hooks/input/useKeyboardHeight";
import { useStrategistCopy } from "@/lib/strategist/copy";
import StrategistChatPanel from "./StrategistChatPanel";
import StrategistSettingsView from "./StrategistSettingsView";
import StrategistMark from "./StrategistMark";
import StrategistActivePill from "./StrategistActivePill";
import { StrategistSessionProvider, useStrategistSession } from "./StrategistSession";
import { IconButton } from "./ui";

const PREMIUM_EASE = [0.22, 1, 0.36, 1] as const;

// ── Gesture thresholds (mirrors components/ui/BottomSheet.tsx) ──────────────
const VELOCITY_THRESHOLD = 750;
const CLOSE_FRACTION = 0.22;
const VELOCITY_ASSIST = 250;
const MOBILE_QUERY = "(max-width: 1023px)";
const BODY_CLAIM_DELTA = 8;

function getScrollableAncestor(start: Element | null, boundary: Element | null): HTMLElement | null {
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

/** A drag must never start from a field or a control that handles its own drag. */
function isNoDragTarget(target: Element | null): boolean {
  return !!target?.closest("input, textarea, select, [contenteditable='true'], [data-no-drag]");
}

export default function StrategistDrawer() {
  return (
    <StrategistSessionProvider>
      <DrawerShell />
    </StrategistSessionProvider>
  );
}

function DrawerShell() {
  const { isOpen, close } = useStrategistDrawer();
  const { c } = useStrategistCopy();
  const reduced = useReducedMotion();
  const { trigger: haptic } = useHapticFeedback();

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

  const dragY = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const [sheetH, setSheetH] = useState(800);
  const backdropOpacity = useTransform(dragY, [0, sheetH * 0.6], [1, 0]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const measure = () => setSheetH(window.innerHeight * 0.92);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isOpen]);

  const dragActiveRef = useRef(false);
  const gestureRef = useRef<{ y: number; target: Element | null; decided: boolean }>({
    y: 0,
    target: null,
    decided: false,
  });

  const startDragFromHeader = useCallback(
    (e: React.PointerEvent) => {
      if (!dragEnabled) return;
      if ((e.target as Element).closest("button, a")) return;
      dragControls.start(e);
    },
    [dragEnabled, dragControls]
  );

  const onBodyPointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as Element;
    gestureRef.current = { y: e.clientY, target, decided: isNoDragTarget(target) };
  }, []);

  const onBodyPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragEnabled || dragActiveRef.current) return;
      const g = gestureRef.current;
      if (g.decided) return;
      const dy = e.clientY - g.y;
      if (dy < BODY_CLAIM_DELTA) return;
      g.decided = true;
      const scroller = getScrollableAncestor(g.target, bodyRef.current);
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
    dragY.set(0);
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
        close();
      } else {
        dragY.set(0);
      }
    },
    [sheetH, haptic, close, dragY]
  );

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="strategist-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={isDragging ? { opacity: backdropOpacity } : undefined}
              onClick={close}
              aria-hidden
              className="fixed inset-0 z-[100] bg-gray-900/30 dark:bg-black/55"
            />
            <DrawerPanel
              label={c.title}
              reduced={!!reduced}
              isMobile={isMobile}
              dragEnabled={dragEnabled}
              dragControls={dragControls}
              onDragStart={handleDragStart}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              onGrabStart={startDragFromHeader}
              bodyRef={bodyRef}
              onBodyPointerDown={dragEnabled ? onBodyPointerDown : undefined}
              onBodyPointerMove={dragEnabled ? onBodyPointerMove : undefined}
              onBodyPointerEnd={dragEnabled ? resetGesture : undefined}
            />
          </>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

function DrawerPanel(props: {
  label: string;
  reduced: boolean;
  isMobile: boolean;
  dragEnabled: boolean;
  dragControls: ReturnType<typeof useDragControls>;
  onDragStart: () => void;
  onDrag: (e: PointerEvent, info: PanInfo) => void;
  onDragEnd: (e: PointerEvent, info: PanInfo) => void;
  onGrabStart: (e: React.PointerEvent) => void;
  bodyRef: React.RefObject<HTMLDivElement | null>;
  onBodyPointerDown?: (e: React.PointerEvent) => void;
  onBodyPointerMove?: (e: React.PointerEvent) => void;
  onBodyPointerEnd?: () => void;
}) {
  const eligibility = useStrategistEligibility();
  const { view } = useStrategistSession();
  // Focus stays inside the dialog and returns to the trigger on close. The
  // container takes initial focus so the mobile keyboard doesn't pop up.
  const trapRef = useFocusTrap<HTMLElement>({ initialFocus: "container", returnFocus: true });
  const { keyboardHeight } = useKeyboardHeight();
  const kbPad = props.isMobile && keyboardHeight > 0 ? keyboardHeight : 0;

  return (
    <motion.aside
      ref={trapRef}
      key="strategist-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="strategist-drawer-title"
      tabIndex={-1}
      initial={props.reduced ? { opacity: 0 } : { y: "100%", opacity: 0.6 }}
      animate={props.reduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
      exit={props.reduced ? { opacity: 0 } : { y: "100%", opacity: 0.4 }}
      transition={{ duration: 0.4, ease: PREMIUM_EASE }}
      drag={props.dragEnabled ? "y" : false}
      dragControls={props.dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.04, bottom: 0.9 }}
      dragMomentum={false}
      dragTransition={{ bounceStiffness: 450, bounceDamping: 34 }}
      onDragStart={props.onDragStart}
      onDrag={props.onDrag}
      onDragEnd={props.onDragEnd}
      style={kbPad ? { paddingBottom: kbPad } : undefined}
      className="
        fixed z-[101]
        bg-white dark:bg-dark-card
        flex flex-col outline-none
        focus-visible:outline-none focus-visible:rounded-t-[16px] lg:focus-visible:rounded-none
        shadow-[0_0_0_1px_rgba(15,23,42,0.04),_-12px_0_40px_-20px_rgba(15,23,42,0.18)]
        dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04),_-12px_0_40px_-20px_rgba(0,0,0,0.5)]

        inset-x-0 bottom-0 top-auto
        h-[92vh] supports-[height:100dvh]:h-[92dvh]
        rounded-t-[16px]
        border-t border-gray-200 dark:border-dark-border

        lg:inset-y-0 lg:right-0 lg:left-auto lg:bottom-auto
        lg:h-full lg:supports-[height:100dvh]:h-full lg:w-[min(560px,92vw)]
        lg:rounded-t-none
        lg:border-t-0 lg:border-l lg:border-gray-200 lg:dark:border-dark-border
        overflow-hidden
      "
    >
      <DrawerHeader
        onGrabStart={props.onGrabStart}
        draggable={props.dragEnabled}
        showActions={eligibility.reason === "ok"}
      />
      <div
        ref={props.bodyRef}
        className="flex-1 flex flex-col min-h-0"
        onPointerDown={props.onBodyPointerDown}
        onPointerMove={props.onBodyPointerMove}
        onPointerUp={props.onBodyPointerEnd}
        onPointerCancel={props.onBodyPointerEnd}
      >
        {eligibility.reason === "loading" ? (
          <div className="flex-1 flex items-center justify-center" role="status" aria-label="…">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 dark:border-gray-700 dark:border-t-gray-300 rounded-full animate-spin motion-reduce:animate-none" />
          </div>
        ) : eligibility.reason === "no-access" ? (
          <StrategistTeaser />
        ) : eligibility.reason === "no-linkedin" ? (
          <StrategistLinkedInRequired />
        ) : view === "settings" ? (
          <StrategistSettingsView />
        ) : (
          <StrategistChatPanel />
        )}
      </div>
    </motion.aside>
  );
}

// ── Header ────────────────────────────────────────────────────────────────

function DrawerHeader({
  onGrabStart,
  draggable,
  showActions,
}: {
  onGrabStart: (e: React.PointerEvent) => void;
  draggable: boolean;
  showActions: boolean;
}) {
  const { close } = useStrategistDrawer();
  const { c } = useStrategistCopy();
  const { view, setView, messages, newChat } = useStrategistSession();
  const inSettings = view === "settings";

  return (
    <header
      onPointerDown={draggable ? onGrabStart : undefined}
      className={`
        relative flex items-center justify-between gap-2
        pl-4 pr-2 pt-3 pb-2 lg:py-2
        border-b border-gray-200 dark:border-dark-border
        ${draggable ? "cursor-grab active:cursor-grabbing touch-none select-none" : ""}
      `}
    >
      <span
        aria-hidden
        className="lg:hidden absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-[4px] rounded-full bg-gray-300 dark:bg-gray-600"
      />

      {inSettings ? (
        <div className="flex items-center gap-1 min-w-0 -ml-2">
          <IconButton label={c.back} onClick={() => setView("chat")}>
            <ArrowLeft className="w-[18px] h-[18px]" />
          </IconButton>
          <h2 id="strategist-drawer-title" className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
            {c.settings.title}
          </h2>
        </div>
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          <StrategistMark className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <h2 id="strategist-drawer-title" className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
            {c.title}
          </h2>
          <StrategistActivePill />
        </div>
      )}

      <div className="flex items-center">
        {showActions && !inSettings && messages.length > 0 && (
          <IconButton label={c.newChat} onClick={newChat}>
            <SquarePen className="w-[18px] h-[18px]" />
          </IconButton>
        )}
        {showActions && !inSettings && (
          <IconButton label={c.openSettings} onClick={() => setView("settings")}>
            <SlidersHorizontal className="w-[18px] h-[18px]" />
          </IconButton>
        )}
        <IconButton label={c.close} onClick={close}>
          <X className="w-[18px] h-[18px]" />
        </IconButton>
      </div>
    </header>
  );
}

// ── Gate screens ──────────────────────────────────────────────────────────
// A static, inert preview sits behind the gate card (not a live chat panel:
// that used to run Firestore reads and leave focusable controls behind it).

function GatePreview() {
  return (
    <div aria-hidden inert className="flex-1 px-5 pt-10 space-y-4 select-none blur-[2px] opacity-70">
      <div className="h-6 w-2/3 rounded bg-gray-200 dark:bg-dark-elevated" />
      <div className="h-4 w-5/6 rounded bg-gray-100 dark:bg-dark-elevated/70" />
      <div className="h-20 rounded-xl border border-gray-200 dark:border-dark-border" />
      <div className="h-12 rounded-xl border border-gray-200 dark:border-dark-border" />
      <div className="h-12 rounded-xl border border-gray-200 dark:border-dark-border" />
    </div>
  );
}

function GateCard({
  eyebrow,
  title,
  desc,
  children,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <GatePreview />
      <div className="absolute inset-0 z-10 flex items-center justify-center px-5">
        <div className="w-full max-w-sm text-center bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-lg">
          <p className="text-[12px] font-medium text-amber-700 dark:text-amber-400">{eyebrow}</p>
          <h3 className="mt-2 text-[17px] font-semibold text-gray-900 dark:text-white leading-snug">{title}</h3>
          <p className="mt-2 text-[14px] text-gray-600 dark:text-gray-300 leading-relaxed">{desc}</p>
          <div className="mt-5 flex flex-col gap-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

function StrategistTeaser() {
  const { c } = useStrategistCopy();
  const { close } = useStrategistDrawer();
  return (
    <GateCard eyebrow={c.gate.lockedEyebrow} title={c.gate.lockedTitle} desc={c.gate.lockedDesc}>
      <Link
        href="/business"
        onClick={close}
        className="inline-flex items-center justify-center h-11 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-900 font-semibold text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-card"
      >
        {c.gate.lockedCta}
      </Link>
    </GateCard>
  );
}

function StrategistLinkedInRequired() {
  const { c } = useStrategistCopy();
  const { close } = useStrategistDrawer();
  const { connectLinkedIn } = useLinkedIn();
  return (
    <GateCard eyebrow={c.gate.linkedinEyebrow} title={c.gate.linkedinTitle} desc={c.gate.linkedinDesc}>
      <button
        type="button"
        onClick={() => {
          close();
          connectLinkedIn();
        }}
        className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white/100 font-semibold text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-card"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
          <path d="M19 0H5a5 5 0 00-5 5v14a5 5 0 005 5h14a5 5 0 005-5V5a5 5 0 00-5-5zM8 19H5V8h3v11zM6.5 6.7a1.8 1.8 0 110-3.6 1.8 1.8 0 010 3.6zM20 19h-3v-5.6c0-1.4-.5-2.4-1.8-2.4-1 0-1.6.7-1.9 1.4-.1.2-.1.6-.1.9V19h-3V8h3v1.3c.4-.6 1.1-1.5 2.7-1.5 2 0 3.5 1.3 3.5 4.1V19z" />
        </svg>
        {c.gate.linkedinCta}
      </button>
      <Link
        href="/settings"
        onClick={close}
        className="inline-flex items-center justify-center h-10 text-[13px] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline-offset-4 hover:underline"
      >
        {c.gate.linkedinSettings}
      </Link>
    </GateCard>
  );
}
