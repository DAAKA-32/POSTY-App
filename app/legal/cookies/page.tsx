"use client";

import LegalLayoutLight from "@/components/layout/LegalLayoutLight";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";
import { LEGAL_VERSIONS } from "@/lib/i18n/legal";

export default function CookiePolicyPage() {
  const { t } = useLanguage();
  const cookies = t.legal.cookies;

  return (
    <LegalLayoutLight title={cookies.title}>
      <p className="text-text-secondary text-lg mb-2">
        {t.legal.lastUpdated} {LEGAL_VERSIONS.cookies.date}
      </p>
      <p className="text-text-muted text-sm mb-8">
        {t.legal.version} {LEGAL_VERSIONS.cookies.version}
      </p>

      {/* Section 1 - Definition */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{cookies.section1.title}</h2>
        <p className="text-text-secondary">{cookies.section1.content}</p>
      </section>

      {/* Section 2 - Cookies utilises */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{cookies.section2.title}</h2>
        <p className="text-text-secondary mb-6">{cookies.section2.intro}</p>

        {/* 2.1 Essential */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-2">{cookies.section2.essential.title}</h3>
          <p className="text-text-secondary mb-3">{cookies.section2.essential.description}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-text-secondary">
              <thead>
                <tr className="border-b border-dark-border text-left">
                  <th className="py-2 pr-4 font-medium text-white">Cookie</th>
                  <th className="py-2 pr-4 font-medium text-white">Finalite</th>
                  <th className="py-2 pr-4 font-medium text-white">Duree</th>
                  <th className="py-2 font-medium text-white">Fournisseur</th>
                </tr>
              </thead>
              <tbody>
                {cookies.section2.essential.items.map((item, i) => (
                  <tr key={i} className="border-b border-dark-border/50">
                    <td className="py-2 pr-4 font-mono text-xs text-primary">{item.name}</td>
                    <td className="py-2 pr-4">{item.purpose}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{item.duration}</td>
                    <td className="py-2 whitespace-nowrap">{item.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2.2 Functional */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-2">{cookies.section2.functional.title}</h3>
          <p className="text-text-secondary mb-3">{cookies.section2.functional.description}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-text-secondary">
              <thead>
                <tr className="border-b border-dark-border text-left">
                  <th className="py-2 pr-4 font-medium text-white">Cookie</th>
                  <th className="py-2 pr-4 font-medium text-white">Finalite</th>
                  <th className="py-2 pr-4 font-medium text-white">Duree</th>
                  <th className="py-2 font-medium text-white">Fournisseur</th>
                </tr>
              </thead>
              <tbody>
                {cookies.section2.functional.items.map((item, i) => (
                  <tr key={i} className="border-b border-dark-border/50">
                    <td className="py-2 pr-4 font-mono text-xs text-primary">{item.name}</td>
                    <td className="py-2 pr-4">{item.purpose}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{item.duration}</td>
                    <td className="py-2 whitespace-nowrap">{item.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2.3 Analytics */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-2">{cookies.section2.analytics.title}</h3>
          <p className="text-text-secondary mb-3">{cookies.section2.analytics.description}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-text-secondary">
              <thead>
                <tr className="border-b border-dark-border text-left">
                  <th className="py-2 pr-4 font-medium text-white">Cookie</th>
                  <th className="py-2 pr-4 font-medium text-white">Finalite</th>
                  <th className="py-2 pr-4 font-medium text-white">Duree</th>
                  <th className="py-2 font-medium text-white">Fournisseur</th>
                </tr>
              </thead>
              <tbody>
                {cookies.section2.analytics.items.map((item, i) => (
                  <tr key={i} className="border-b border-dark-border/50">
                    <td className="py-2 pr-4 font-mono text-xs text-primary">{item.name}</td>
                    <td className="py-2 pr-4">{item.purpose}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{item.duration}</td>
                    <td className="py-2 whitespace-nowrap">{item.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-text-secondary">{cookies.section2.analytics.noThirdParty}</p>
          </div>
        </div>

        {/* 2.4 Third Party */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-2">{cookies.section2.thirdParty.title}</h3>
          <p className="text-text-secondary mb-3">{cookies.section2.thirdParty.description}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-text-secondary">
              <thead>
                <tr className="border-b border-dark-border text-left">
                  <th className="py-2 pr-4 font-medium text-white">Service</th>
                  <th className="py-2 pr-4 font-medium text-white">Finalite</th>
                  <th className="py-2 pr-4 font-medium text-white">Duree</th>
                  <th className="py-2 font-medium text-white">Fournisseur</th>
                </tr>
              </thead>
              <tbody>
                {cookies.section2.thirdParty.items.map((item, i) => (
                  <tr key={i} className="border-b border-dark-border/50">
                    <td className="py-2 pr-4 font-mono text-xs text-primary">{item.name}</td>
                    <td className="py-2 pr-4">{item.purpose}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{item.duration}</td>
                    <td className="py-2 whitespace-nowrap">{item.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-text-muted text-sm mt-3">{cookies.section2.thirdParty.note}</p>
        </div>
      </section>

      {/* Section 3 - Gestion des preferences */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{cookies.section3.title}</h2>
        <p className="text-text-secondary mb-4">{cookies.section3.intro}</p>
        <div className="space-y-3">
          {cookies.section3.methods.map((method, i) => (
            <div key={i} className="bg-dark-card border border-dark-border rounded-lg p-4">
              <h3 className="font-medium text-white mb-1">{method.title}</h3>
              <p className="text-text-muted text-sm">{method.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{cookies.section4.title}</h2>
        <p className="text-text-secondary">{cookies.section4.content}</p>
      </section>

      {/* Section 5 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{cookies.section5.title}</h2>
        <p className="text-text-secondary">{cookies.section5.content}</p>
      </section>

      {/* Section 6 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{cookies.section6.title}</h2>
        <p className="text-text-secondary">{cookies.section6.content}</p>
      </section>

      {/* Section 7 - Contact */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">{cookies.section7.title}</h2>
        <p className="text-text-secondary mb-4">{cookies.section7.intro}</p>
        <div className="bg-dark-card border border-dark-border rounded-lg p-4 text-text-secondary">
          <p>{cookies.section7.email}</p>
        </div>
        <p className="text-text-muted text-sm mt-4">
          Voir aussi notre{" "}
          <Link href="/legal/privacy" className="text-primary hover:underline">
            Politique de confidentialité
          </Link>
          {" "}pour plus d&apos;informations sur le traitement de vos données personnelles.
        </p>
      </section>
    </LegalLayoutLight>
  );
}
