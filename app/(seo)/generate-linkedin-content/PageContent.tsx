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
          { name: t.breadcrumb, url: "/generate-linkedin-content" },
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
              <Link
                href="/subscription"
                className="bg-white text-gray-700 font-semibold px-8 py-4 rounded-xl text-lg border border-gray-200 hover:border-gray-300 transition-all"
              >
                {t.ctaSecondary}
              </Link>
            </div>
          </div>
        </section>

        {/* The Consistency Problem */}
        <section className="py-16 sm:py-24 bg-[#FAFBFC]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
              {t.consistencyProblem.title}
            </h2>
            <p className="text-gray-600 text-center max-w-2xl mx-auto mb-14">
              {t.consistencyProblem.subtitle}
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              {t.consistencyProblem.items.map((pain) => (
                <div key={pain.title} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="text-3xl mb-3">{pain.icon}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{pain.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{pain.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
              {t.features.title}
            </h2>
            <p className="text-gray-600 text-center max-w-xl mx-auto mb-14">
              {t.features.subtitle}
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {t.features.items.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-[#FFF8F5] rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className="text-3xl mb-3">{feature.icon}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Before / After */}
        <section className="py-16 sm:py-24 bg-[#FAFBFC]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-14">
              {t.beforeAfter.title}
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Before */}
              <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 sm:p-8">
                <div className="inline-block text-sm font-semibold text-red-500 bg-red-50 px-3 py-1 rounded-full mb-6">
                  {t.beforeAfter.before.label}
                </div>
                <ul className="space-y-4">
                  {t.beforeAfter.before.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center mt-0.5 text-xs">
                        &#10005;
                      </span>
                      <span className="text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* After */}
              <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-6 sm:p-8">
                <div className="inline-block text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full mb-6">
                  {t.beforeAfter.after.label}
                </div>
                <ul className="space-y-4">
                  {t.beforeAfter.after.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center mt-0.5 text-xs">
                        &#10003;
                      </span>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Preview */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t.pricing.title}
            </h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto mb-10">
              {t.pricing.subtitle}
            </p>

            <div className="grid sm:grid-cols-3 gap-6 mb-10">
              {t.pricing.tiers.map((tier) => (
                <div
                  key={tier.plan}
                  className={`rounded-2xl border p-6 ${
                    tier.highlight
                      ? "border-[#F8935D] shadow-lg shadow-orange-100 bg-[#FFF8F5]"
                      : "border-gray-200 bg-white shadow-sm"
                  }`}
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{tier.plan}</h3>
                  <div className="flex items-baseline justify-center gap-1 mb-4">
                    <span className="text-3xl font-bold text-gray-900">
                      {tier.price === "0"
                        ? lang === "fr"
                          ? "Gratuit"
                          : "Free"
                        : `\u20AC${tier.price}`}
                    </span>
                    {tier.price !== "0" && <span className="text-gray-500 text-sm">{tier.period}</span>}
                  </div>
                  <ul className="space-y-2 text-sm text-gray-600 mb-6">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <span className="text-[#F8935D]">&#10003;</span> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/subscription"
                    className={`block text-center py-2.5 rounded-xl font-semibold text-sm transition-all ${
                      tier.highlight
                        ? "bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white hover:shadow-lg hover:shadow-orange-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {tier.cta}
                  </Link>
                </div>
              ))}
            </div>

            <Link
              href="/subscription"
              className="text-[#F8935D] font-semibold hover:underline"
            >
              {t.pricing.viewAll} &rarr;
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
              {t.faq.map((item) => (
                <div
                  key={item.question}
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
