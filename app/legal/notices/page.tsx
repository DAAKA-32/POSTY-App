"use client";

import LegalLayoutLight from "@/components/layout/LegalLayoutLight";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";

export default function LegalNoticesPage() {
  const { t } = useLanguage();
  const notices = t.legal.notices;

  return (
    <LegalLayoutLight title={notices.title}>
      <p className="text-gray-300 text-lg mb-8">{notices.intro}</p>

      {/* Section 1 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{notices.section1.title}</h2>
        <div className="bg-dark-card border border-dark-border rounded-lg p-6 text-gray-300 space-y-2">
          <p>
            <strong className="text-white">{notices.section1.appName}</strong> POSTY
          </p>
          <p>
            <strong className="text-white">{notices.section1.legalForm}</strong> {notices.section1.toComplete}
          </p>
          <p>
            <strong className="text-white">{notices.section1.address}</strong> {notices.section1.addressValue}
          </p>
          <p>
            <strong className="text-white">{notices.section1.siret}</strong> {notices.section1.siretValue}
          </p>
          <p>
            <strong className="text-white">{notices.section1.capital}</strong> {notices.section1.capitalValue}
          </p>
          <p>
            <strong className="text-white">{notices.section1.vat}</strong> {notices.section1.vatValue}
          </p>
          <p>
            <strong className="text-white">{notices.section1.email}</strong> contact@posty.app
          </p>
          <p>
            <strong className="text-white">{notices.section1.phone}</strong> {notices.section1.phoneValue}
          </p>
        </div>
        <p className="text-gray-400 text-sm mt-2 italic">{notices.section1.note}</p>
      </section>

      {/* Section 2 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{notices.section2.title}</h2>
        <div className="bg-dark-card border border-dark-border rounded-lg p-6 text-gray-300 space-y-2">
          <p>
            <strong className="text-white">{notices.section2.name}</strong> {notices.section2.toComplete}
          </p>
          <p>
            <strong className="text-white">{notices.section2.email}</strong> contact@posty.app
          </p>
          <p>
            <strong className="text-white">LinkedIn :</strong>{" "}
            <a
              href="https://www.linkedin.com/in/e-nepveu-58a38127a/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              linkedin.com/in/e-nepveu-58a38127a
            </a>
          </p>
        </div>
      </section>

      {/* Section 3 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{notices.section3.title}</h2>
        <div className="bg-dark-card border border-dark-border rounded-lg p-6 text-gray-300 space-y-2">
          <p>
            <strong className="text-white">{notices.section3.name}</strong> {notices.section3.firebase}
          </p>
          <p>
            <strong className="text-white">{notices.section3.company}</strong> {notices.section3.google}
          </p>
          <p>
            <strong className="text-white">{notices.section3.address}</strong> {notices.section3.googleAddress}
          </p>
          <p>
            <strong className="text-white">{notices.section3.website}</strong>{" "}
            <a
              href="https://firebase.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              firebase.google.com
            </a>
          </p>
        </div>
      </section>

      {/* Section 4 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{notices.section4.title}</h2>
        <div className="bg-dark-card border border-dark-border rounded-lg p-6 text-gray-300 space-y-2">
          <p>
            <strong className="text-white">{notices.section4.contact}</strong> privacy@posty.app
          </p>
          <p className="text-gray-400 text-sm mt-2">{notices.section4.description}</p>
        </div>
      </section>

      {/* Section 5 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{notices.section5.title}</h2>
        <p className="text-gray-300 mb-4">{notices.section5.content1}</p>
        <p className="text-gray-300">{notices.section5.content2}</p>
      </section>

      {/* Section 6 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{notices.section6.title}</h2>
        <div className="bg-dark-card border border-dark-border rounded-lg p-6 text-gray-300 space-y-2">
          <p>
            <strong className="text-white">{notices.section6.development}</strong> {notices.section6.team}
          </p>
          <p>
            <strong className="text-white">{notices.section6.tech}</strong>
          </p>
          <ul className="list-disc list-inside ml-4 text-gray-400 space-y-1">
            {notices.section6.technologies.map((tech, i) => (
              <li key={i}>{tech}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Section 7 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{notices.section7.title}</h2>
        <p className="text-gray-300 mb-4">{notices.section7.content1}</p>
        <p className="text-gray-300">
          {notices.section7.content2}{" "}
          <Link href="/legal/privacy" className="text-primary hover:underline">
            {notices.section7.privacyLink}
          </Link>
          .
        </p>
      </section>

      {/* Section 8 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{notices.section8.title}</h2>
        <p className="text-gray-300 mb-4">{notices.section8.content1}</p>
        <p className="text-gray-300">{notices.section8.content2}</p>
      </section>

      {/* Section 9 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{notices.section9.title}</h2>
        <p className="text-gray-300">{notices.section9.content}</p>
      </section>

      {/* Section 10 */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">{notices.section10.title}</h2>
        <p className="text-gray-300 mb-4">{notices.section10.intro}</p>
        <div className="bg-dark-card border border-dark-border rounded-lg p-6 text-gray-300 space-y-2">
          <p>
            <strong className="text-white">{notices.section10.emailGeneral}</strong> contact@posty.app
          </p>
          <p>
            <strong className="text-white">{notices.section10.emailGDPR}</strong> privacy@posty.app
          </p>
          <p>
            <strong className="text-white">{notices.section10.emailSupport}</strong> support@posty.app
          </p>
        </div>
      </section>
    </LegalLayoutLight>
  );
}
