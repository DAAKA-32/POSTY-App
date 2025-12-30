import LegalLayout from "@/components/layout/LegalLayout";

export const metadata = {
  title: "Conditions Generales d'Utilisation - POSTY",
  description: "Conditions Generales d'Utilisation de l'application POSTY",
};

export default function TermsOfServicePage() {
  return (
    <LegalLayout title="Conditions Generales d&apos;Utilisation">
      <p className="text-gray-300 text-lg mb-8">
        Derniere mise a jour : {new Date().toLocaleDateString("fr-FR")}
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">1. Objet</h2>
        <p className="text-gray-300 mb-4">
          Les presentes Conditions Generales d&apos;Utilisation (ci-apres &quot;CGU&quot;) ont pour objet de
          definir les modalites et conditions d&apos;utilisation de l&apos;application POSTY (ci-apres
          &quot;le Service&quot;), ainsi que les droits et obligations des parties dans ce cadre.
        </p>
        <p className="text-gray-300">
          L&apos;utilisation du Service implique l&apos;acceptation pleine et entiere des presentes CGU.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">2. Description du Service</h2>
        <p className="text-gray-300 mb-4">
          POSTY est une application de generation de contenu pour LinkedIn utilisant l&apos;intelligence
          artificielle. Le Service permet aux utilisateurs de :
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2">
          <li>Generer des posts LinkedIn personnalises</li>
          <li>Obtenir plusieurs versions de contenu (storytelling, business)</li>
          <li>Sauvegarder et gerer leur historique de posts</li>
          <li>Personnaliser le style de contenu selon leur profil professionnel</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">3. Acces au Service</h2>
        <h3 className="text-lg font-medium text-white mb-2">3.1 Inscription</h3>
        <p className="text-gray-300 mb-4">
          L&apos;acces au Service necessite la creation d&apos;un compte utilisateur. L&apos;utilisateur
          s&apos;engage a fournir des informations exactes et a jour lors de son inscription.
        </p>

        <h3 className="text-lg font-medium text-white mb-2">3.2 Conditions d&apos;age</h3>
        <p className="text-gray-300 mb-4">
          Le Service est destine aux personnes agees d&apos;au moins 18 ans ou ayant atteint
          l&apos;age de la majorite dans leur pays de residence.
        </p>

        <h3 className="text-lg font-medium text-white mb-2">3.3 Securite du compte</h3>
        <p className="text-gray-300">
          L&apos;utilisateur est responsable de la confidentialite de ses identifiants de connexion
          et de toute activite effectuee depuis son compte.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">4. Obligations de l&apos;utilisateur</h2>
        <p className="text-gray-300 mb-4">L&apos;utilisateur s&apos;engage a :</p>
        <ul className="list-disc list-inside text-gray-300 space-y-2">
          <li>Utiliser le Service conformement aux presentes CGU et a la legislation applicable</li>
          <li>Ne pas utiliser le Service a des fins illegales, frauduleuses ou nuisibles</li>
          <li>Ne pas generer de contenu diffamatoire, haineux, discriminatoire ou illegal</li>
          <li>Ne pas tenter de contourner les mesures de securite du Service</li>
          <li>Ne pas utiliser de robots, scrapers ou autres outils automatises non autorises</li>
          <li>Respecter les droits de propriete intellectuelle de tiers</li>
          <li>Ne pas revendre ou redistribuer le Service sans autorisation</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">5. Propriete intellectuelle</h2>
        <h3 className="text-lg font-medium text-white mb-2">5.1 Propriete de POSTY</h3>
        <p className="text-gray-300 mb-4">
          L&apos;ensemble des elements du Service (design, logos, textes, code source, algorithmes)
          sont la propriete exclusive de POSTY et sont proteges par les lois sur la propriete
          intellectuelle.
        </p>

        <h3 className="text-lg font-medium text-white mb-2">5.2 Contenu genere</h3>
        <p className="text-gray-300 mb-4">
          L&apos;utilisateur conserve la propriete des prompts qu&apos;il soumet. Le contenu genere par
          l&apos;IA peut etre utilise librement par l&apos;utilisateur, sous reserve du respect des droits
          des tiers et des conditions d&apos;utilisation de LinkedIn.
        </p>

        <h3 className="text-lg font-medium text-white mb-2">5.3 Licence d&apos;utilisation</h3>
        <p className="text-gray-300">
          POSTY accorde a l&apos;utilisateur une licence limitee, non exclusive et revocable
          d&apos;utilisation du Service pour un usage personnel et professionnel.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">6. Tarification</h2>
        <p className="text-gray-300 mb-4">
          Le Service peut proposer des fonctionnalites gratuites et/ou payantes. Les conditions
          tarifaires sont indiquees dans l&apos;application. POSTY se reserve le droit de modifier
          ses tarifs a tout moment, avec un preavis raisonnable pour les abonnements en cours.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">7. Limitation de responsabilite</h2>
        <h3 className="text-lg font-medium text-white mb-2">7.1 Nature du contenu IA</h3>
        <p className="text-gray-300 mb-4">
          Le contenu genere par l&apos;intelligence artificielle est fourni &quot;tel quel&quot;. L&apos;utilisateur
          reconnaît que ce contenu peut contenir des erreurs ou inexactitudes et s&apos;engage a
          le verifier avant publication.
        </p>

        <h3 className="text-lg font-medium text-white mb-2">7.2 Disponibilite</h3>
        <p className="text-gray-300 mb-4">
          POSTY s&apos;efforce d&apos;assurer la disponibilite du Service mais ne peut garantir une
          disponibilite ininterrompue. Des maintenances ou pannes peuvent survenir.
        </p>

        <h3 className="text-lg font-medium text-white mb-2">7.3 Responsabilite de l&apos;utilisateur</h3>
        <p className="text-gray-300">
          L&apos;utilisateur est seul responsable de l&apos;utilisation qu&apos;il fait du contenu genere
          et de sa publication sur LinkedIn ou tout autre plateforme.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">8. Suspension et resiliation</h2>
        <h3 className="text-lg font-medium text-white mb-2">8.1 Par l&apos;utilisateur</h3>
        <p className="text-gray-300 mb-4">
          L&apos;utilisateur peut supprimer son compte a tout moment depuis les parametres de
          l&apos;application. La suppression entraine l&apos;effacement des donnees personnelles
          conformement a notre Politique de confidentialite.
        </p>

        <h3 className="text-lg font-medium text-white mb-2">8.2 Par POSTY</h3>
        <p className="text-gray-300">
          POSTY se reserve le droit de suspendre ou resilier l&apos;acces d&apos;un utilisateur en cas
          de violation des presentes CGU, sans preavis ni indemnite.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">9. Protection des donnees</h2>
        <p className="text-gray-300">
          Le traitement des donnees personnelles est decrit dans notre{" "}
          <a href="/legal/privacy" className="text-primary hover:underline">
            Politique de confidentialite
          </a>
          , qui fait partie integrante des presentes CGU.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">10. Modifications des CGU</h2>
        <p className="text-gray-300">
          POSTY se reserve le droit de modifier les presentes CGU a tout moment. Les utilisateurs
          seront informes des modifications substantielles par email ou via l&apos;application.
          La poursuite de l&apos;utilisation du Service apres modification vaut acceptation des
          nouvelles CGU.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">11. Droit applicable et litiges</h2>
        <p className="text-gray-300 mb-4">
          Les presentes CGU sont regies par le droit francais. En cas de litige, les parties
          s&apos;engagent a rechercher une solution amiable avant toute action judiciaire.
        </p>
        <p className="text-gray-300">
          A defaut d&apos;accord amiable, les tribunaux francais seront seuls competents.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">12. Dispositions diverses</h2>
        <h3 className="text-lg font-medium text-white mb-2">12.1 Integralite</h3>
        <p className="text-gray-300 mb-4">
          Les presentes CGU constituent l&apos;integralite de l&apos;accord entre l&apos;utilisateur et POSTY.
        </p>

        <h3 className="text-lg font-medium text-white mb-2">12.2 Nullite partielle</h3>
        <p className="text-gray-300 mb-4">
          Si une clause des CGU est declaree nulle, les autres clauses restent applicables.
        </p>

        <h3 className="text-lg font-medium text-white mb-2">12.3 Non-renonciation</h3>
        <p className="text-gray-300">
          Le fait de ne pas exercer un droit prevu aux CGU ne constitue pas une renonciation
          a ce droit.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white mb-4">13. Contact</h2>
        <p className="text-gray-300 mb-4">
          Pour toute question concernant les presentes CGU :
        </p>
        <div className="bg-dark-card border border-dark-border rounded-lg p-4 text-gray-300">
          <p>Email : contact@posty.app</p>
        </div>
      </section>
    </LegalLayout>
  );
}
