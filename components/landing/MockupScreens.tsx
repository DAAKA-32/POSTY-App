"use client";

/**
 * MockupScreens — Real product screenshots for the landing page
 * "Aperçu produit" carousel.
 *
 * 6 screens: Copilot (custom JSX), App, Chat, History, Schedule, Dashboard
 * Each slide renders either a screenshot or a custom React component.
 */

import { type ReactNode, useState, useEffect, useRef } from "react";
import Image from "next/image";

export interface MockupScreen {
  id: string;
  src: string;
  alt: string;
  label: string;
  /** Optional custom component to render instead of an image */
  component?: ReactNode;
}

/** Build translated MockupScreen array from translation object */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMockupScreens(landing: any): MockupScreen[] {
  return [
    { id: "chat-welcome", src: "/images/screenshots/app.png", alt: landing.mockupChatAlt, label: landing.mockupChatLabel },
    { id: "conversation", src: "/images/screenshots/chat.png", alt: landing.mockupConversationAlt, label: landing.mockupConversationLabel },
    { id: "history", src: "/images/screenshots/history.png", alt: landing.mockupHistoryAlt, label: landing.mockupHistoryLabel },
    { id: "schedule", src: "/images/screenshots/schedule.png", alt: landing.mockupScheduleAlt, label: landing.mockupScheduleLabel },
    { id: "analytics", src: "/images/screenshots/dashboard.png", alt: landing.mockupAnalyticsAlt, label: landing.mockupAnalyticsLabel },
  ];
}

/* ── Phase timing for the looping conversation animation ───────────── *
 * 0: User message  1: Typing  2: AI response  3: Buttons appear
 * 4: Click Publish  5: Engagement notif  6: Prospect DM  7: Success  8: Hold */
const PHASE_DURATIONS = [1500, 1200, 300, 1800, 600, 1800, 1800, 2500, 1500];
const TOTAL_PHASES = PHASE_DURATIONS.length;

