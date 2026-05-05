"use client";

/**
 * ROISimulator — premium qualitative ROI calculator.
 *
 * UX hierarchy:
 *   1. Hero result panel (top): big revenue number + animated 12-month bar
 *      chart + 3 secondary stats (leads/mo, payback days, ROI multiplier).
 *   2. Controls panel (bottom): chip selectors for posts/week and client
 *      value, plus a single slider for leads-per-post.
 *   3. Dynamic CTA that interpolates the projected annual revenue into the
 *      button label so every adjustment feels earned.
 *
 * Math (conservative LinkedIn benchmarks):
 *   • posts/month  = postsPerWeek × 4.33
 *   • leads/month  = posts/month × leadsPerPost
 *   • new clients  = leads × 4 % conversion (warm-lead industry baseline)
 *   • revenue/mo   = new clients × clientValue
 *   • revenue/year = revenue/mo × 12
 *   • payback days = (Posty annual cost / revenue/mo) × 30
 *   • ROI mult     = revenue/mo / Posty monthly cost
 *
 * Framer Motion footprint:
 *   - useSpring drives every counter (smooth count-up, never glitchy).
 *   - Chip selection uses layoutId for a single moving "pill" indicator.
 *   - Bar chart bars animate height with spring + per-bar stagger so the
 *     reshape reads as a *wave* across the year.
 *   - whileInView on the section orchestrates entrance reveals.
 */

import {
  motion,
  useSpring,
  useMotionValueEvent,
  useReducedMotion,
  LayoutGroup,
} from "framer-motion";
import Link from "next/link";
import { useEffect, useState, useMemo, memo, useCallback } from "react";
import { AmbientDecorations } from "@/components/landing/AmbientDecorations";

const ACCENT = "#F8935D";
const ACCENT_DEEP = "#F76B54";
const POSTY_MONTHLY_COST = 12.9;
const POSTY_ANNUAL_COST = POSTY_MONTHLY_COST * 12;
const EASE = [0.22, 1, 0.36, 1] as const;

// Discrete chip values
const POSTS_PER_WEEK_OPTIONS = [1, 2, 3, 4, 5, 7] as const;
const CLIENT_VALUE_OPTIONS = [500, 1000, 2500, 5000, 10000] as const;

/* ───────────────────────── helpers ───────────────────────── */

/**
 * Smooth count-up via Framer Motion useSpring. Bails out when the rounded
 * value hasn't changed so we don't burn React state updates on every frame
 * once the spring stabilizes near the target.
 */
function useAnimatedNumber(
  target: number,
  config: { stiffness?: number; damping?: number; mass?: number } = {
    stiffness: 90,
    damping: 20,
    mass: 0.6,
  },
) {
  const reduced = useReducedMotion();
  const spring = useSpring(target, config);
  const [display, setDisplay] = useState(target);
  useEffect(() => {
    if (reduced) {
      setDisplay(target);
      return;
    }
    spring.set(target);
  }, [target, spring, reduced]);
  useMotionValueEvent(spring, "change", (v) => {
    if (reduced) return;
    const rounded = Math.round(v);
    // Only setState when the displayed integer actually changes — avoids
    // ~60 setState calls/sec while the spring is mid-transit but the rounded
    // value is unchanged (e.g. animating across decimals).
    setDisplay((prev) => (prev === rounded ? prev : rounded));
  });
  return display;
}

/**
 * Isolated counter component — ANY spring updates rerender ONLY this leaf,
 * not the parent ROISimulator (which has 5 counters). Without this, every
 * spring-driven counter would force a parent rerender at ~60fps × 5 ≈
 * hundreds of rerenders/second during a slider drag, producing the lag the
 * user reported.
 */
const AnimatedNumber = memo(function AnimatedNumber({
  value,
  format = formatEUR,
  springConfig,
}: {
  value: number;
  format?: (n: number) => string;
  springConfig?: { stiffness?: number; damping?: number; mass?: number };
}) {
  const display = useAnimatedNumber(value, springConfig);
  return <>{format(display)}</>;
});

function formatEUR(n: number) {
  return n.toLocaleString("fr-FR");
}

