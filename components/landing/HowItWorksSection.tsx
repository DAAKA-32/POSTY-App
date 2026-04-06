"use client";

import { motion, useReducedMotion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useRef, useCallback, useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";

const premiumEase = [0.22, 1, 0.36, 1] as const;

function useIsMobileHiw() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

/* ─── Realistic Posty mockup: idea → LinkedIn post ──────────────────── */
function MockupChat({ l }: { l: Record<string, string> }) {
  return (
    <div className="w-full h-full flex flex-col bg-[#FAFBFC] text-left overflow-hidden select-none">
      {/* ── App header ── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl overflow-hidden shadow-sm ring-1 ring-gray-100">
            <img src="/logo.png" alt="Posty" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-900 block leading-none">Posty AI</span>
            <span className="text-[8px] text-emerald-500 font-medium flex items-center gap-1 mt-0.5">
              <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block" />
              Online
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="px-2 py-0.5 rounded-md bg-[#F8935D]/10 text-[7px] font-bold text-[#F8935D] tracking-wide">LinkedIn</div>
        </div>
      </div>

      {/* ── Conversation ── */}
      <div className="flex-1 px-3.5 py-3 space-y-3 overflow-hidden">

        {/* User message */}
        <div className="flex justify-end">
          <div className="flex items-end gap-1.5 max-w-[85%]">
            <div className="bg-gradient-to-r from-[#F8935D] to-[#F76B54] !text-white text-[10px] leading-[1.5] px-3 py-2 rounded-2xl rounded-tr-[4px] shadow-md shadow-[#F8935D]/20">
              {l.hiwUserInput}
            </div>
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-[7px] font-bold text-white">EN</span>
            </div>
          </div>
        </div>

        {/* AI intro text */}
        <div className="flex items-start gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#F8935D] to-[#F76B54] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          </div>

          <div className="max-w-[90%] space-y-2">
            {/* Text bubble */}
            <div className="bg-white border border-gray-100 text-[10px] text-gray-600 leading-[1.5] px-3 py-2 rounded-2xl rounded-tl-[4px] shadow-sm">
              {l.hiwAiIntro || "Here\u2019s your post, optimized for engagement:"}
            </div>

            {/* ── LinkedIn post card ── */}
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-lg shadow-gray-200/40 overflow-hidden">
              {/* Post header */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 shadow-sm">EN</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-gray-900 leading-none">{l.hiwPostAuthor}</p>
                  <p className="text-[8px] text-gray-400 mt-0.5">{l.hiwPostRole}</p>
                </div>
                <svg className="w-3.5 h-3.5 text-[#0A66C2] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </div>

              {/* Post body — real text, not skeleton */}
              <div className="px-3 py-2.5">
                <p className="text-[10px] font-bold text-gray-900 leading-snug mb-1.5">{l.hiwPostHook}</p>
                <p className="text-[9px] text-gray-500 leading-[1.6] line-clamp-4">{l.hiwPostBody}</p>
                <p className="text-[9px] font-semibold text-gray-800 mt-1.5">{l.hiwPostCta}</p>
              </div>

              {/* Engagement bar */}
              <div className="px-3 py-1.5 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  <span className="text-[10px]">👍</span>
                  <span className="text-[10px]">❤️</span>
                  <span className="text-[10px]">👏</span>
                  <span className="text-[8px] text-gray-400 ml-0.5">247</span>
                </div>
                <span className="text-[8px] text-gray-400">38 comments · 12 reposts</span>
              </div>

              {/* Action bar */}
              <div className="flex items-center justify-around px-2 py-1.5 border-t border-gray-100">
                {[
                  { icon: "M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5", label: "Like" },
                  { icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z", label: "Comment" },
                  { icon: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z", label: "Repost" },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-1 text-gray-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} /></svg>
                    <span className="text-[7px] font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Generated in badge */}
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-lg w-fit">
              <svg className="w-2.5 h-2.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              <span className="text-[8px] font-semibold text-emerald-600">{l.hiwGeneratedIn}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Input bar ── */}
      <div className="px-3 py-2 border-t border-gray-100 bg-white">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
          <span className="text-[9px] text-gray-300 flex-1">{l.hiwInputPlaceholder || "Describe your next idea..."}</span>
          <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-[#F8935D] to-[#F76B54] flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12l6-6 6 6" transform="rotate(90 12 12)" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * HowItWorksSection — Feature card matching FeatureCard design
 * Mockup on the RIGHT, text on the LEFT. Realistic Posty chat mockup.
 */
export default function HowItWorksSection() {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobileHiw();
  const cardRef = useRef<HTMLDivElement>(null);

  const l = t.landing as Record<string, string>;

  // 3D tilt — desktop only
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rawRotateX = useTransform(mouseY, [0, 1], [3, -3]);
  const rawRotateY = useTransform(mouseX, [0, 1], [-3, 3]);
  const rotateX = useSpring(rawRotateX, { stiffness: 100, damping: 26, restDelta: 0.001 });
  const rotateY = useSpring(rawRotateY, { stiffness: 100, damping: 26, restDelta: 0.001 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card || prefersReducedMotion || isMobile) return;
    const rect = card.getBoundingClientRect();
    mouseX.set(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
    mouseY.set(Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)));
  }, [mouseX, mouseY, prefersReducedMotion, isMobile]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [mouseX, mouseY]);

  const borderClasses = isMobile
    ? "border-cyan-200"
    : "border-cyan-200 hover:border-cyan-400";

  return (
    <div className="mb-[clamp(1.25rem,2vw,1.75rem)]">
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px 100px 0px" }}
        transition={{ duration: 0.4, ease: premiumEase }}
        onMouseMove={isMobile ? undefined : handleMouseMove}
        onMouseLeave={isMobile ? undefined : handleMouseLeave}
        className={isMobile ? "" : "group/card"}
        style={isMobile ? undefined : { perspective: 1200 }}
      >
        <motion.div
          style={isMobile ? undefined : {
            rotateX: prefersReducedMotion ? 0 : rotateX,
            rotateY: prefersReducedMotion ? 0 : rotateY,
            transformStyle: "preserve-3d",
          }}
          className={`
            relative bg-gradient-to-br from-cyan-50/70 via-white to-sky-50/30
            border ${borderClasses} rounded-[clamp(1rem,2vw,1.5rem)]
            px-[clamp(1.25rem,2.5vw,2rem)] py-[clamp(1rem,1.8vw,1.5rem)]
            shadow-sm ${isMobile ? '' : 'hover:shadow-xl shadow-cyan-500/20'}
            transition-shadow duration-300
          `}
        >
          {/* Ambient hover glow */}
          {!isMobile && (
            <div
              className="absolute -inset-4 rounded-3xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 blur-2xl pointer-events-none -z-10"
              style={{ background: "radial-gradient(min(500px, 35vw) circle at 50% 30%, rgba(6, 182, 212, 0.12), transparent 60%)" }}
            />
          )}

          {/* Layout: text LEFT, mockup RIGHT (flex-row-reverse) */}
          <div className="relative z-10 flex flex-col lg:flex-row-reverse gap-[clamp(1.5rem,3vw,2rem)] items-center">

            {/* RIGHT — Mockup */}
            <div className="w-full lg:w-[42%] flex-shrink-0 flex items-center justify-center relative lg:my-[clamp(-1.5rem,-2vw,-2.5rem)]">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "0px 0px 100px 0px" }}
                transition={{ delay: 0.1, duration: 0.35, ease: premiumEase }}
                className="relative z-[4] w-full"
                style={{ maxWidth: "clamp(13rem, 22vw, 20rem)" }}
              >
                <div
                  className="w-full rounded-xl overflow-hidden shadow-xl ring-1 ring-black/[0.08]"
                  style={{ aspectRatio: "4 / 5", transform: "rotate(-2deg)" }}
                >
                  <MockupChat l={l} />
                </div>
              </motion.div>

              {/* Badges — top right */}
              <div className="absolute top-2 right-0 z-20 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-100 text-cyan-700 text-xs font-semibold shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 animate-pulse" />
                  {l.hiwBadge}
                </span>
              </div>
            </div>

            {/* LEFT — Content */}
            <div className="w-full lg:w-1/2 text-center lg:text-left">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-[clamp(2.75rem,3.5vw,3.5rem)] h-[clamp(2.75rem,3.5vw,3.5rem)] rounded-[clamp(0.75rem,1.2vw,1rem)] bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-lg shadow-cyan-500/20 mb-[clamp(0.75rem,1.5vw,1rem)]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              {/* Title */}
              <h3 className="text-[clamp(1.2rem,2.5vw,1.875rem)] font-bold mb-[clamp(0.5rem,1vw,0.75rem)] leading-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-sky-400 to-slate-300">
                {l.hiwTitle} {l.hiwTitleAccent}
              </h3>

              {/* Description */}
              <p className="text-gray-600 text-[clamp(0.9rem,1.2vw,1.125rem)] leading-relaxed mb-[clamp(1rem,1.5vw,1.25rem)]">
                {l.hiwSubtitle}
              </p>

              {/* Value pills */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-[clamp(1rem,1.5vw,1.25rem)]">
                {[l.hiwPill1, l.hiwPill2, l.hiwPill3].map((pill, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 rounded-lg border border-gray-200/60 shadow-sm">
                    <svg className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[10px] sm:text-xs font-medium text-gray-700">{pill}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 font-semibold text-cyan-600 transition-colors duration-300 group/link relative"
                >
                  <span className="relative">
                    {l.featuresTryFree}
                    <span className="absolute -bottom-0.5 left-0 w-0 h-[2px] bg-gradient-to-br from-cyan-500 to-sky-600 transition-all duration-300 group-hover/link:w-full" />
                  </span>
                  <svg className="w-4 h-4 transition-transform duration-300 group-hover/link:translate-x-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
