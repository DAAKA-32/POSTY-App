"use client";

/**
 * MobileModeSelector — the in-navbar mode switcher (mobile only).
 *
 * Replaces the old "chip above the input" on phones. It lives inside
 * PersistentMobileHeader, right after the logo, and reads/writes the SHARED
 * AIModeContext — the exact same state the desktop toolbar drives. No business
 * logic is duplicated here; this is purely a mobile-shaped view of that state.
 *
 * Hierarchy exposed:
 *   MODE  → Posts (→ Business / Storytelling) · Support · Strategist
 *
 * The trigger reads "Posty Posts ⌄" / "Posty Support ⌄", and "Posty Strategist"
 * while the Strategist drawer is open. Tapping opens a premium popover; picking
 * a mode closes it, picking a post style keeps it open (it's a refinement of
 * the already-selected Posts mode).
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PenLine, HelpCircle, ChevronDown, Check, Briefcase, MessageSquare } from "lucide-react";
import StrategistMark from "@/components/strategist/StrategistMark";
import { useAIMode, type PostStyle } from "@/contexts/AIModeContext";
import { useStrategistDrawer } from "@/contexts/StrategistDrawerContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { isStrategistEnabled } from "@/lib/config/feature-flags";
import { menuContainerVariants, menuRowVariants, transition } from "@/lib/motion";

type ActiveMode = "posts" | "support" | "strategist";

// Short, plan-agnostic copy. Labels stay proper-noun-like across locales (the
// existing AIModeSwitch does the same); descriptions get a fr/en split with an
// English fallback for the rarer locales.
const COPY = {
  fr: {
    posts: "Créer et publier",
    support: "Aide et réponses",
    strategist: "Stratégie et pilotage",
    changeMode: "Changer de mode",
    format: "Format du post",
  },
  en: {
    posts: "Create & publish",
    support: "Get help & answers",
    strategist: "Strategy & insights",
    changeMode: "Change mode",
    format: "Post format",
  },
} as const;

export default function MobileModeSelector() {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { aiMode, setAiMode, postType, setPostType } = useAIMode();
  const strategist = useStrategistDrawer();
  const strategistEnabled = isStrategistEnabled();

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const copy = COPY[language === "fr" ? "fr" : "en"];

  // The Strategist is a drawer, not a persona — but while it's open we surface
  // it as the active mode so the navbar honestly reflects what the user sees.
  const activeMode: ActiveMode = strategist.isOpen ? "strategist" : aiMode;
  const modeLabel =
    activeMode === "strategist" ? "Strategist" : activeMode === "support" ? "Support" : "Posts";

  // Close on outside tap + Escape (mirrors AIModeSwitch's behaviour).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close on any route change (covers in-app navigation + the mobile back
  // button, which changes pathname within the SPA).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const selectMode = (next: "posts" | "support") => {
    const changed = next !== aiMode || strategist.isOpen;
    setAiMode(next);
    // If the Strategist drawer was open, picking a chat persona means the user
    // wants the chat back — close the drawer so it doesn't stay over the page.
    if (strategist.isOpen) strategist.close();
    // Only close on a real switch. Re-tapping the already-active Posts row keeps
    // the popover open so the user can reach its inline format toggle.
    if (changed) setOpen(false);
  };

  const openStrategist = () => {
    setOpen(false);
    // The drawer owns its own access / connect-LinkedIn gating screens.
    strategist.open();
  };

  const selectStyle = (style: PostStyle) => {
    setPostType(style);
    // Keep the popover open — style is a refinement of the Posts mode, not a
    // top-level switch. Closing here would feel abrupt.
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger — "Posty {Mode} ⌄" */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={copy.changeMode}
        whileTap={{ scale: 0.97 }}
        transition={transition.springSnappy}
        className={`
          flex items-center gap-1.5 h-9 min-h-[36px] pl-1 pr-2 rounded-lg
          text-gray-900 dark:text-white
          transition-colors duration-150
          hover:bg-black/[0.04] dark:hover:bg-white/[0.06]
          ${open ? "bg-black/[0.04] dark:bg-white/[0.06]" : ""}
        `}
      >
        <span className="font-bold text-base sm:text-lg tracking-tight whitespace-nowrap">
          {/* "Posty" is dropped only on ultra-narrow screens (<360px) so the
              label never crowds the logo / hamburger. */}
          <span className="max-[359px]:hidden">Posty </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={modeLabel}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block text-primary"
            >
              {modeLabel}
            </motion.span>
          </AnimatePresence>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={transition.springSnappy}
          className="inline-flex text-text-muted"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </motion.button>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            variants={menuContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              // Sits just under the mobile header bar, centered in the VIEWPORT
              // (not anchored to the trigger) so it can never clip on the right
              // edge of very small screens. Centering via left/right + mx-auto —
              // NOT a transform — leaves framer free to animate scale/opacity.
              top: "calc(3.5rem + env(safe-area-inset-top, 0px) + 0.5rem)",
              transformOrigin: "top center",
              willChange: "transform, opacity",
            }}
            className="
              fixed left-0 right-0 mx-auto
              w-[min(340px,calc(100vw-1rem))]
              bg-white dark:bg-dark-card
              border border-gray-200 dark:border-dark-border
              rounded-2xl
              shadow-[0_18px_50px_-12px_rgba(15,23,42,0.28)]
              dark:shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)]
              overflow-hidden z-50 p-1.5
            "
          >
            {/* Posts — when it's the active persona, the post format
                (Business / Storytelling) sits INLINE on the right of this row.
                Otherwise it's a plain clickable row that switches to Posts. */}
            {activeMode === "posts" ? (
              <motion.div
                variants={menuRowVariants}
                className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 bg-gray-50 dark:bg-white/[0.06]"
              >
                <button
                  type="button"
                  onClick={() => selectMode("posts")}
                  aria-label="Posts"
                  className="flex items-center gap-3 flex-shrink-0 text-left cursor-pointer"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 bg-primary/15 text-primary">
                    <PenLine className="w-4 h-4" />
                  </span>
                  {/* Description is dropped here — once Posts is active it's
                      redundant and the space goes to the inline format toggle. */}
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Posts</span>
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  </span>
                </button>

                {/* Inline post-format toggle, right-aligned. Labels collapse to
                    icons on very narrow screens so the row never overflows. */}
                <div className="ml-auto flex items-center gap-0.5 p-0.5 rounded-lg bg-white dark:bg-white/[0.04] ring-1 ring-black/[0.05] dark:ring-white/[0.08] flex-shrink-0">
                  <StylePill
                    Icon={Briefcase}
                    label={t.chat.business}
                    active={postType === "business"}
                    onClick={() => selectStyle("business")}
                  />
                  <StylePill
                    Icon={MessageSquare}
                    label={t.chat.storytelling}
                    active={postType === "storytelling"}
                    onClick={() => selectStyle("storytelling")}
                  />
                </div>
              </motion.div>
            ) : (
              <ModeRow
                Icon={PenLine}
                label="Posts"
                description={copy.posts}
                accent="text-primary"
                activeBg="bg-primary/15"
                active={false}
                onClick={() => selectMode("posts")}
              />
            )}

            {/* Support */}
            <ModeRow
              Icon={HelpCircle}
              label="Support"
              description={copy.support}
              accent="text-emerald-600 dark:text-emerald-400"
              activeBg="bg-emerald-500/15"
              active={activeMode === "support"}
              onClick={() => selectMode("support")}
            />

            {/* Strategist — feature-flag gated (the drawer handles access +
                connect-LinkedIn screens itself). */}
            {strategistEnabled && (
              <ModeRow
                Icon={StrategistMark}
                label="Strategist"
                description={copy.strategist}
                accent="text-amber-600 dark:text-amber-400"
                activeBg="bg-amber-500/15"
                active={activeMode === "strategist"}
                onClick={openStrategist}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Rows ────────────────────────────────────────────────────────────────────

function ModeRow({
  Icon,
  label,
  description,
  accent,
  activeBg,
  active,
  onClick,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  accent: string;
  activeBg: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      role="menuitemradio"
      aria-checked={active}
      variants={menuRowVariants}
      whileTap={{ scale: 0.98 }}
      className={`
        w-full text-left px-2.5 py-2.5 rounded-xl
        flex items-center gap-3 cursor-pointer
        transition-colors duration-150
        ${active
          ? "bg-gray-50 dark:bg-white/[0.06]"
          : "hover:bg-gray-50/70 dark:hover:bg-white/[0.04]"}
      `}
    >
      <span
        className={`
          flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0
          ${active ? `${activeBg} ${accent}` : "bg-gray-100 dark:bg-dark-elevated text-text-muted"}
        `}
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold ${
              active ? "text-gray-900 dark:text-white" : "text-text-secondary"
            }`}
          >
            {label}
          </span>
          {active && <Check className={`w-4 h-4 ${accent}`} />}
        </div>
        <p className="text-xs text-text-muted mt-0.5 leading-snug truncate">{description}</p>
      </div>
    </motion.button>
  );
}

function StylePill({
  Icon,
  label,
  active,
  onClick,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`
        relative flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md
        text-[12px] font-semibold cursor-pointer transition-colors duration-200
        ${active ? "text-primary" : "text-text-muted hover:text-text-secondary"}
      `}
    >
      {active && (
        <motion.span
          layoutId="mobileStyleIndicator"
          className="absolute inset-0 rounded-md bg-primary/10 ring-1 ring-primary/30"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="max-[359px]:hidden">{label}</span>
      </span>
    </button>
  );
}