function formatClientValue(n: number) {
  if (n >= 1000) return `${n / 1000}K€`;
  return `${n}€`;
}

const REVENUE_SPRING = { stiffness: 70, damping: 22, mass: 0.7 };

/* ──────────────────── chip selector ──────────────────── */

// Memoized so it doesn't re-render when the parent re-renders for unrelated
// reasons (e.g. another counter ticking). React.memo here is generic-friendly
// because the function uses a generic T — we cast at the export site below.
function ChipGroupBase<T extends number>({
  options,
  value,
  onChange,
  format,
  ariaLabel,
  groupId,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format: (v: T) => string;
  ariaLabel: string;
  groupId: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-1.5 p-1 bg-gray-50 rounded-xl ring-1 ring-gray-100"
    >
      <LayoutGroup id={groupId}>
        {options.map((opt) => {
          const selected = opt === value;
          return (
            <button
              key={opt}
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt)}
              style={{
                color: selected ? "#ffffff" : "#4b5563",
                WebkitTextFillColor: selected ? "#ffffff" : "#4b5563",
              }}
              className="relative flex-1 min-w-[44px] py-2 px-3 text-[13px] font-semibold tabular-nums rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F8935D]/40"
            >
              {selected && (
                <motion.span
                  layoutId={`chip-bg-${groupId}`}
                  aria-hidden
                  className="absolute inset-0 rounded-lg bg-gray-900 shadow-[0_2px_6px_-2px_rgba(15,23,42,0.25)]"
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                />
              )}
              {/* Text color flips INSTANTLY (no transition-colors) — otherwise
                  the 200ms color fade would briefly leave dark text sitting
                  on top of the dark pill that just slid into place via
                  layoutId, making the value invisible mid-transition.
                  Inline `color` + `-webkit-text-fill-color` forces the value
                  through (1) global CSS (button defaults, dark-mode resets)
                  and (2) iOS Safari's UA stylesheet, which under system dark
                  mode tints button descendants via `-webkit-text-fill-color`
                  and previously left the selected chip text rendering gray on
                  real iPhones (devtools mobile preview did NOT reproduce). */}
              <span
                className="relative z-10"
                style={{
                  color: selected ? "#ffffff" : "#4b5563",
                  WebkitTextFillColor: selected ? "#ffffff" : "#4b5563",
                }}
              >
                {format(opt)}
              </span>
            </button>
          );
        })}
      </LayoutGroup>
    </div>
  );
}

// memo() drops the generic — re-cast at the export so callers keep type safety.
const ChipGroup = memo(ChipGroupBase) as typeof ChipGroupBase;

/* ──────────────────── compact slider ──────────────────── */

const Slider = memo(function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  ariaValueText,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  ariaValueText: string;
  onChange: (v: number) => void;
}) {
  const [active, setActive] = useState(false);
  const reduced = useReducedMotion();
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2.5">
        <label className="text-[13px] font-medium text-gray-700">{label}</label>
        <span className="text-[15px] font-bold tabular-nums text-gray-900">
          {value}
          <span className="text-[12px] text-gray-400 font-normal ml-0.5">
            {suffix}
          </span>
        </span>
      </div>
      <div className="relative h-5 flex items-center select-none">
        <div className="absolute inset-x-0 h-1.5 bg-gray-100 rounded-full" />
        <motion.div
          className="absolute h-1.5 rounded-full bg-gray-900"
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 220, damping: 30 }}
        />
        <motion.div
          className="absolute w-[18px] h-[18px] rounded-full bg-white border-[2.5px] border-gray-900 pointer-events-none"
          animate={
            reduced
              ? { left: `calc(${pct}% - 9px)` }
              : {
                  left: `calc(${pct}% - 9px)`,
                  scale: active ? 1.15 : 1,
                  boxShadow: active
                    ? "0 2px 6px rgba(15,23,42,0.18), 0 0 0 8px rgba(15,23,42,0.06)"
                    : "0 1px 2px rgba(15,23,42,0.10)",
                }
          }
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseDown={() => setActive(true)}
          onMouseUp={() => setActive(false)}
          onMouseLeave={() => setActive(false)}
          onTouchStart={() => setActive(true)}
          onTouchEnd={() => setActive(false)}
          aria-label={label}
          aria-valuetext={ariaValueText}
          className="absolute inset-0 w-full h-5 opacity-0 cursor-grab active:cursor-grabbing z-10"
        />
      </div>
    </div>
  );
});

