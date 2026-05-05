"use client";

/**
 * /business — Premium enterprise landing for the Posty Business plan.
 *
 * Pitch flow:
 *   Hero → Capabilities (bento) → Built-for personas → Workflow diagram
 *   → Numbers → Final CTA → Footer
 *
 * Design language: editorial display typography, generous whitespace, sober
 * neutral surfaces, single warm brand accent (#F8935D). Motion is reserved
 * for entrance reveals and one continuous diagram loop — never decorative.
 *
 * Scroll: opts into `about-scroll-enabled` so the global scroll system in
 * globals.css treats this as a public scrollable page (defeats PWA-mobile
 * and modal-lock blockers).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useInView } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Zap,
  Layers,
  HeadphonesIcon,
  Plug,
  Building2,
  Briefcase,
  Rocket,
  TrendingUp,
  UserCog,
  CalendarDays,
  Activity,
  ShieldCheck,
  Globe2,
  Lock,
} from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/ui/usePageTitle";

const BUSINESS_CONTACT =
  "mailto:postygroup@gmail.com?subject=Posty%20Business%20—%20demande%20d%27appel";

const EASE = [0.22, 1, 0.36, 1] as const;
const ACCENT = "#F8935D";

/* ───────────────────────── Reveal helper ─────────────────────────── */
function Reveal({
  children,
  delay = 0,
  className,
  y = 16,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={reduced ? { duration: 0 } : { duration: 0.6, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ───────────────── Section eyebrow with serial number ───────────── */
function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-3 mb-5 sm:mb-6">
      <span
        className="text-[11px] font-mono font-semibold text-gray-400 tabular-nums"
        style={{ letterSpacing: "0.08em" }}
      >
        {number}
      </span>
      <span
        aria-hidden
        className="block w-8 h-px bg-gray-300"
      />
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: ACCENT }}
      >
        {label}
      </span>
    </div>
  );
}

