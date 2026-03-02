"use client";

import LegalLayoutLight from "@/components/layout/LegalLayoutLight";
import { useLanguage } from "@/contexts/LanguageContext";
import { LEGAL_VERSIONS } from "@/lib/i18n/legal";

export default function PrivacyPolicyPage() {
  const { t } = useLanguage();
  const privacy = t.legal.privacy;

  return (
    <LegalLayoutLight title={privacy.title}>
      <p className="text-text-secondary text-lg mb-8">
        {t.legal.version} {LEGAL_VERSIONS.privacy.version} — {t.legal.lastUpdated} {LEGAL_VERSIONS.privacy.date}
      </p>

      {/* Section 1 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section1.title}</h2>
        <p className="text-text-secondary mb-4">{privacy.section1.content1}</p>
        <p className="text-text-secondary">{privacy.section1.content2}</p>
      </section>

      {/* Section 2 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section2.title}</h2>
        <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg p-4 text-text-secondary space-y-1">
          <p><strong className="text-[#1A1D21]">{privacy.section2.companyName}</strong></p>
          <p>{privacy.section2.legalEntity}</p>
          <p>{privacy.section2.address}</p>
          <p>{privacy.section2.email}</p>
          <p>{privacy.section2.gdprContact}</p>
        </div>
      </section>

      {/* Section 3 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section3.title}</h2>
        <p className="text-text-secondary mb-4">{privacy.section3.intro}</p>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{privacy.section3.identification.title}</h3>
        <ul className="list-disc list-inside text-text-secondary mb-4 space-y-1">
          {privacy.section3.identification.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{privacy.section3.profile.title}</h3>
        <ul className="list-disc list-inside text-text-secondary mb-4 space-y-1">
          {privacy.section3.profile.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{privacy.section3.usage.title}</h3>
        <ul className="list-disc list-inside text-text-secondary mb-4 space-y-1">
          {privacy.section3.usage.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{privacy.section3.technical.title}</h3>
        <ul className="list-disc list-inside text-text-secondary mb-4 space-y-1">
          {privacy.section3.technical.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{privacy.section3.payment.title}</h3>
        <ul className="list-disc list-inside text-text-secondary space-y-1">
          {privacy.section3.payment.items.map((item: string, i: number) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Section 4 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section4.title}</h2>
        <p className="text-text-secondary mb-4">{privacy.section4.intro}</p>
        <ul className="list-disc list-inside text-text-secondary space-y-2">
          {privacy.section4.purposes.map((purpose, i) => (
            <li key={i}>
              <strong className="text-[#1A1D21]">{purpose.label}</strong> {purpose.desc}
            </li>
          ))}
        </ul>
      </section>

      {/* Section 5 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section5.title}</h2>
        <p className="text-text-secondary mb-4">{privacy.section5.intro}</p>
        <ul className="list-disc list-inside text-text-secondary space-y-2">
          {privacy.section5.bases.map((basis, i) => (
            <li key={i}>
              <strong className="text-[#1A1D21]">{basis.label}</strong> {basis.desc}
            </li>
          ))}
        </ul>
      </section>

      {/* Section 6 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section6.title}</h2>
        <p className="text-text-secondary mb-4">{privacy.section6.intro}</p>
        <ul className="list-disc list-inside text-text-secondary space-y-2">
          {privacy.section6.partners.map((partner, i) => (
            <li key={i}>
              <strong className="text-[#1A1D21]">{partner.name}</strong> {partner.desc}
            </li>
          ))}
        </ul>
        <p className="text-text-secondary mt-4">{privacy.section6.noSale}</p>
      </section>

      {/* Section 7 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section7.title}</h2>
        <p className="text-text-secondary mb-4">{privacy.section7.intro}</p>
        <ul className="list-disc list-inside text-text-secondary space-y-2">
          {privacy.section7.periods.map((period, i) => (
            <li key={i}>
              <strong className="text-[#1A1D21]">{period.label}</strong> {period.duration}
            </li>
          ))}
        </ul>
      </section>

      {/* Section 8 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section8.title}</h2>
        <p className="text-text-secondary mb-4">{privacy.section8.intro}</p>
        <div className="grid gap-4 md:grid-cols-2">
          {privacy.section8.rights.map((right, i) => (
            <div key={i} className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg p-4">
              <h3 className="font-medium text-[#1A1D21] mb-2">{right.title}</h3>
              <p className="text-text-muted text-sm">{right.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-text-secondary mt-4">{privacy.section8.exercise}</p>
      </section>

      {/* Section 9 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section9.title}</h2>
        <p className="text-text-secondary mb-4">{privacy.section9.intro}</p>
        <ul className="list-disc list-inside text-text-secondary space-y-1">
          {privacy.section9.measures.map((measure, i) => (
            <li key={i}>{measure}</li>
          ))}
        </ul>
      </section>

      {/* Section 10 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section10.title}</h2>
        <p className="text-text-secondary">
          {privacy.section10.content}{" "}
          <a href="/legal/cookies" className="text-primary hover:underline">Politique de cookies</a>
        </p>
      </section>

      {/* Section 11 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section11.title}</h2>
        <p className="text-text-secondary">{privacy.section11.content}</p>
      </section>

      {/* Section 12 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section12.title}</h2>
        <p className="text-text-secondary">{privacy.section12.content}</p>
      </section>

      {/* Section 13 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section13.title}</h2>
        <p className="text-text-secondary">
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

      {/* Section 14 - Décisions automatisées */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section14.title}</h2>
        <p className="text-text-secondary mb-4">{privacy.section14.content1}</p>
        <p className="text-text-secondary mb-4">{privacy.section14.content2}</p>
        <p className="text-text-secondary mb-4">{privacy.section14.content3}</p>
        <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg p-4 text-text-secondary">
          <p>{privacy.section14.rights}</p>
        </div>
      </section>

      {/* Section 15 - Sous-traitants et DPA */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section15.title}</h2>
        <p className="text-text-secondary mb-4">{privacy.section15.intro}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="py-3 pr-4 text-[#1A1D21] font-medium">Sous-traitant</th>
                <th className="py-3 pr-4 text-[#1A1D21] font-medium">Finalité</th>
                <th className="py-3 pr-4 text-[#1A1D21] font-medium">Localisation</th>
                <th className="py-3 text-[#1A1D21] font-medium">DPA</th>
              </tr>
            </thead>
            <tbody>
              {privacy.section15.subprocessors.map((sp: { name: string; purpose: string; location: string; dpa: string }, i: number) => (
                <tr key={i} className="border-b border-[#E5E7EB]/50">
                  <td className="py-3 pr-4 text-[#1A1D21] font-medium">{sp.name}</td>
                  <td className="py-3 pr-4 text-text-muted">{sp.purpose}</td>
                  <td className="py-3 pr-4 text-text-muted">{sp.location}</td>
                  <td className="py-3">
                    <a href={sp.dpa} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                      Voir le DPA
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-text-muted text-sm mt-4">{privacy.section15.note}</p>
      </section>

      {/* Section 16 - Notification de violations */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section16.title}</h2>
        <p className="text-text-secondary mb-4">{privacy.section16.content1}</p>
        <ul className="list-disc list-inside text-text-secondary space-y-2 mb-4">
          {privacy.section16.obligations.map((obligation: string, i: number) => (
            <li key={i}>{obligation}</li>
          ))}
        </ul>
        <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg p-4 text-text-secondary">
          <p>{privacy.section16.contact}</p>
        </div>
      </section>

      {/* Section 17 - DPIA */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section17.title}</h2>
        <p className="text-text-secondary">{privacy.section17.content}</p>
      </section>

      {/* Section 18 - Contact */}
      <section>
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{privacy.section18.title}</h2>
        <p className="text-text-secondary mb-4">{privacy.section18.intro}</p>
        <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg p-4 text-text-secondary">
          <p>{privacy.section18.emailGeneral}</p>
          <p>{privacy.section18.emailGDPR}</p>
        </div>
      </section>
    </LegalLayoutLight>
  );
}
