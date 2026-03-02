"use client";

import LegalLayoutLight from "@/components/layout/LegalLayoutLight";
import { useLanguage } from "@/contexts/LanguageContext";
import { LEGAL_VERSIONS } from "@/lib/i18n/legal";
import Link from "next/link";

export default function TermsOfServicePage() {
  const { t } = useLanguage();
  const terms = t.legal.terms;

  return (
    <LegalLayoutLight title={terms.title}>
      <p className="text-text-secondary text-lg mb-8">
        {t.legal.version} {LEGAL_VERSIONS.terms.version} — {t.legal.lastUpdated} {LEGAL_VERSIONS.terms.date}
      </p>

      {/* Section 1 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{terms.section1.title}</h2>
        <p className="text-text-secondary mb-4">{terms.section1.content1}</p>
        <p className="text-text-secondary">{terms.section1.content2}</p>
      </section>

      {/* Section 2 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{terms.section2.title}</h2>
        <p className="text-text-secondary mb-4">{terms.section2.intro}</p>
        <ul className="list-disc list-inside text-text-secondary space-y-2">
          {terms.section2.features.map((feature, i) => (
            <li key={i}>{feature}</li>
          ))}
        </ul>
      </section>

      {/* Section 3 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{terms.section3.title}</h2>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section3.registration.title}</h3>
        <p className="text-text-secondary mb-4">{terms.section3.registration.content}</p>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section3.age.title}</h3>
        <p className="text-text-secondary mb-4">{terms.section3.age.content}</p>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section3.security.title}</h3>
        <p className="text-text-secondary">{terms.section3.security.content}</p>
      </section>

      {/* Section 4 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{terms.section4.title}</h2>
        <p className="text-text-secondary mb-4">{terms.section4.intro}</p>
        <ul className="list-disc list-inside text-text-secondary space-y-2">
          {terms.section4.obligations.map((obligation, i) => (
            <li key={i}>{obligation}</li>
          ))}
        </ul>
      </section>

      {/* Section 5 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{terms.section5.title}</h2>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section5.posty.title}</h3>
        <p className="text-text-secondary mb-4">{terms.section5.posty.content}</p>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section5.generated.title}</h3>
        <p className="text-text-secondary mb-4">{terms.section5.generated.content}</p>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section5.license.title}</h3>
        <p className="text-text-secondary">{terms.section5.license.content}</p>
      </section>

      {/* Section 6 - Tarification et abonnements */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{terms.section6.title}</h2>
        <p className="text-text-secondary mb-4">{terms.section6.intro}</p>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section6.plans.title}</h3>
        <p className="text-text-secondary mb-4">{terms.section6.plans.content}</p>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section6.trial.title}</h3>
        <p className="text-text-secondary mb-4">{terms.section6.trial.content}</p>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section6.billing.title}</h3>
        <p className="text-text-secondary mb-4">{terms.section6.billing.content}</p>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section6.guarantee.title}</h3>
        <div className="bg-[#F8FAFC] border border-primary/20 rounded-lg p-4 mb-4">
          <p className="text-text-secondary">{terms.section6.guarantee.content}</p>
        </div>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section6.cancellation.title}</h3>
        <p className="text-text-secondary mb-4">{terms.section6.cancellation.content}</p>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section6.withdrawal.title}</h3>
        <p className="text-text-secondary">{terms.section6.withdrawal.content}</p>
      </section>

      {/* Section 7 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{terms.section7.title}</h2>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section7.ai.title}</h3>
        <p className="text-text-secondary mb-4">{terms.section7.ai.content}</p>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section7.availability.title}</h3>
        <p className="text-text-secondary mb-4">{terms.section7.availability.content}</p>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section7.userResponsibility.title}</h3>
        <p className="text-text-secondary">{terms.section7.userResponsibility.content}</p>
      </section>

      {/* Section 8 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{terms.section8.title}</h2>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section8.byUser.title}</h3>
        <p className="text-text-secondary mb-4">{terms.section8.byUser.content}</p>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section8.byPosty.title}</h3>
        <p className="text-text-secondary">{terms.section8.byPosty.content}</p>
      </section>

      {/* Section 9 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{terms.section9.title}</h2>
        <p className="text-text-secondary">
          {terms.section9.content}{" "}
          <Link href="/legal/privacy" className="text-primary hover:underline">
            {terms.section9.privacyLink}
          </Link>
          .
        </p>
      </section>

      {/* Section 10 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{terms.section10.title}</h2>
        <p className="text-text-secondary">{terms.section10.content}</p>
      </section>

      {/* Section 11 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{terms.section11.title}</h2>
        <p className="text-text-secondary mb-4">{terms.section11.content1}</p>
        <p className="text-text-secondary mb-4">{terms.section11.content2}</p>
        <p className="text-text-secondary">{terms.section11.content3}</p>
      </section>

      {/* Section 12 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{terms.section12.title}</h2>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section12.entirety.title}</h3>
        <p className="text-text-secondary mb-4">{terms.section12.entirety.content}</p>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section12.severability.title}</h3>
        <p className="text-text-secondary mb-4">{terms.section12.severability.content}</p>

        <h3 className="text-lg font-medium text-[#1A1D21] mb-2">{terms.section12.noWaiver.title}</h3>
        <p className="text-text-secondary">{terms.section12.noWaiver.content}</p>
      </section>

      {/* Section 13 */}
      <section>
        <h2 className="text-xl font-semibold text-[#1A1D21] mb-4">{terms.section13.title}</h2>
        <p className="text-text-secondary mb-4">{terms.section13.intro}</p>
        <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg p-4 text-text-secondary">
          <p>{terms.section13.email}</p>
        </div>
      </section>
    </LegalLayoutLight>
  );
}
