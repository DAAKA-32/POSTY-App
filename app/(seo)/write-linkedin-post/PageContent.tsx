"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { FaqJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { translations } from "./translations";

export default function PageContent({ lang: initialLang = "en" }: { lang?: "fr" | "en" }) {
  const { language } = useLanguage();
  const lang = language === "fr" ? "fr" : initialLang;
  const t = lang === "fr" ? translations.fr : translations.en;

  return (
    <>
      <FaqJsonLd questions={[...t.faq]} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: t.breadcrumb, url: "/write-linkedin-post" },
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
              {t.heroTitle}
              <span className="bg-gradient-to-r from-[#F8935D] to-[#F76B54] bg-clip-text text-transparent">
                {t.heroTitleHighlight}
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
              {t.heroSubtitle}
            </p>
            <Link
              href="/signup"
              className="inline-block bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white font-semibold px-8 py-4 rounded-xl text-lg hover:shadow-xl hover:shadow-orange-200 transition-all"
            >
              {t.ctaPrimary}
            </Link>
          </div>
        </section>

        {/* Anatomy of a High-Performing Post */}
        <section className="py-16 sm:py-24 bg-[#FAFBFC]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
              {t.anatomy.title}
            </h2>
            <p className="text-gray-600 text-center max-w-xl mx-auto mb-14">
              {t.anatomy.subtitle}
            </p>

            <div className="space-y-6">
              {t.anatomy.items.map((section) => (
                <div
                  key={section.number}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 flex gap-5"
                >
                  <div className={`hidden sm:flex shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${section.color} items-center justify-center text-white font-bold text-lg`}>
                    {section.number}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{section.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{section.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Common Mistakes */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
              {t.mistakes.title}
            </h2>
            <p className="text-gray-600 text-center max-w-xl mx-auto mb-14">
              {t.mistakes.subtitle}
            </p>

            <div className="space-y-4">
              {t.mistakes.items.map((item, i) => (
                <div
                  key={i}
                  className="bg-[#FFF8F5] rounded-2xl border border-gray-200 p-6"
                >
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.mistake}</h3>
                      <p className="text-gray-600 leading-relaxed">{item.fix}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Let AI Handle It */}
        <section className="py-16 sm:py-24 bg-gradient-to-b from-[#FFF8F5] to-[#FAFBFC]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 sm:p-12 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                {t.aiSection.title}
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-6">
                {t.aiSection.paragraphs[0]}
              </p>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-8">
                {t.aiSection.paragraphs[1]}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup"
                  className="bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white font-semibold px-8 py-4 rounded-xl text-lg hover:shadow-xl hover:shadow-orange-200 transition-all"
                >
                  {t.aiSection.ctaPrimary}
                </Link>
                <Link
                  href="/ai-linkedin-post-generator"
                  className="text-[#F8935D] font-semibold px-8 py-4 rounded-xl text-lg border border-[#F8935D]/30 hover:bg-orange-50 transition-all"
                >
                  {t.aiSection.ctaSecondary}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-14">
              {t.faqTitle}
            </h2>

            <div className="space-y-4">
              {t.faq.map((item) => (
                <div
                  key={item.question}
                  className="bg-[#FFF8F5] rounded-2xl border border-gray-200 p-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.question}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Internal Links */}
        <section className="py-12 bg-[#FAFBFC] border-t border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
              {t.exploreMore}
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {t.internalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-gray-600 hover:text-[#F8935D] bg-white border border-gray-200 rounded-full px-4 py-2 transition-colors"
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