/* ─────────────────────── Animated counter ────────────────────────── */
function Counter({ to, suffix = "", duration = 1400, decimals = 0 }: {
  to: number;
  suffix?: string;
  duration?: number;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  const formatted = decimals === 0
    ? Math.round(n).toLocaleString("en-US")
    : n.toFixed(decimals);
  return (
    <span ref={ref} className="tabular-nums">
      {formatted}
      {suffix}
    </span>
  );
}

/* ──────────────────── Workflow diagram (animated) ────────────────── */
function WorkflowDiagram() {
  return (
    <div className="relative">
      {/* Mobile: vertical stack with vertical connectors */}
      <div className="md:hidden flex flex-col gap-3">
        <WorkflowNodeMobile index={0} icon={<TeamGlyph />} label="Équipe" sub="Plusieurs collaborateurs" />
        <ConnectorVertical />
        <WorkflowNodeMobile index={1} icon={<PostyGlyph />} label="Posty" sub="Génération IA" />
        <ConnectorVertical />
        <WorkflowNodeMobile index={2} icon={<LinkedinGlyph />} label="LinkedIn" sub="Publication automatique" />
        <ConnectorVertical />
        <WorkflowNodeMobile index={3} icon={<ResultsGlyph />} label="Résultats" sub="Leads & impressions" />
      </div>

      {/* Desktop: horizontal flow */}
      <div className="hidden md:grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-3 lg:gap-5">
        <WorkflowNode index={0} icon={<TeamGlyph />} label="Équipe" sub="Plusieurs collaborateurs" />
        <Connector />
        <WorkflowNode index={1} icon={<PostyGlyph />} label="Posty" sub="Génération IA" highlighted />
        <Connector />
        <WorkflowNode index={2} icon={<LinkedinGlyph />} label="LinkedIn" sub="Publication" />
        <Connector />
        <WorkflowNode index={3} icon={<ResultsGlyph />} label="Résultats" sub="Leads & impressions" />
      </div>
    </div>
  );
}

function WorkflowNode({
  index,
  icon,
  label,
  sub,
  highlighted = false,
}: {
  index: number;
  icon: React.ReactNode;
  label: string;
  sub: string;
  highlighted?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15%" }}
      transition={{ duration: 0.55, ease: EASE, delay: 0.1 + index * 0.12 }}
      className="relative"
    >
      <div
        className={`
          relative rounded-2xl bg-white p-5 ring-1
          ${highlighted ? "ring-[#F8935D]/30" : "ring-gray-200/80"}
        `}
        style={{
          boxShadow: highlighted
            ? "0 16px 40px -16px rgba(248,147,93,0.30), 0 2px 6px -2px rgba(15,23,42,0.04)"
            : "0 8px 24px -16px rgba(15,23,42,0.10), 0 1px 3px -1px rgba(15,23,42,0.04)",
        }}
      >
        <div className="aspect-square w-full max-w-[140px] mx-auto rounded-xl bg-gray-50/70 flex items-center justify-center mb-3 ring-1 ring-gray-100">
          {icon}
        </div>
        <p className="text-center text-[13px] font-bold text-gray-900 tracking-tight">
          {label}
        </p>
        <p className="text-center text-[11px] text-gray-500 mt-0.5">{sub}</p>
      </div>
      {/* Tiny serial number badge top-right */}
      <span
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white ring-1 ring-gray-200 text-[10px] font-mono font-bold text-gray-400 flex items-center justify-center"
        aria-hidden
      >
        {String(index + 1).padStart(2, "0")}
      </span>
    </motion.div>
  );
}

function WorkflowNodeMobile({
  index,
  icon,
  label,
  sub,
}: {
  index: number;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.1 + index * 0.08 }}
      className="flex items-center gap-4 p-4 rounded-2xl bg-white ring-1 ring-gray-200/80"
      style={{
        boxShadow: "0 8px 24px -16px rgba(15,23,42,0.08)",
      }}
    >
      <span className="w-12 h-12 flex-shrink-0 rounded-xl bg-gray-50/70 ring-1 ring-gray-100 flex items-center justify-center">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-gray-900 tracking-tight">
          {label}
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>
      </div>
      <span
        className="text-[10px] font-mono font-semibold text-gray-300"
        aria-hidden
      >
        {String(index + 1).padStart(2, "0")}
      </span>
    </motion.div>
  );
}

