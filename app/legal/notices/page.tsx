import LegalLayout from "@/components/layout/LegalLayout";

export const metadata = {
  title: "Mentions legales - POSTY",
  description: "Mentions legales de l'application POSTY",
};

export default function LegalNoticesPage() {
  return (
    <LegalLayout title="Mentions legales">
      <p className="text-gray-300 text-lg mb-8">
        Conformement aux dispositions des articles 6-III et 19 de la Loi n° 2004-575 du
        21 juin 2004 pour la Confiance dans l&apos;economie numerique (LCEN).
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">1. Editeur du site</h2>
        <div className="bg-dark-card border border-dark-border rounded-lg p-6 text-gray-300 space-y-2">
          <p><strong className="text-white">Nom de l&apos;application :</strong> POSTY</p>
          <p><strong className="text-white">Forme juridique :</strong> [A completer]</p>
          <p><strong className="text-white">Siege social :</strong> [A completer]</p>
          <p><strong className="text-white">SIRET :</strong> [A completer]</p>
          <p><strong className="text-white">Capital social :</strong> [A completer]</p>
          <p><strong className="text-white">Numero de TVA :</strong> [A completer]</p>
          <p><strong className="text-white">Email :</strong> contact@posty.app</p>
          <p><strong className="text-white">Telephone :</strong> [A completer]</p>
        </div>
        <p className="text-gray-400 text-sm mt-2 italic">
          * Les informations entre crochets doivent etre completees avec les informations reelles de votre entreprise.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">2. Directeur de la publication</h2>
        <div className="bg-dark-card border border-dark-border rounded-lg p-6 text-gray-300 space-y-2">
          <p><strong className="text-white">Nom :</strong> [A completer]</p>
          <p><strong className="text-white">Email :</strong> contact@posty.app</p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">3. Hebergeur</h2>
        <div className="bg-dark-card border border-dark-border rounded-lg p-6 text-gray-300 space-y-2">
          <p><strong className="text-white">Nom :</strong> Google Cloud Platform / Firebase</p>
          <p><strong className="text-white">Societe :</strong> Google LLC</p>
          <p><strong className="text-white">Adresse :</strong> 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</p>
          <p><strong className="text-white">Site web :</strong>{" "}
            <a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              firebase.google.com
            </a>
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">4. Delegue a la Protection des Donnees (DPO)</h2>
        <div className="bg-dark-card border border-dark-border rounded-lg p-6 text-gray-300 space-y-2">
          <p><strong className="text-white">Contact DPO :</strong> privacy@posty.app</p>
          <p className="text-gray-400 text-sm mt-2">
            Pour toute question relative a la protection de vos donnees personnelles ou pour exercer
            vos droits RGPD, vous pouvez contacter notre DPO a l&apos;adresse ci-dessus.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">5. Propriete intellectuelle</h2>
        <p className="text-gray-300 mb-4">
          L&apos;ensemble du contenu de ce site (textes, images, logos, icones, sons, logiciels, etc.)
          est la propriete exclusive de POSTY ou de ses partenaires et est protege par les lois
          francaises et internationales relatives a la propriete intellectuelle.
        </p>
        <p className="text-gray-300">
          Toute reproduction, representation, modification, publication ou adaptation de tout ou
          partie des elements du site, quel que soit le moyen ou le procede utilise, est interdite
          sans autorisation ecrite prealable de POSTY.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">6. Credits</h2>
        <div className="bg-dark-card border border-dark-border rounded-lg p-6 text-gray-300 space-y-2">
          <p><strong className="text-white">Conception et developpement :</strong> POSTY Team</p>
          <p><strong className="text-white">Technologies utilisees :</strong></p>
          <ul className="list-disc list-inside ml-4 text-gray-400 space-y-1">
            <li>Next.js / React</li>
            <li>TypeScript</li>
            <li>Tailwind CSS</li>
            <li>Firebase (Authentication, Firestore)</li>
            <li>Intelligence Artificielle (OpenAI / Anthropic)</li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">7. Cookies</h2>
        <p className="text-gray-300 mb-4">
          L&apos;application POSTY utilise des cookies pour assurer le bon fonctionnement du service
          et ameliorer l&apos;experience utilisateur.
        </p>
        <p className="text-gray-300">
          Pour plus d&apos;informations sur l&apos;utilisation des cookies et la gestion de vos preferences,
          consultez notre{" "}
          <a href="/legal/privacy" className="text-primary hover:underline">
            Politique de confidentialite
          </a>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">8. Limitation de responsabilite</h2>
        <p className="text-gray-300 mb-4">
          POSTY s&apos;efforce d&apos;assurer l&apos;exactitude des informations diffusees sur l&apos;application.
          Cependant, POSTY ne peut garantir l&apos;exactitude, la precision ou l&apos;exhaustivite des
          informations mises a disposition.
        </p>
        <p className="text-gray-300">
          Le contenu genere par l&apos;intelligence artificielle est fourni a titre indicatif.
          L&apos;utilisateur reste seul responsable de l&apos;utilisation qu&apos;il en fait.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">9. Droit applicable</h2>
        <p className="text-gray-300">
          Les presentes mentions legales sont regies par le droit francais. En cas de litige,
          et a defaut de resolution amiable, les tribunaux francais seront seuls competents.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white mb-4">10. Contact</h2>
        <p className="text-gray-300 mb-4">
          Pour toute question ou demande d&apos;information concernant l&apos;application :
        </p>
        <div className="bg-dark-card border border-dark-border rounded-lg p-6 text-gray-300 space-y-2">
          <p><strong className="text-white">Email general :</strong> contact@posty.app</p>
          <p><strong className="text-white">Email RGPD :</strong> privacy@posty.app</p>
          <p><strong className="text-white">Support technique :</strong> support@posty.app</p>
        </div>
      </section>
    </LegalLayout>
  );
}