/* ─────────────── 12-month animated bar chart ─────────────── */
/**
 * Compact ramp-up visualization — bars stay short so the big revenue
 * number remains the hero element. 30 → 100 % growth curve across the
 * year visualizes compounding adoption rather than flat steady-state.
 *
 * Performance notes:
 *   - Heights are STATIC (set via inline style, not animated).
 *   - Entrance animates `scaleY` only — a transform, GPU-composited, never
 *     triggers layout. The previous version animated `height: %` AND
 *     `scaleY: 0→1` simultaneously on the same element, which fought each
 *     other on every browser repaint and was a real source of jank.
 *   - The component is `memo`'d AND only depends on `monthlyRevenue` for the
 *     `title` tooltips, so it re-renders only when that prop actually changes.
 */
// 3-letter abbreviations instead of single letters: with single letters,
// "J" appeared 3× (Jan/Juin/Juil) and "M" 2× (Mars/Mai), making the chart
// look like it had more than 12 months. Full month names below the bars.
const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"] as const;

const GrowthBars = memo(function GrowthBars({
  monthlyRevenue,
}: {
  monthlyRevenue: number;
}) {
  return (
    <div className="relative">
      <div className="relative h-14 sm:h-16 flex items-end gap-[3px] sm:gap-1 px-1">
        {MONTH_LABELS.map((label, i) => {
          const factor = 0.25 + (i / 11) * 0.75;
          const heightPct = factor * 100;
          const value = Math.round(monthlyRevenue * factor);
          return (
            <div
              key={i}
              className="flex-1 h-full flex flex-col items-center justify-end gap-1"
            >
              <motion.div
                aria-hidden
                className="w-full rounded-sm origin-bottom will-change-transform"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, margin: "-15%" }}
                transition={{
                  duration: 0.55,
                  delay: 0.05 + i * 0.03,
                  ease: EASE,
                }}
                style={{
                  height: `${heightPct}%`,
                  // Single muted tone — looks like a financial-report bar
                  // chart instead of a slot-machine reel. No gradient, no
                  // animation on value change, just static height + entrance.
                  backgroundColor: `${ACCENT}50`,
                }}
                role="presentation"
                title={`${label} : ${formatEUR(value)}€`}
              />
              <span className="text-[8px] text-gray-400 font-medium tabular-nums leading-none">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

/* ───────────────────────── section ───────────────────────── */

export default function ROISimulator() {
  const [postsPerWeek, setPostsPerWeek] = useState<number>(3);
  const [leadsPerPost, setLeadsPerPost] = useState(3);
  const [clientValue, setClientValue] = useState<number>(2500);

  const { leads, revenue, annualRevenue, multiplier, paybackDays, newClients } =
    useMemo(() => {
      const postsPerMonth = postsPerWeek * 4.33;
      const leadsM = Math.round(postsPerMonth * leadsPerPost);
      const clients = leadsM * 0.04;
      const revM = Math.round(clients * clientValue);
      const revY = revM * 12;
      const mult = Math.max(1, Math.round(revM / POSTY_MONTHLY_COST));
      const days = revM > 0 ? Math.max(1, Math.ceil((POSTY_ANNUAL_COST / revM) * 30)) : 999;
      return {
        leads: leadsM,
        revenue: revM,
        annualRevenue: revY,
        multiplier: mult,
        paybackDays: days,
        newClients: Math.round(clients * 10) / 10,
      };
    }, [postsPerWeek, leadsPerPost, clientValue]);

  // Stable callbacks — ChipGroup/Slider are memo()'d, so passing a new fn ref
  // on every parent rerender would defeat the memo. useCallback keeps the
  // refs stable across rerenders.
  const handleSetPosts = useCallback((v: number) => setPostsPerWeek(v), []);
  const handleSetLeads = useCallback((v: number) => setLeadsPerPost(v), []);
  const handleSetClient = useCallback((v: number) => setClientValue(v), []);

  return (
    <section
      id="roi"
      aria-label="Simulateur ROI"
      className="relative py-16 md:py-24 lg:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      {/* Ambient motion layer — orbs only here so the chart remains the focal
          point and we don't add particle/arrow noise around active controls. */}
      <AmbientDecorations variant="orbs" intensity={0.7} />

      <div className="relative max-w-6xl mx-auto">
        {/* Header — unified scale */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="text-center mb-10 md:mb-14"
        >
          <span
            className="inline-block text-[11px] font-bold uppercase text-[#F8935D] mb-3"
            style={{ letterSpacing: "0.2em" }}
          >
            Simulateur de revenus
          </span>
          <h2 className="text-[1.75rem] sm:text-[2.25rem] md:text-[2.5rem] lg:text-[2.875rem] font-bold leading-[1.08] tracking-[-0.015em]">
            <span className="text-gray-900">Combien Posty va vous</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
              rapporter cette année
            </span>
          </h2>
          <p className="mt-4 text-[15px] text-gray-500 leading-relaxed max-w-md mx-auto">
            Ajustez les variables. Le résultat se recalcule en direct.
          </p>
        </motion.div>

        {/* ── 2-COLUMN GRID: result card + controls card side-by-side ──
            `items-stretch` (default in CSS grid, made explicit here for clarity)
            forces both cards to share the height of the taller one. Each card
            is a flex column with `h-full` so its inner content distributes
            naturally across the equalized height. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-stretch">

        {/* ── HERO RESULT CARD ──────────────────────────────────────── */}
        {/* `lg:order-2` puts the result on the right on desktop while keeping
            it as the first child on mobile (single column), so the hero number
            stays the first thing a phone user sees. */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-8%" }}
          transition={{ duration: 0.65, delay: 0.1, ease: EASE }}
          className="relative lg:order-2 h-full flex flex-col rounded-2xl bg-white shadow-[0_24px_70px_-24px_rgba(248,147,93,0.32),0_4px_12px_-4px_rgba(15,23,42,0.06)] ring-1 ring-gray-200/70 overflow-hidden"
        >
          {/* Top gradient hairline — color baton */}
          <div
            aria-hidden
            className="h-[3px] bg-gradient-to-r from-transparent via-[#F8935D] to-transparent"
          />

          <div className="p-6 md:p-7 flex-1 flex flex-col">
            {/* Big annual revenue — sober financial estimate.
                No tier pill, no shimmer gradient, no "+" prefix shouting.
                Solid brand color, clean tabular-nums. Reads as a real number,
                not a slot-machine reveal. */}
            <div className="text-center mb-5">
              <p className="text-[11px] uppercase font-medium text-gray-500 tracking-[0.16em] mb-2.5">
                Revenus supplémentaires projetés
              </p>
              <p className="font-bold tabular-nums leading-[0.95] flex items-baseline justify-center gap-0.5 text-[#F76B54]">
                <span className="text-[2.75rem] sm:text-[3.5rem] md:text-[3.75rem] lg:text-[4rem]">
                  <AnimatedNumber value={annualRevenue} springConfig={REVENUE_SPRING} />
                </span>
                <span className="text-[1.75rem] sm:text-[2.25rem] md:text-[2.5rem]">€</span>
                <span className="ml-2 text-[14px] sm:text-[15px] font-medium text-gray-400 self-end mb-1">
                  / an
                </span>
              </p>
              <p className="mt-2.5 text-[13px] text-gray-500">
                <span className="tabular-nums text-gray-700">
                  <AnimatedNumber value={revenue} />€
                </span>{" "}
                / mois ·{" "}
                <span className="tabular-nums text-gray-700">{newClients}</span>{" "}
                nouveaux clients
              </p>
            </div>

            {/* Compact 12-month bar chart — visual rhythm without competing
                with the big revenue number above it. */}
            <div className="my-4 sm:my-5" aria-hidden>
              <GrowthBars monthlyRevenue={revenue} />
            </div>

            {/* 3-stat KPI strip */}
            <div
              className="grid grid-cols-3 gap-1 pt-5 border-t border-gray-100"
              aria-live="polite"
            >
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400 font-bold mb-1">
                  Leads/mois
                </p>
                <p className="text-[20px] sm:text-[22px] font-bold tabular-nums text-gray-900 leading-none">
                  <AnimatedNumber value={leads} />
                </p>
              </div>
              <div className="text-center border-l border-r border-gray-100">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400 font-bold mb-1">
                  ROI mensuel
                </p>
                <p
                  className="text-[20px] sm:text-[22px] font-bold tabular-nums leading-none text-emerald-600"
                >
                  ×<AnimatedNumber value={multiplier} springConfig={REVENUE_SPRING} />
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400 font-bold mb-1">
                  Rentabilisé
                </p>
                <p className="text-[20px] sm:text-[22px] font-bold tabular-nums text-gray-900 leading-none">
                  {paybackDays >= 999 ? (
                    "—"
                  ) : (
                    <>
                      <AnimatedNumber value={paybackDays} />j
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── CONTROLS CARD ─────────────────────────────────────────── */}
        {/* `lg:order-1` puts the controls on the LEFT on desktop. `h-full`
            stretches it to the same height as the result card on the right;
            `justify-center` then distributes the three inputs symmetrically
            inside the equalized height so the card never reads half-empty. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-5%" }}
          transition={{ duration: 0.55, delay: 0.18, ease: EASE }}
          className="lg:order-1 h-full flex flex-col justify-center rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.10)] p-6 md:p-7 space-y-5 lg:space-y-7"
        >
          {/* Posts per week — chips */}
          <div>
            <div className="flex items-baseline justify-between mb-2.5">
              <label className="text-[13px] font-medium text-gray-700">
                Posts par semaine
              </label>
              <span className="text-[12px] text-gray-400">{postsPerWeek}/sem</span>
            </div>
            <ChipGroup
              options={POSTS_PER_WEEK_OPTIONS}
              value={postsPerWeek as (typeof POSTS_PER_WEEK_OPTIONS)[number]}
              onChange={handleSetPosts}
              format={(v) => String(v)}
              ariaLabel="Posts par semaine"
              groupId="posts-per-week"
            />
          </div>

          {/* Leads per post — slider */}
          <Slider
            label="Leads attendus par post"
            value={leadsPerPost}
            min={1}
            max={10}
            step={1}
            suffix=""
            ariaValueText={`${leadsPerPost} leads par post`}
            onChange={handleSetLeads}
          />

          {/* Client value — chips */}
          <div>
            <div className="flex items-baseline justify-between mb-2.5">
              <label className="text-[13px] font-medium text-gray-700">
                Valeur moyenne d&apos;un client
              </label>
              <span className="text-[12px] text-gray-400">
                {formatClientValue(clientValue)}
              </span>
            </div>
            <ChipGroup
              options={CLIENT_VALUE_OPTIONS}
              value={clientValue as (typeof CLIENT_VALUE_OPTIONS)[number]}
              onChange={handleSetClient}
              format={formatClientValue}
              ariaLabel="Valeur moyenne d'un client"
              groupId="client-value"
            />
          </div>
        </motion.div>

        </div>
        {/* ── /2-column grid ─────────────────────────────────────────── */}

        {/* ── DYNAMIC CTA ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-5%" }}
          transition={{ duration: 0.5, delay: 0.28, ease: EASE }}
          className="mt-8 md:mt-10 text-center"
        >
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            className="inline-block"
          >
            <Link
              href="/signup"
              className="group relative inline-flex items-center gap-2.5 px-7 py-4 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white font-semibold rounded-xl shadow-lg shadow-[#F8935D]/25 hover:shadow-xl hover:shadow-[#F8935D]/40 transition-shadow duration-300 overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-700 ease-out pointer-events-none" />
              <span className="relative">
                Démarrer pour générer{" "}
                <span className="tabular-nums">
                  <AnimatedNumber value={revenue} />€
                </span>
                /mois
              </span>
              <svg
                className="relative w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </motion.div>
          <p className="mt-4 text-[11px] text-gray-400">
            Estimations basées sur 4 % de conversion en client. Vos résultats varient selon votre niche.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