/** AI Copilot experience — animated loop: post creation → client closing */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CopilotSection({ landing }: { landing: any }) {
  const [phase, setPhase] = useState(-1);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  /* Slide-in on scroll into viewport */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          setTimeout(() => setPhase(0), 700);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* Seamless looping — wraps back to 0, no blank screen */
  useEffect(() => {
    if (phase < 0) return;
    const t = setTimeout(() => {
      setPhase((p) => (p + 1) % TOTAL_PHASES);
    }, PHASE_DURATIONS[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  /* Respect prefers-reduced-motion */
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      setPhase(3);
    }
  }, []);

  const on = (min: number) => phase >= min;
  const onRange = (min: number, max: number) => phase >= min && phase < max;

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden h-screen max-h-screen flex items-center py-6 sm:py-8"
    >
      {/* ── Background ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FEF3EE] via-[#FFF5F0] to-[#FEF3EE]" />
      <div className="absolute top-[8%] right-[8%] w-40 h-40 sm:w-64 sm:h-64 bg-[#F8935D]/10 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: "4s" }} />
      <div className="absolute bottom-[10%] left-[5%] w-32 h-32 sm:w-48 sm:h-48 bg-[#F76B54]/8 rounded-full blur-[60px] animate-pulse" style={{ animationDuration: "5s", animationDelay: "1s" }} />
      <div className="absolute top-[45%] left-[50%] w-56 h-56 bg-[#F8935D]/5 rounded-full blur-[100px]" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(#F8935D 1px, transparent 1px), linear-gradient(90deg, #F8935D 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 lg:gap-16">

          {/* ── LEFT — Text content (slides in from left) ──────────── */}
          <div
            className={`flex-1 min-w-0 text-center md:text-left transition-all duration-700 ease-out ${
              inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"
            }`}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-[#F8935D]/20 shadow-sm mb-3 sm:mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F8935D] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F8935D]" />
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-[#F8935D] uppercase tracking-wider">AI-Powered</span>
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-[1.15] mb-2 sm:mb-3">
              {landing.aiExpTitle}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
                {landing.aiExpTitleAccent}
              </span>
            </h2>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm md:text-base text-gray-500 leading-relaxed max-w-md mx-auto md:mx-0 mb-4 sm:mb-6">
              {landing.aiExpSubtitle}
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4 sm:mb-5">
              {[landing.aiExpFeature1Title, landing.aiExpFeature2Title, landing.aiExpFeature3Title].map((f: string, i: number) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 rounded-lg border border-gray-200/60 shadow-sm">
                  <svg className="w-3.5 h-3.5 text-[#F8935D] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[10px] sm:text-xs font-medium text-gray-700">{f}</span>
                </div>
              ))}
            </div>

            {/* Before/After — concrete line-by-line comparison with staggered reveal */}
            <div
              className={`max-w-md mx-auto md:mx-0 rounded-xl border border-gray-200/60 bg-white/70 overflow-hidden shadow-sm transition-all duration-700 ease-out ${
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: inView ? "0.5s" : "0s" }}
            >
              {/* Header row */}
              <div className="grid grid-cols-[1fr,auto,1fr] text-center border-b border-gray-100">
                <span className="py-2 text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">{landing.aiExpWithout || "Without"}</span>
                <span className="py-2 w-px bg-gray-100" />
                <span className="py-2 text-[10px] sm:text-xs font-semibold text-[#F8935D] uppercase tracking-wider">{landing.aiExpWith || "With Posty"}</span>
              </div>
              {/* Comparison rows — each row slides in with increasing delay */}
              {[
                { before: landing.aiExpRow1Before, after: landing.aiExpRow1After },
                { before: landing.aiExpRow2Before, after: landing.aiExpRow2After },
                { before: landing.aiExpRow3Before, after: landing.aiExpRow3After },
              ].map((row, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-[1fr,auto,1fr] items-center transition-all duration-500 ease-out ${i < 2 ? "border-b border-gray-50" : ""} ${
                    inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                  }`}
                  style={{ transitionDelay: inView ? `${0.7 + i * 0.15}s` : "0s" }}
                >
                  {/* Before — faded, struck through */}
                  <div className="flex items-center gap-1.5 px-3 py-2.5">
                    <svg className="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    <span className="text-[10px] sm:text-xs text-gray-400 line-through decoration-gray-300">{row.before}</span>
                  </div>
                  <span className="w-px self-stretch bg-gray-100" />
                  {/* After — bold, accented, slides in from right */}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-2.5 transition-all duration-500 ease-out ${
                      inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                    }`}
                    style={{ transitionDelay: inView ? `${0.85 + i * 0.15}s` : "0s" }}
                  >
                    <svg className="w-3 h-3 text-[#F8935D] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    <span className="text-[10px] sm:text-xs text-gray-700 font-medium">{row.after}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT — Animated mockup (slides in from right) ──────── */}
          <div
            className={`flex-shrink-0 w-full max-w-[280px] sm:max-w-[300px] md:max-w-[340px] lg:max-w-[380px] transition-all duration-700 delay-200 ease-out ${
              inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"
            }`}
          >
            {/* Floating container — mockup + overlays move together */}
            <div className="relative animate-[copilotCardFloat_6s_ease-in-out_infinite]">
              {/* Pulsing ring */}
              <div className="absolute -inset-2 sm:-inset-4 rounded-[28px] border border-[#F8935D]/12 animate-[copilotPulseRing_3s_ease-in-out_infinite]" />
              {/* Glow */}
              <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-br from-[#F8935D]/15 to-[#F76B54]/8 rounded-[32px] blur-2xl" />

              {/* ── Browser chrome ──────────────────────────────────── */}
              <div className="relative bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 shadow-2xl shadow-gray-400/25 overflow-hidden">
                {/* Title bar */}
                <div className="flex items-center px-3 sm:px-4 py-2 sm:py-2.5 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                  </div>
                  <div className="flex-1 mx-6 sm:mx-12">
                    <div className="bg-gray-100/80 rounded-md px-3 py-1 flex items-center justify-center gap-1.5">
                      <svg className="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium">postyapp.ai</span>
                    </div>
                  </div>
                  <div className="w-12" />
                </div>

                {/* App content */}
                <div className="flex flex-col bg-[#FAFAF8]" style={{ maxHeight: "clamp(300px, 55vh, 480px)" }}>
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Chat header */}
                    <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-gray-100 bg-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg overflow-hidden shadow-sm">
                          <Image src="/logo.png" alt="Posty" width={28} height={28} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs font-bold text-gray-900">Posty AI</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="px-2 py-0.5 rounded bg-[#F8935D]/10 text-[8px] font-bold text-[#F8935D]">LinkedIn</div>
                        <div className="px-2 py-0.5 rounded bg-emerald-50 text-[8px] font-bold text-emerald-600">24/7</div>
                      </div>
                    </div>

                    {/* ── Messages — animated phase sequence ────────── */}
                    <div className="relative flex-1 overflow-hidden px-3 sm:px-4 py-3 space-y-2.5">

                      {/* Phase 0 — User message */}
                      <div className={`flex justify-end transition-all duration-500 ease-out ${on(0) ? "opacity-100 translate-x-0" : "opacity-0 translate-x-5"}`}>
                        <div className="flex items-end gap-1.5">
                          <div className="max-w-[75%] bg-gradient-to-r from-[#F8935D] to-[#F76B54] !text-white text-[10px] sm:text-xs px-3 py-2 rounded-2xl rounded-tr-sm shadow-md shadow-[#F8935D]/15">
                            {landing.aiExpChatExample}
                          </div>
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-[7px] font-bold text-white">EC</span>
                          </div>
                        </div>
                      </div>

                      {/* Phase 1 — Typing indicator (collapses when done) */}
                      <div className={`transition-all duration-300 ease-out overflow-hidden ${onRange(1, 2) ? "max-h-12 opacity-100" : "max-h-0 opacity-0"}`}>
                        <div className="flex items-end gap-1.5 pb-0.5">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#F8935D] to-[#F76B54] flex items-center justify-center flex-shrink-0">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          </div>
                          <div className="bg-white border border-gray-100 px-3 py-2 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#F8935D] animate-[copilotTypingDot_1.2s_ease-in-out_infinite]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#F8935D] animate-[copilotTypingDot_1.2s_ease-in-out_0.2s_infinite]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#F8935D] animate-[copilotTypingDot_1.2s_ease-in-out_0.4s_infinite]" />
                          </div>
                        </div>
                      </div>

                      {/* Phase 2+ — AI response with LinkedIn post previews */}
                      <div className={`flex items-start gap-1.5 transition-all duration-500 ease-out ${on(2) ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-5"}`}>
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#F8935D] to-[#F76B54] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        </div>
                        <div className="max-w-[85%] space-y-2">
                          <div className="bg-white border border-gray-100 text-gray-600 text-[10px] sm:text-xs px-3 py-2 rounded-2xl rounded-tl-sm shadow-sm">
                            <p className="leading-relaxed">{landing.aiExpChatResponse}</p>
                          </div>

                          {/* Two LinkedIn post previews */}
                          <div className="flex gap-2">
                            {/* Version A — Storytelling */}
                            <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                              <div className="px-2.5 py-1.5 border-b border-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-3.5 h-3.5 rounded bg-[#F8935D]/15 flex items-center justify-center"><span className="text-[7px] font-bold text-[#F8935D]">A</span></div>
                                  <span className="text-[8px] font-semibold text-gray-600">Storytelling</span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <svg className="w-2.5 h-2.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                  <span className="text-[8px] font-medium text-gray-400">8.5</span>
                                </div>
                              </div>
                              <div className="px-2.5 py-2">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <div className="w-4 h-4 rounded-full bg-gray-200" />
                                  <div className="space-y-0.5">
                                    <div className="h-1 bg-gray-200 rounded-full w-12" />
                                    <div className="h-1 bg-gray-100 rounded-full w-8" />
                                  </div>
                                </div>
                                <div className="space-y-[3px]">
                                  <div className="h-[3px] bg-gray-200 rounded-full w-full" />
                                  <div className="h-[3px] bg-gray-200 rounded-full w-[92%]" />
                                  <div className="h-[3px] bg-gray-100 rounded-full w-[78%]" />
                                  <div className="h-[3px] bg-gray-100 rounded-full w-[85%]" />
                                  <div className="h-[3px] bg-gray-50 rounded-full w-[60%]" />
                                </div>
                                <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-gray-50">
                                  <div className="flex items-center gap-0.5"><svg className="w-2.5 h-2.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" /></svg><span className="text-[7px] text-gray-400">247</span></div>
                                  <div className="flex items-center gap-0.5"><svg className="w-2.5 h-2.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2z" clipRule="evenodd" /></svg><span className="text-[7px] text-gray-400">38</span></div>
                                </div>
                              </div>
                            </div>

                            {/* Version B — Business (selected) */}
                            <div className="flex-1 bg-white rounded-xl border-2 border-[#F8935D]/30 shadow-md shadow-[#F8935D]/5 overflow-hidden relative">
                              <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#F8935D] flex items-center justify-center"><svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>
                              <div className="px-2.5 py-1.5 border-b border-[#F8935D]/10 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-3.5 h-3.5 rounded bg-[#F76B54]/15 flex items-center justify-center"><span className="text-[7px] font-bold text-[#F76B54]">B</span></div>
                                  <span className="text-[8px] font-semibold text-gray-600">Business</span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <svg className="w-2.5 h-2.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                  <span className="text-[8px] font-bold text-[#F8935D]">9.2</span>
                                </div>
                              </div>
                              <div className="px-2.5 py-2">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                                  <div className="space-y-0.5">
                                    <div className="h-1 bg-gray-300 rounded-full w-14" />
                                    <div className="h-1 bg-gray-200 rounded-full w-9" />
                                  </div>
                                </div>
                                <div className="space-y-[3px]">
                                  <div className="h-[3px] bg-[#F8935D]/20 rounded-full w-full" />
                                  <div className="h-[3px] bg-[#F8935D]/20 rounded-full w-[88%]" />
                                  <div className="h-[3px] bg-[#F8935D]/15 rounded-full w-[95%]" />
                                  <div className="h-[3px] bg-[#F8935D]/15 rounded-full w-[72%]" />
                                  <div className="h-[3px] bg-[#F8935D]/10 rounded-full w-[55%]" />
                                </div>
                                <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-[#F8935D]/10">
                                  <div className="flex items-center gap-0.5"><svg className="w-2.5 h-2.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" /></svg><span className="text-[7px] text-gray-400">312</span></div>
                                  <div className="flex items-center gap-0.5"><svg className="w-2.5 h-2.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2z" clipRule="evenodd" /></svg><span className="text-[7px] text-gray-400">52</span></div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Phase 3 — Action buttons / Phase 4 — Click Publish */}
                          <div className={`flex gap-1.5 transition-all duration-500 ease-out ${on(3) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
                            <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg shadow-md transition-all duration-200 ${
                              on(4)
                                ? `bg-emerald-500 shadow-emerald-500/20 ${onRange(4, 5) ? "scale-[0.92]" : "scale-100"}`
                                : "bg-gradient-to-r from-[#F8935D] to-[#F76B54] shadow-[#F8935D]/20"
                            }`}>
                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              <span className="text-[8px] font-bold text-white">{on(4) ? "Published!" : "Publish"}</span>
                            </div>
                            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg">
                              <svg className="w-2.5 h-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              <span className="text-[8px] font-semibold text-gray-600">Schedule</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom blur fade — premium depth effect */}
                      <div className="absolute bottom-0 left-0 right-0 h-8 sm:h-12 bg-gradient-to-t from-[#FAFAF8] via-[#FAFAF8]/70 to-transparent pointer-events-none" />
                    </div>

                  </div>
                </div>
              </div>

              {/* ── Notification overlays — story: engagement → prospect → close ── */}

              {/* Phase 5 — LinkedIn engagement notification (after publish) */}
              <div
                className={`absolute top-14 right-0 sm:-right-3 z-20 transition-all duration-500 ease-out ${
                  on(5) ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
                }`}
              >
                <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200/80 shadow-xl shadow-gray-400/15 px-2.5 py-2 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#0A66C2] flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                  </div>
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-semibold text-gray-800">{landing.aiExpNotifViews}</p>
                    <p className="text-[7px] sm:text-[8px] text-gray-400">{landing.aiExpNotifViewsSub}</p>
                  </div>
                </div>
              </div>

              {/* Phase 6 — Prospect DM notification */}
              <div
                className={`absolute top-[6.5rem] right-1 sm:-right-1 z-20 transition-all duration-500 delay-100 ease-out ${
                  on(6) ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
                }`}
              >
                <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200/80 shadow-xl shadow-gray-400/15 px-2.5 py-2 flex items-start gap-2 max-w-[165px] sm:max-w-[185px]">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[8px] font-bold text-white">MD</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-semibold text-gray-800">Marc D.</p>
                    <p className="text-[7px] sm:text-[8px] text-gray-500 leading-relaxed">{landing.aiExpNotifDm}</p>
                  </div>
                </div>
              </div>

              {/* Phase 7 — Success: meeting scheduled */}
              <div
                className={`absolute bottom-2 sm:-bottom-4 left-1/2 -translate-x-1/2 z-20 transition-all duration-500 ease-out ${
                  on(7) ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95"
                }`}
              >
                <div className="bg-emerald-500 text-white rounded-full px-3.5 py-2 flex items-center gap-2 shadow-lg shadow-emerald-500/25 whitespace-nowrap">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-bold">{landing.aiExpNotifSuccess}</p>
                    <p className="text-[7px] sm:text-[8px] text-emerald-100">{landing.aiExpNotifSuccessDetail}</p>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}

/** @deprecated Use getMockupScreens(t.landing) instead for i18n support */
export const MOCKUP_SCREENS: MockupScreen[] = [
  { id: "chat-welcome", src: "/images/screenshots/app.png", alt: "Vue principale de l'application Posty", label: "Chat" },
  { id: "conversation", src: "/images/screenshots/chat.png", alt: "Conversation avec l'IA Posty", label: "Conversation" },
  { id: "history", src: "/images/screenshots/history.png", alt: "Historique des posts générés", label: "Historique" },
  { id: "schedule", src: "/images/screenshots/schedule.png", alt: "Programmation des posts LinkedIn", label: "Programmes" },
  { id: "analytics", src: "/images/screenshots/dashboard.png", alt: "Tableau de bord et analytics", label: "Analytics" },
];
