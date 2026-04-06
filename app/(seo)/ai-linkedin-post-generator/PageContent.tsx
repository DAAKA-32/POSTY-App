"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { FaqJsonLd, BreadcrumbJsonLd, HowToJsonLd } from "@/components/seo/JsonLd";
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
          { name: t.breadcrumb, url: "/ai-linkedin-post-generator" },
        ]}
      />
      <HowToJsonLd
        name={t.howTo.name}
        description={t.howTo.description}
        steps={[...t.howTo.steps]}
        totalTime="PT30S"
        lang={lang}
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
              <Link
                href="/subscription"
                className="bg-white text-gray-700 font-semibold px-8 py-4 rounded-xl text-lg border border-gray-200 hover:border-gray-300 transition-all"
              >
                {t.ctaSecondary}
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 sm:py-24 bg-[#FAFBFC]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
              {t.howItWorks.title}
            </h2>
            <p className="text-gray-600 text-center max-w-xl mx-auto mb-14">
              {t.howItWorks.subtitle}
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {t.howItWorks.steps.map((item, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center relative"
                >
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-sm font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                  <div className="text-4xl mb-4 mt-2">{item.icon}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
              {t.benefits.title}
            </h2>
            <p className="text-gray-600 text-center max-w-xl mx-auto mb-14">
              {t.benefits.subtitle}
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {t.benefits.items.map((benefit, index) => (
                <div
                  key={index}
                  className="bg-[#FFF8F5] rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className="text-3xl mb-3">{benefit.icon}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{benefit.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof Stats */}
        <section className="py-16 sm:py-20 bg-gradient-to-r from-[#F8935D] to-[#F76B54]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="grid sm:grid-cols-3 gap-8 text-center text-white">
              {t.socialProof.items.map((item, index) => (
                <div key={index}>
                  <div className="text-4xl sm:text-5xl font-bold mb-2">{item.stat}</div>
                  <div className="text-white/80 text-lg">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-16 sm:py-24 bg-[#FAFBFC]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
              {t.useCases.title}
            </h2>
            <p className="text-gray-600 text-center max-w-xl mx-auto mb-14">
              {t.useCases.subtitle}
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              {t.useCases.items.map((useCase, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{useCase.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{useCase.desc}</p>
                </div>
              ))}
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
              {t.faq.map((item, index) => (
                <div
                  key={index}
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