/* Animated horizontal connector — solid line + traveling dot */
function Connector() {
  return (
    <div className="relative w-12 lg:w-16 h-[2px] flex items-center" aria-hidden>
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          transformOrigin: "left",
          backgroundImage:
            "linear-gradient(90deg, rgba(15,23,42,0.10), rgba(248,147,93,0.45), rgba(15,23,42,0.10))",
        }}
        initial={{ opacity: 0, scaleX: 0 }}
        whileInView={{ opacity: 1, scaleX: 1 }}
        viewport={{ once: true, margin: "-15%" }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.4 }}
      />
      <motion.span
        className="absolute w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: ACCENT, boxShadow: "0 0 8px rgba(248,147,93,0.60)" }}
        animate={{ left: ["0%", "100%", "0%"] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/* Vertical connector for mobile */
function ConnectorVertical() {
  return (
    <div className="relative h-6 w-[2px] mx-auto" aria-hidden>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(15,23,42,0.10), rgba(248,147,93,0.45), rgba(15,23,42,0.10))",
        }}
      />
      <motion.span
        className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: ACCENT, boxShadow: "0 0 8px rgba(248,147,93,0.55)" }}
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/* ───────────────────── Workflow node glyphs ──────────────────────── */
function TeamGlyph() {
  // 3 royalty-free professional portraits via Unsplash (Unsplash License:
  // free commercial use, no attribution required). Stacked, ringed white,
  // soft-shadowed for a CRM-style "team online" feel.
  const team = [
    { src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&crop=faces&auto=format&q=80", alt: "Team member" },
    { src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=faces&auto=format&q=80", alt: "Team member" },
    { src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=faces&auto=format&q=80", alt: "Team member" },
  ];
  // Sizes scale with the slot: 20px (mobile compact 48px) → 44px (desktop
  // 140px) so the photos always read as faces, never overflow.
  return (
    <div className="flex -space-x-1.5 md:-space-x-2.5">
      {team.map((m, i) => (
        <span
          key={i}
          className="relative w-5 h-5 md:w-11 md:h-11 rounded-full overflow-hidden ring-2 ring-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.18)]"
        >
          <Image
            src={m.src}
            alt={m.alt}
            fill
            sizes="(max-width: 768px) 20px, 44px"
            className="object-cover"
          />
        </span>
      ))}
    </div>
  );
}

function PostyGlyph() {
  // Real Posty logo — the brand mark from /public/logo.png inside a soft
  // rounded card. No tinted gradient backdrop; the logo speaks for itself.
  return (
    <span
      className="w-12 h-12 rounded-xl overflow-hidden ring-1 ring-black/[0.04] bg-white"
      style={{
        boxShadow:
          "0 8px 20px -8px rgba(248,147,93,0.45), 0 2px 6px -2px rgba(15,23,42,0.08)",
      }}
    >
      <Image
        src="/logo.png"
        alt="Posty"
        width={48}
        height={48}
        className="w-full h-full object-cover"
        priority
      />
    </span>
  );
}

function LinkedinGlyph() {
  // Official LinkedIn brand mark (Bug-style square logo, accurate path).
  return (
    <span
      className="w-12 h-12 rounded-xl flex items-center justify-center"
      style={{
        backgroundColor: "#0A66C2",
        boxShadow: "0 6px 16px -6px rgba(10,102,194,0.55), inset 0 1px 0 rgba(255,255,255,0.20)",
      }}
    >
      <svg
        className="w-6 h-6 text-white"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-label="LinkedIn"
      >
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    </span>
  );
}

function ResultsGlyph() {
  return (
    <div className="w-full h-full px-3 flex items-end justify-center gap-1">
      {[40, 60, 50, 75, 90].map((h, i) => (
        <motion.span
          key={i}
          className="flex-1 rounded-t-sm"
          style={{
            backgroundImage: "linear-gradient(180deg,#F8935D,#F76B54)",
            height: `${h}%`,
            maxWidth: "10px",
          }}
          initial={{ scaleY: 0.3, opacity: 0.6 }}
          whileInView={{ scaleY: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * 0.05 }}
        />
      ))}
    </div>
  );
}

/* ───────────────────────── Main page ─────────────────────────────── */
export default function BusinessPage() {
  const { t } = useLanguage();
  usePageTitle("business");

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.add("about-scroll-enabled");
    body.classList.add("about-scroll-enabled");
    body.classList.remove("pwa-mobile", "no-scroll", "scroll-locked", "modal-open");
    return () => {
      root.classList.remove("about-scroll-enabled");
      body.classList.remove("about-scroll-enabled");
    };
  }, []);

  /* ─ Capabilities — 5 cards, asymmetric bento (1 hero + 4 small) ── */
  const heroBenefit = {
    icon: Users,
    title: t.landing.businessBenefit1Title ?? "Gestion équipe",
    desc: t.landing.businessBenefit1Desc ?? "Rôles, permissions, journal d'audit unifié.",
  };
  const sideBenefits = [
    {
      icon: Zap,
      title: t.landing.businessBenefit2Title ?? "Automatisation avancée",
      desc: t.landing.businessBenefit2Desc ?? "Workflows et déclencheurs sur-mesure.",
    },
    {
      icon: Layers,
      title: t.landing.businessBenefit3Title ?? "Multi-comptes",
      desc: t.landing.businessBenefit3Desc ?? "Gérez plusieurs profils LinkedIn en parallèle.",
    },
    {
      icon: HeadphonesIcon,
      title: t.landing.businessBenefit4Title ?? "Support prioritaire",
      desc: t.landing.businessBenefit4Desc ?? "Account manager dédié, SLA garanti.",
    },
    {
      icon: Plug,
      title: t.landing.businessBenefit5Title ?? "Intégrations personnalisées",
      desc: t.landing.businessBenefit5Desc ?? "API, SSO, connecteurs sur mesure.",
    },
  ];

  const useCases = [
    { icon: Building2, label: t.landing.businessUseCase1 ?? "Agences marketing" },
    { icon: Rocket, label: t.landing.businessUseCase2 ?? "Startups en hypercroissance" },
    { icon: TrendingUp, label: t.landing.businessUseCase3 ?? "Équipes growth" },
    { icon: Briefcase, label: t.landing.businessUseCase4 ?? "Entreprises B2B" },
    { icon: UserCog, label: t.landing.businessUseCase5 ?? "Consultants & freelances" },
  ];

  const trustBadges = [
    { icon: ShieldCheck, label: "GDPR ready" },
    { icon: Lock, label: "SSO · SAML" },
    { icon: Globe2, label: "Hébergé en UE" },
  ];

  return (
    <main
      className="bg-white text-gray-900"
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* ── Top bar ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-gray-900 tracking-tight hover:opacity-70 transition-opacity"
          >
            <span className="w-6 h-6 rounded-md overflow-hidden ring-1 ring-black/5">
              <Image src="/logo.png" alt="Posty" width={24} height={24} className="w-full h-full object-cover" />
            </span>
            <span translate="no" className="notranslate">Posty</span>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-gray-900 text-white text-[9px] font-bold tracking-wider uppercase">
              Business
            </span>
          </Link>
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.landing.businessBackToPricing ?? "Retour aux tarifs"}</span>
          </Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative px-5 sm:px-8 pt-20 sm:pt-28 md:pt-36 pb-20 md:pb-28">
        {/* Background — subtle warm halo + grid mesh */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[760px] h-[460px] rounded-full blur-[120px]"
          style={{ backgroundColor: "rgba(248,147,93,0.10)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-14 h-px"
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent, rgba(248,147,93,0.50), transparent)",
          }}
        />

        <div className="relative max-w-4xl mx-auto text-center">
          <Reveal>
            <span
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase ring-1"
              style={{
                color: ACCENT,
                backgroundColor: "rgba(248,147,93,0.08)",
                ['--tw-ring-color' as string]: "rgba(248,147,93,0.22)",
                letterSpacing: "0.18em",
              }}
            >
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: ACCENT, opacity: 0.45 }} />
                <span className="relative w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ACCENT }} />
              </span>
              Posty Business
            </span>
          </Reveal>

          <Reveal delay={0.06} y={20}>
            <h1
              className="mt-7 sm:mt-8 font-bold text-gray-900 leading-[1.02]"
              style={{
                fontSize: "clamp(2.25rem, 5.6vw, 4.75rem)",
                letterSpacing: "-0.022em",
              }}
            >
              {t.landing.businessHeroTitle ?? "Solution Business pour"}
              <br />
              <span
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage: "linear-gradient(110deg, #F8935D 0%, #F76B54 60%, #F8935D 100%)",
                }}
              >
                équipes ambitieuses
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.14}>
            <p className="mt-6 text-base sm:text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
              {t.landing.businessHeroSubtitle ??
                "Déployez Posty à grande échelle avec une solution adaptée à votre organisation."}
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={BUSINESS_CONTACT}
                className="
                  group inline-flex items-center justify-center gap-2
                  px-7 py-3.5 rounded-xl
                  bg-gray-900 text-white
                  text-sm font-semibold tracking-tight
                  shadow-[0_12px_32px_-8px_rgba(15,23,42,0.40)]
                  hover:shadow-[0_18px_40px_-8px_rgba(15,23,42,0.55)]
                  hover:-translate-y-0.5
                  transition-all duration-200
                  w-full sm:w-auto
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F8935D]/50
                "
              >
                <CalendarDays className="w-4 h-4" />
                <span>{t.landing.businessCTA ?? "Réserver un appel"}</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
              <Link
                href="/#pricing"
                className="
                  inline-flex items-center justify-center gap-1.5
                  px-5 py-3.5 rounded-xl
                  text-sm font-medium text-gray-600
                  hover:text-gray-900
                  hover:bg-gray-50
                  transition-colors duration-200
                  w-full sm:w-auto
                "
              >
                {t.landing.businessBackToPricing ?? "Retour aux tarifs"}
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.28}>
            <p className="mt-7 text-xs text-gray-400">
              {t.landing.businessFootnote ?? "Réponse sous 24h · Sans engagement"}
            </p>
          </Reveal>

          {/* Trust badges row — sober pills */}
          <Reveal delay={0.34}>
            <ul className="mt-10 sm:mt-14 flex flex-wrap items-center justify-center gap-2.5">
              {trustBadges.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white ring-1 ring-gray-200/70 text-[11.5px] font-medium text-gray-600"
                >
                  <Icon className="w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── Capabilities — bento grid ─────────────────────────────── */}
      <section className="relative px-5 sm:px-8 py-20 sm:py-24 md:py-28 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <Reveal className="max-w-3xl">
            <SectionLabel
              number="01"
              label={t.landing.businessCapabilitiesEyebrow ?? "Capacités"}
            />
            <h2
              className="font-bold text-gray-900 leading-[1.05] tracking-[-0.018em]"
              style={{ fontSize: "clamp(1.75rem, 3.8vw, 2.75rem)" }}
            >
              {t.landing.businessBenefitsTitle ?? "Tout ce qu'il faut pour scaler"}
            </h2>
            <p className="mt-4 text-[15px] sm:text-base text-gray-500 leading-relaxed max-w-xl">
              Une infrastructure pensée pour absorber la charge d&apos;une équipe entière sans sacrifier la finesse de chaque post.
            </p>
          </Reveal>

          {/* Bento — 1 hero card spanning 2 cols + 4 smaller */}
          <div className="mt-12 sm:mt-14 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* Hero card — Team management */}
            <Reveal delay={0.05}>
              <article
                className="relative h-full lg:col-span-1 rounded-2xl bg-white p-7 ring-1 ring-gray-200/80 overflow-hidden flex flex-col"
                style={{
                  boxShadow:
                    "0 16px 48px -24px rgba(15,23,42,0.10), 0 2px 6px -2px rgba(15,23,42,0.04)",
                }}
              >
                {/* Decorative warm hairline */}
                <span
                  aria-hidden
                  className="absolute top-0 inset-x-0 h-[2px]"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, transparent, rgba(248,147,93,0.6), transparent)",
                  }}
                />
                <span
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{
                    backgroundImage: "linear-gradient(135deg,#F8935D,#F76B54)",
                    boxShadow:
                      "0 6px 16px -4px rgba(248,147,93,0.45), inset 0 1px 0 rgba(255,255,255,0.30)",
                  }}
                >
                  <heroBenefit.icon className="w-5 h-5 text-white" strokeWidth={2.2} />
                </span>
                <h3 className="text-[18px] font-bold text-gray-900 tracking-[-0.01em] mb-2">
                  {heroBenefit.title}
                </h3>
                <p className="text-[14px] text-gray-500 leading-relaxed flex-1">
                  {heroBenefit.desc}
                </p>

                {/* Mini avatars stack — royalty-free pro portraits via Unsplash
                    (Unsplash License: free commercial use, no attribution required) */}
                <div className="mt-6 pt-6 border-t border-gray-100 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[
                      { src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=faces&auto=format&q=80", alt: "Team member" },
                      { src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces&auto=format&q=80", alt: "Team member" },
                      { src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&crop=faces&auto=format&q=80", alt: "Team member" },
                      { src: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop&crop=faces&auto=format&q=80", alt: "Team member" },
                    ].map((a, i) => (
                      <span
                        key={i}
                        className="relative w-7 h-7 rounded-full overflow-hidden ring-2 ring-white shadow-[0_2px_6px_-2px_rgba(15,23,42,0.18)]"
                      >
                        <Image
                          src={a.src}
                          alt={a.alt}
                          fill
                          sizes="28px"
                          className="object-cover"
                        />
                      </span>
                    ))}
                  </div>
                  <span className="text-[11px] font-medium text-gray-400">
                    +12 utilisateurs · 1 admin
                  </span>
                </div>
              </article>
            </Reveal>

            {/* 4 smaller capability cards in a 2-col grid (desktop) spanning lg:col-span-2 */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {sideBenefits.map((b, i) => {
                const Icon = b.icon;
                return (
                  <Reveal key={b.title} delay={0.05 + (i + 1) * 0.04}>
                    <article
                      className="
                        relative h-full rounded-2xl bg-white p-6 ring-1 ring-gray-200/80
                        hover:ring-[#F8935D]/30
                        hover:-translate-y-0.5
                        transition-all duration-200
                      "
                      style={{
                        boxShadow:
                          "0 8px 24px -16px rgba(15,23,42,0.08), 0 1px 2px -1px rgba(15,23,42,0.04)",
                      }}
                    >
                      <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                        style={{
                          backgroundColor: "rgba(248,147,93,0.10)",
                          boxShadow: "inset 0 0 0 1px rgba(248,147,93,0.18)",
                        }}
                      >
                        <Icon className="w-[18px] h-[18px]" style={{ color: ACCENT }} width={18} height={18} strokeWidth={2.1} />
                      </span>
                      <h3 className="text-[15px] font-bold text-gray-900 tracking-[-0.005em] mb-1.5">
                        {b.title}
                      </h3>
                      <p className="text-[13px] text-gray-500 leading-relaxed">
                        {b.desc}
                      </p>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Built for ─────────────────────────────────────────────── */}
      <section className="relative px-5 sm:px-8 py-20 sm:py-24 md:py-28 border-t border-gray-100 bg-[#FAFAF8]">
        <div className="max-w-6xl mx-auto">
          <Reveal className="max-w-3xl">
            <SectionLabel
              number="02"
              label={t.landing.businessUseCasesEyebrow ?? "Conçu pour"}
            />
            <h2
              className="font-bold text-gray-900 leading-[1.05] tracking-[-0.018em]"
              style={{ fontSize: "clamp(1.75rem, 3.8vw, 2.75rem)" }}
            >
              {t.landing.businessUseCasesTitle ?? "Pensé pour votre contexte"}
            </h2>
          </Reveal>

          <div className="mt-12 sm:mt-14 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {useCases.map((u, i) => {
              const Icon = u.icon;
              return (
                <Reveal key={u.label} delay={0.04 * i}>
                  <article
                    className="
                      group h-full flex flex-col gap-3 p-5
                      rounded-2xl bg-white
                      ring-1 ring-gray-200/70
                      hover:ring-[#F8935D]/40
                      hover:-translate-y-0.5
                      hover:shadow-[0_12px_28px_-12px_rgba(248,147,93,0.30)]
                      transition-all duration-200
                    "
                  >
                    <span className="w-9 h-9 rounded-lg bg-gray-50 ring-1 ring-gray-100 flex items-center justify-center group-hover:bg-[#F8935D]/10 group-hover:ring-[#F8935D]/20 transition-colors duration-200">
                      <Icon className="w-4 h-4 text-gray-500 group-hover:text-[#F8935D] transition-colors duration-200" width={16} height={16} strokeWidth={2} />
                    </span>
                    <span className="text-[13.5px] font-semibold text-gray-900 leading-snug tracking-tight">
                      {u.label}
                    </span>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Workflow diagram ──────────────────────────────────────── */}
      <section className="relative px-5 sm:px-8 py-20 sm:py-24 md:py-28 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <Reveal className="max-w-3xl">
            <SectionLabel number="03" label="Workflow" />
            <h2
              className="font-bold text-gray-900 leading-[1.05] tracking-[-0.018em]"
              style={{ fontSize: "clamp(1.75rem, 3.8vw, 2.75rem)" }}
            >
              De votre équipe aux résultats,
              <br />
              <span
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage: "linear-gradient(110deg, #F8935D 0%, #F76B54 100%)",
                }}
              >
                un seul flux.
              </span>
            </h2>
            <p className="mt-4 text-[15px] sm:text-base text-gray-500 leading-relaxed max-w-xl">
              Chaque collaborateur garde sa voix. Posty orchestre, génère et publie. Les résultats remontent automatiquement.
            </p>
          </Reveal>

          <div className="mt-14 sm:mt-16">
            <WorkflowDiagram />
          </div>
        </div>
      </section>

      {/* ── Numbers / Trust ───────────────────────────────────────── */}
      <section className="relative px-5 sm:px-8 py-20 sm:py-24 md:py-28 border-t border-gray-100 bg-[#FAFAF8]">
        <div className="max-w-6xl mx-auto">
          <Reveal className="max-w-3xl">
            <SectionLabel number="04" label="Échelle" />
            <h2
              className="font-bold text-gray-900 leading-[1.05] tracking-[-0.018em]"
              style={{ fontSize: "clamp(1.75rem, 3.8vw, 2.75rem)" }}
            >
              La performance d&apos;une suite enterprise,
              <br />
              <span className="text-gray-400">sans la complexité.</span>
            </h2>
          </Reveal>

          <div className="mt-12 sm:mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              { v: 50, suf: "+", label: "utilisateurs par espace", sub: "Sans frais cachés" },
              { v: 99.9, suf: "%", label: "uptime garanti", sub: "SLA contractuel", decimals: 1 },
              { v: 24, suf: "h", label: "réponse support", sub: "Account manager dédié" },
              { v: 2, suf: "×", label: "ROI moyen constaté", sub: "Vs. publication manuelle" },
            ].map((s, i) => (
              <Reveal key={s.label} delay={0.05 + i * 0.05}>
                <article
                  className="h-full rounded-2xl bg-white p-6 ring-1 ring-gray-200/70"
                  style={{ boxShadow: "0 8px 24px -16px rgba(15,23,42,0.08)" }}
                >
                  <p
                    className="font-bold tracking-tight"
                    style={{
                      fontSize: "clamp(2rem, 4.2vw, 3rem)",
                      backgroundImage: "linear-gradient(135deg, #0F172A 0%, #475569 100%)",
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      color: "transparent",
                      lineHeight: 1,
                    }}
                  >
                    <Counter to={s.v} suffix={s.suf} decimals={s.decimals ?? 0} />
                  </p>
                  <p className="mt-3 text-[12px] font-bold text-gray-900 uppercase tracking-wider">
                    {s.label}
                  </p>
                  <p className="mt-1 text-[12px] text-gray-400">{s.sub}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA — light, premium, warm ─────────────────────── */}
      <section
        className="relative px-4 sm:px-6 md:px-8 py-20 sm:py-24 md:py-28 lg:py-32 border-t border-gray-100 overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(80% 60% at 50% 0%, rgba(248,147,93,0.07), transparent 65%), linear-gradient(180deg, #FAFAF8 0%, #FFF8F2 60%, #FAFAF8 100%)",
        }}
      >
        {/* Section-level animated decorations — drift on a slow loop, behind everything. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-32 w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ backgroundColor: "rgba(248,147,93,0.10)" }}
          animate={{ x: [0, 24, 0], y: [0, -12, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-32 w-[460px] h-[460px] rounded-full blur-[120px]"
          style={{ backgroundColor: "rgba(247,107,84,0.06)" }}
          animate={{ x: [0, -18, 0], y: [0, 14, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Subtle dot grid on top of the gradient — pure CSS, very low opacity */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.08) 1px, transparent 0)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(60% 60% at 50% 50%, black 0%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(60% 60% at 50% 50%, black 0%, transparent 75%)",
          }}
        />

        <div className="relative max-w-4xl mx-auto">
          <div
            className="
              relative overflow-hidden rounded-2xl sm:rounded-3xl
              px-6 py-12 sm:px-10 md:px-14 sm:py-16 md:py-20
              text-center
              bg-white
              ring-1 ring-gray-200/70
            "
            style={{
              boxShadow:
                "0 24px 60px -24px rgba(248,147,93,0.22), 0 4px 16px -8px rgba(15,23,42,0.06)",
              backgroundImage:
                "radial-gradient(120% 70% at 50% 0%, rgba(248,147,93,0.06), transparent 60%), linear-gradient(180deg, #FFFFFF 0%, #FFFCF8 100%)",
            }}
          >
            {/* Top warm hairline — subtle on light bg */}
            <span
              aria-hidden
              className="absolute inset-x-8 sm:inset-x-12 top-0 h-px"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, transparent, rgba(248,147,93,0.45), transparent)",
              }}
            />
            {/* Inner warm halo — very subtle on white card */}
            <span
              aria-hidden
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full blur-[90px] pointer-events-none"
              style={{ backgroundColor: "rgba(248,147,93,0.10)" }}
            />

            <Reveal>
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10.5px] font-bold uppercase ring-1 mb-5 sm:mb-6"
                style={{
                  color: ACCENT,
                  backgroundColor: "rgba(248,147,93,0.10)",
                  ['--tw-ring-color' as string]: "rgba(248,147,93,0.25)",
                  letterSpacing: "0.18em",
                }}
              >
                <Activity className="w-3 h-3" strokeWidth={2.4} />
                On en parle ?
              </span>
            </Reveal>

            <Reveal delay={0.06} y={20}>
              <h2
                className="relative font-bold text-gray-900 leading-[1.05] tracking-[-0.02em] px-2"
                style={{ fontSize: "clamp(1.625rem, 4.2vw, 3rem)" }}
              >
                {t.landing.businessFinalCtaTitle ?? "Parlons de votre besoin"}
              </h2>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="relative mt-4 sm:mt-5 text-sm sm:text-base text-gray-500 max-w-md mx-auto leading-relaxed px-2">
                {t.landing.businessFinalCtaSubtitle ??
                  "Réponse sous 24h, sans engagement."}
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <motion.a
                href={BUSINESS_CONTACT}
                whileHover={{ y: -2 }}
                whileTap={{ y: 0, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                className="
                  group relative mt-8 sm:mt-9 inline-flex items-center justify-center gap-2.5
                  px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl
                  text-sm font-bold tracking-tight text-gray-900
                  w-full sm:w-auto max-w-[320px]
                  bg-white ring-1 ring-gray-200
                  hover:ring-gray-900/15
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white
                "
                style={{
                  boxShadow:
                    "0 14px 32px -8px rgba(15,23,42,0.18), 0 2px 6px -2px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.80)",
                }}
              >
                {/* Subtle warm shimmer sweep on hover */}
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
                >
                  <span
                    className="absolute inset-0 translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-700 ease-out"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, transparent, rgba(248,147,93,0.18), transparent)",
                    }}
                  />
                </span>
                <CalendarDays className="relative w-4 h-4" style={{ color: ACCENT }} />
                <span className="relative">
                  {t.landing.businessCTA ?? "Réserver un appel"}
                </span>
                <ArrowRight className="relative w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </motion.a>
            </Reveal>

            <Reveal delay={0.24}>
              <p className="relative mt-5 sm:mt-6 text-[11px] sm:text-[11.5px] text-gray-400 px-2">
                {t.landing.businessFootnote ?? "Réponse sous 24h · Sans engagement"}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="px-5 sm:px-8 py-10 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <span>© {new Date().getFullYear()} Posty</span>
          <Link
            href="/"
            className="hover:text-gray-900 transition-colors"
          >
            {t.landing.businessBackToHome ?? "← Retour à l'accueil"}
          </Link>
        </div>
      </footer>
    </main>
  );
}
