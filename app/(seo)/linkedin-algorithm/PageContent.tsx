"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { FaqJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { translations } from "./translations";

export default function PageContent({ lang: initialLang = "en" }: { lang?: string }) {
  const { language } = useLanguage();
  const lang = (language in translations ? language : initialLang in translations ? initialLang : "en") as keyof typeof translations;
  const t = translations[lang] ?? translations.en;

  return (
    <>
      <FaqJsonLd questions={[...t.faq]} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: t.breadcrumb, url: "/linkedin-algorithm" },
        ]}
      />

      <article>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF8F5] to-[#FAFBFC] pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-100/40 via-transparent to-transparent" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <span className="inline-block text-sm font-semibold text-[#F8935D] bg-orange-50 px-4 py-1.5 rounded-full mb-6">
              {t.badge}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              {t.heroTitle}{" "}
              <span className="bg-gradient-to-r from-[#F8935D] to-[#F76B54] bg-clip-text text-transparent">
                {t.heroTitleHighlight}
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
              {t.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white font-semibold px-8 py-4 rounded-xl text-lg hover:shadow-xl hover:shadow-orange-200 transition-all"
              >
                {t.ctaPrimary}
              </Link>
              <a
                href="#phases"
                className="bg-white text-gray-700 font-semibold px-8 py-4 rounded-xl text-lg border border-gray-200 hover:border-gray-300 transition-all"
              >
                {t.ctaSecondary}
              </a>
            </div>
          </div>
        </section>

        {/* TL;DR */}
        <section className="py-12 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="bg-gradient-to-br from-[#FFF8F5] to-orange-50/50 rounded-2xl border border-orange-100 p-6 sm:p-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#F8935D] mb-3">
                {t.tldr.label}
              </h2>
              <p className="text-lg text-gray-800 leading-relaxed">{t.tldr.body}</p>
            </div>
          </div>
        </section>

        {/* The 4 Phases */}
        <section id="phases" className="py-16 sm:py-24 bg-[#FAFBFC]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
              {t.phasesSection.title}
            </h2>
            <p className="text-gray-600 text-center max-w-2xl mx-auto mb-14">
              {t.phasesSection.subtitle}
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              {t.phasesSection.phases.map((phase, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-lg font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900">{phase.title}</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-3">{phase.description}</p>
                  <p className="text-sm text-[#F8935D] font-semibold">
                    {phase.outcomeLabel}: <span className="text-gray-700 font-normal">{phase.outcome}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ranking Signals */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
              {t.signalsSection.title}
            </h2>
            <p className="text-gray-600 text-center max-w-2xl mx-auto mb-14">
              {t.signalsSection.subtitle}
            </p>

            <div className="space-y-4">
              {t.signalsSection.signals.map((signal, i) => (
                <div
                  key={i}
                  className="bg-[#FFF8F5] rounded-2xl border border-orange-100/60 p-6 sm:p-7"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl shrink-0">{signal.emoji}</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{signal.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{signal.description}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#F8935D] to-[#F76B54] px-3 py-1.5 rounded-full">
                      {signal.weightLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What Changed (recent updates) */}
        <section className="py-16 sm:py-24 bg-[#FAFBFC]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
              {t.recentChanges.title}
            </h2>
            <p className="text-gray-600 text-center max-w-2xl mx-auto mb-14">
              {t.recentChanges.subtitle}
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              {t.recentChanges.changes.map((change, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#F8935D] mb-2">
                    {change.label}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{change.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{change.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Actionable Tips */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
              {t.tipsSection.title}
            </h2>
            <p className="text-gray-600 text-center max-w-2xl mx-auto mb-14">
              {t.tipsSection.subtitle}
            </p>

            <div className="space-y-4">
              {t.tipsSection.tips.map((tip, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 bg-[#FFF8F5] rounded-xl p-5 border border-orange-100/60"
                >
                  <span className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">{tip.title}</h3>
                    <p className="text-gray-700 leading-relaxed">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Myths */}
        <section className="py-16 sm:py-24 bg-[#FAFBFC]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
              {t.mythsSection.title}
            </h2>
            <p className="text-gray-600 text-center max-w-2xl mx-auto mb-14">
              {t.mythsSection.subtitle}
            </p>

            <div className="space-y-5">
              {t.mythsSection.myths.map((myth, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-200 p-6"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-red-500 bg-red-50 px-2.5 py-1 rounded">
                      {t.mythsSection.mythLabel}
                    </span>
                    <h3 className="text-base font-bold text-gray-900">{myth.claim}</h3>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded shrink-0 mt-0.5">
                      {t.mythsSection.realityLabel}
                    </span>
                    <p className="text-gray-700 leading-relaxed">{myth.reality}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI CTA */}
        <section className="py-16 sm:py-20 bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.aiCta.title}</h2>
            <p className="text-white/80 text-lg max-w-xl mx-auto mb-8">{t.aiCta.subtitle}</p>
            <Link
              href="/signup"
              className="inline-block bg-white text-[#F8935D] font-semibold px-8 py-4 rounded-xl text-lg hover:shadow-xl transition-all"
            >
              {t.aiCta.button}
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 sm:py-24 bg-[#FAFBFC]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-14">
              {t.faqTitle}
            </h2>

            <div className="space-y-4">
              {t.faq.map((item, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-gray-200 p-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.question}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Internal Links */}
        <section className="py-12 bg-white border-t border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
              {t.exploreMore}
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {t.internalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-gray-600 hover:text-[#F8935D] bg-[#FFF8F5] border border-gray-200 rounded-full px-4 py-2 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 sm:py-24 bg-gradient-to-b from-[#FFF8F5] to-[#FAFBFC]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t.finalCta.title}
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
              {t.finalCta.subtitle}
            </p>
            <Link
              href="/signup"
              className="inline-block bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white font-semibold px-10 py-4 rounded-xl text-lg hover:shadow-xl hover:shadow-orange-200 transition-all"
            >
              {t.finalCta.button}
            </Link>
          </div>
        </section>
      </article>
    </>
  );
}
