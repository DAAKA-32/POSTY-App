/**
 * Posty motion system — single source of truth for easings, durations and
 * shared Framer Motion variants. Import from here instead of inlining curves
 * so the whole product moves with one voice.
 *
 * Layered model:
 *   - tokens (ease, dur)           → raw values
 *   - transitions (transition.*)   → ready-to-spread Framer transitions
 *   - variants (menuVariants…)     → opinionated variant sets for the most
 *                                    common UI patterns (dropdowns, rows,
 *                                    drawers, modals, settle…)
 *
 * Easing intent map (when in doubt, pick by feel, not by name):
 *   • enter  — element appearing on screen (menus, drawers, pages)
 *   • exit   — element leaving (closing menus, dismissed toasts)
 *   • settle — selection feedback ("text lifts then settles" / spring rest)
 *   • bounce — joyful confirmation (success, achievement)
 *   • subtle — hover / state crossfade, never elastic
 */

import type { Transition, Variants } from "framer-motion";

// ─── Tokens ────────────────────────────────────────────────────────────────

export const ease = {
  /** Premium entry curve — slight ease-out, no overshoot. */
  enter: [0.22, 1, 0.36, 1] as const,
  /** Sharp deceleration, no overshoot — best for elements leaving. */
  exit: [0.4, 0, 0.2, 1] as const,
  /** Light elastic — perfect for "settling" after a selection. */
  settle: [0.16, 1, 0.3, 1] as const,
  /** Joyful overshoot — reserve for success / celebratory feedback. */
  bounce: [0.34, 1.56, 0.64, 1] as const,
  /** Linear gentle — hover, color crossfades. */
  subtle: [0.25, 0.1, 0.25, 1] as const,
} as const;

export const dur = {
  /** Instant feedback (hover, color shift). */
  instant: 0.12,
  /** Default UI transitions. */
  fast: 0.18,
  /** Most menu / dropdown openings. */
  base: 0.24,
  /** Drawer / page transitions. */
  slow: 0.36,
  /** Heavy backdrops, modal hero animations. */
  heavy: 0.48,
} as const;

// ─── Transitions ───────────────────────────────────────────────────────────

export const transition = {
  /** Snappy spring used by dropdown content (matches the legacy AIModeSwitch feel). */
  springSnappy: {
    type: "spring",
    stiffness: 360,
    damping: 30,
    mass: 0.6,
  } satisfies Transition,
  /** Soft spring used for "settling" — text lifts then rests. */
  springSettle: {
    type: "spring",
    stiffness: 420,
    damping: 22,
    mass: 0.7,
  } satisfies Transition,
  /** Classic ease-out for menus. */
  enter: { duration: dur.base, ease: ease.enter } satisfies Transition,
  /** Faster crossfade for hover / icon swap. */
  crossfade: { duration: dur.fast, ease: ease.enter } satisfies Transition,
  /** Drawer / modal panel. */
  drawer: { duration: dur.slow, ease: ease.enter } satisfies Transition,
} as const;

// ─── Variants — dropdown / popover container ───────────────────────────────

/**
 * Menu container that grows from its trigger. Pairs with `menuRowVariants`
 * to stagger children in.
 */
export const menuContainerVariants: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      opacity: { duration: dur.fast, ease: ease.enter },
      y: transition.springSnappy,
      scale: transition.springSnappy,
      staggerChildren: 0.035,
      delayChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    y: 6,
    scale: 0.98,
    transition: { duration: dur.fast, ease: ease.exit },
  },
};

/** Individual menu row — fades up with the container's stagger. */
export const menuRowVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: dur.base, ease: ease.enter },
  },
  exit: {
    opacity: 0,
    transition: { duration: dur.instant, ease: ease.exit },
  },
};

// ─── Variants — selection settling (text lifts then rests) ────────────────

/**
 * Apply to a node that should "settle" when its selection state flips on.
 * Drive with a `key` prop equal to the active value so React replays the
 * animation on every change.
 */
export const settleVariants: Variants = {
  initial: { y: -3, opacity: 0.6 },
  animate: {
    y: 0,
    opacity: 1,
    transition: transition.springSettle,
  },
};

// ─── Variants — icon crossfade ─────────────────────────────────────────────

/**
 * Use inside <AnimatePresence mode="wait"> when an icon swaps. The outgoing
 * icon fades down, the incoming icon fades up into place.
 */
export const iconSwapVariants: Variants = {
  initial: { opacity: 0, y: -4, scale: 0.9 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transition.crossfade,
  },
  exit: {
    opacity: 0,
    y: 4,
    scale: 0.9,
    transition: { duration: dur.instant, ease: ease.exit },
  },
};

// ─── Variants — drawers / sheets ───────────────────────────────────────────

export const drawerBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: dur.fast, ease: ease.enter } },
  exit: { opacity: 0, transition: { duration: dur.fast, ease: ease.exit } },
};

export const drawerPanelVariants: Variants = {
  hidden: { y: "100%", opacity: 0.6 },
  visible: { y: 0, opacity: 1, transition: transition.drawer },
  exit: { y: "100%", opacity: 0.4, transition: { duration: dur.slow, ease: ease.exit } },
};

// ─── Variants — sidebar nav and conversation rows ─────────────────────────

/**
 * Smooth easing curve used by both desktop and mobile sidebars for nav and
 * conversation item stagger animations. Kept here so the two sidebar codepaths
 * cannot drift apart.
 */
export const sidebarSmoothEase = [0.25, 0.1, 0.25, 1] as const;

/**
 * Nav item stagger — each item fades up from x: -8 with a small per-index
 * delay so the list reads as a wave. Use with `custom={index}` and
 * `variants={navItemVariants}`.
 */
export const navItemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.25,
      delay: 0.08 + i * 0.04,
      ease: sidebarSmoothEase,
    },
  }),
};

/**
 * Conversation row stagger — same shape as navItemVariants but tighter delay
 * since there are typically more items.
 */
export const conversationItemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      delay: i * 0.03,
      ease: sidebarSmoothEase,
    },
  }),
};

// ─── Whileful presets — for inline use on motion buttons ───────────────────

/**
 * Primary interactive button — used on actionable CTAs.
 * The slight `y` lift on hover reads as "alive" without being flashy.
 */
export const interactivePrimary = {
  whileHover: { y: -1, scale: 1.01 },
  whileTap: { scale: 0.97, y: 0 },
  transition: transition.springSettle,
} as const;

/**
 * Subtle button — used for icon buttons, copy/share/menu actions.
 * Scale only, no lift, to avoid layout shifts inside dense rows.
 */
export const interactiveSubtle = {
  whileHover: { scale: 1.06 },
  whileTap: { scale: 0.94 },
  transition: transition.springSettle,
} as const;

/**
 * Row press — for list rows / nav items / conversation items that should
 * "depress" on tap without being interpreted as a button bounce.
 */
export const interactiveRow = {
  whileHover: { x: 1 },
  whileTap: { scale: 0.985, x: 0 },
  transition: transition.springSettle,
} as const;
