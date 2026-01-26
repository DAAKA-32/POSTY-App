"use client";

import LegalLayoutLight from "@/components/layout/LegalLayoutLight";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PrivacyPolicyPage() {
  const { t, language } = useLanguage();
  const privacy = t.legal.privacy;

  return (
    <LegalLayoutLight title={privacy.title}>
      <p className="text-gray-300 text-lg mb-8">
        {t.legal.lastUpdated} {new Date().toLocaleDateString(language === "fr" ? "fr-FR" : "en-US")}
      </p>

      {/* Section 1 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{privacy.section1.title}</h2>
        <p className="text-gray-300 mb-4">{privacy.section1.content1}</p>
        <p className="text-gray-300">{privacy.section1.content2}</p>
      </section>

      {/* Section 2 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{privacy.section2.title}</h2>
        <div className="bg-dark-card border border-dark-border rounded-lg p-4 text-gray-300">
          <p><strong className="text-white">{privacy.section2.companyName}</strong></p>
          <p>{privacy.section2.email}</p>
          <p>{privacy.section2.gdprContact}</p>
        </div>
      </section>

      {/* Section 3 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{privacy.section3.title}</h2>
        <p className="text-gray-300 mb-4">{privacy.section3.intro}</p>

        <h3 className="text-lg font-medium text-white mb-2">{privacy.section3.identification.title}</h3>
        <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
          {privacy.section3.identification.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <h3 className="text-lg font-medium text-white mb-2">{privacy.section3.profile.title}</h3>
        <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
          {privacy.section3.profile.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <h3 className="text-lg font-medium text-white mb-2">{privacy.section3.usage.title}</h3>
        <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
          {privacy.section3.usage.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <h3 className="text-lg font-medium text-white mb-2">{privacy.section3.technical.title}</h3>
        <ul className="list-disc list-inside text-gray-300 space-y-1">
          {privacy.section3.technical.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Section 4 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{privacy.section4.title}</h2>
        <p className="text-gray-300 mb-4">{privacy.section4.intro}</p>
        <ul className="list-disc list-inside text-gray-300 space-y-2">
          {privacy.section4.purposes.map((purpose, i) => (
            <li key={i}>
              <strong className="text-white">{purpose.label}</strong> {purpose.desc}
            </li>
          ))}
        </ul>
      </section>

      {/* Section 5 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{privacy.section5.title}</h2>
        <p className="text-gray-300 mb-4">{privacy.section5.intro}</p>
        <ul className="list-disc list-inside text-gray-300 space-y-2">
          {privacy.section5.bases.map((basis, i) => (
            <li key={i}>
              <strong className="text-white">{basis.label}</strong> {basis.desc}
            </li>
          ))}
        </ul>
      </section>

      {/* Section 6 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{privacy.section6.title}</h2>
        <p className="text-gray-300 mb-4">{privacy.section6.intro}</p>
        <ul className="list-disc list-inside text-gray-300 space-y-2">
          {privacy.section6.partners.map((partner, i) => (
            <li key={i}>
              <strong className="text-white">{partner.name}</strong> {partner.desc}
            </li>
          ))}
        </ul>
        <p className="text-gray-300 mt-4">{privacy.section6.noSale}</p>
      </section>

      {/* Section 7 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{privacy.section7.title}</h2>
        <p className="text-gray-300 mb-4">{privacy.section7.intro}</p>
        <ul className="list-disc list-inside text-gray-300 space-y-2">
          {privacy.section7.periods.map((period, i) => (
            <li key={i}>
              <strong className="text-white">{period.label}</strong> {period.duration}
            </li>
          ))}
        </ul>
      </section>

      {/* Section 8 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{privacy.section8.title}</h2>
        <p className="text-gray-300 mb-4">{privacy.section8.intro}</p>
        <div className="grid gap-4 md:grid-cols-2">
          {privacy.section8.rights.map((right, i) => (
            <div key={i} className="bg-dark-card border border-dark-border rounded-lg p-4">
              <h3 className="font-medium text-white mb-2">{right.title}</h3>
              <p className="text-gray-400 text-sm">{right.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-gray-300 mt-4">{privacy.section8.exercise}</p>
      </section>

      {/* Section 9 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{privacy.section9.title}</h2>
        <p className="text-gray-300 mb-4">{privacy.section9.intro}</p>
        <ul className="list-disc list-inside text-gray-300 space-y-1">
          {privacy.section9.measures.map((measure, i) => (
            <li key={i}>{measure}</li>
          ))}
        </ul>
      </section>

      {/* Section 10 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{privacy.section10.title}</h2>
        <p className="text-gray-300">{privacy.section10.content}</p>
      </section>

      {/* Section 11 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{privacy.section11.title}</h2>
        <p className="text-gray-300">{privacy.section11.content}</p>
      </section>

      {/* Section 12 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{privacy.section12.title}</h2>
        <p className="text-gray-300">{privacy.section12.content}</p>
      </section>

      {/* Section 13 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{privacy.section13.title}</h2>
        <p className="text-gray-300">
          {privacy.section13.content}{" "}
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline ml-1"
          >
            {privacy.section13.cnilLink}
          </a>
        </p>
      </section>

      {/* Section 14 */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">{privacy.section14.title}</h2>
        <p className="text-gray-300 mb-4">{privacy.section14.intro}</p>
        <div className="bg-dark-card border border-dark-border rounded-lg p-4 text-gray-300">
          <p>{privacy.section14.emailGeneral}</p>
          <p>{privacy.section14.emailGDPR}</p>
        </div>
      </section>
    </LegalLayoutLight>
  );
}
