import LegalLayout from "@/components/layout/LegalLayout";

export const metadata = {
  title: "Politique de confidentialite - POSTY",
  description: "Politique de confidentialite et protection des donnees personnelles de POSTY",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Politique de confidentialite">
      <p className="text-gray-300 text-lg mb-8">
        Derniere mise a jour : {new Date().toLocaleDateString("fr-FR")}
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
        <p className="text-gray-300 mb-4">
          Bienvenue sur POSTY. Nous accordons une grande importance a la protection de vos donnees
          personnelles et au respect de votre vie privee. Cette politique de confidentialite explique
          comment nous collectons, utilisons, stockons et protegeons vos informations personnelles
          conformement au Reglement General sur la Protection des Donnees (RGPD) et a la loi
          Informatique et Libertes.
        </p>
        <p className="text-gray-300">
          En utilisant notre application, vous acceptez les pratiques decrites dans cette politique.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">2. Responsable du traitement</h2>
        <div className="bg-dark-card border border-dark-border rounded-lg p-4 text-gray-300">
          <p><strong className="text-white">POSTY</strong></p>
          <p>Email : contact@posty.app</p>
          <p>Contact RGPD : privacy@posty.app</p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">3. Donnees collectees</h2>
        <p className="text-gray-300 mb-4">Nous collectons les categories de donnees suivantes :</p>

        <h3 className="text-lg font-medium text-white mb-2">3.1 Donnees d&apos;identification</h3>
        <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
          <li>Nom et prenom</li>
          <li>Adresse email</li>
          <li>Photo de profil (si fournie via Google)</li>
        </ul>

        <h3 className="text-lg font-medium text-white mb-2">3.2 Donnees de profil professionnel</h3>
        <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
          <li>Secteur d&apos;activite</li>
          <li>Role / Metier</li>
          <li>Style LinkedIn prefere</li>
          <li>Objectifs professionnels</li>
        </ul>

        <h3 className="text-lg font-medium text-white mb-2">3.3 Donnees d&apos;utilisation</h3>
        <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">
          <li>Historique des posts generes</li>
          <li>Prompts saisis</li>
          <li>Preferences de contenu</li>
        </ul>

        <h3 className="text-lg font-medium text-white mb-2">3.4 Donnees techniques</h3>
        <ul className="list-disc list-inside text-gray-300 space-y-1">
          <li>Adresse IP</li>
          <li>Type de navigateur</li>
          <li>Donnees de connexion</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">4. Finalites du traitement</h2>
        <p className="text-gray-300 mb-4">Vos donnees sont utilisees pour :</p>
        <ul className="list-disc list-inside text-gray-300 space-y-2">
          <li><strong className="text-white">Fournir le service :</strong> Generation de posts LinkedIn personnalises</li>
          <li><strong className="text-white">Personnalisation :</strong> Adapter le contenu a votre profil et preferences</li>
          <li><strong className="text-white">Amelioration du service :</strong> Analyser l&apos;utilisation pour ameliorer l&apos;experience</li>
          <li><strong className="text-white">Communication :</strong> Vous informer des mises a jour importantes</li>
          <li><strong className="text-white">Securite :</strong> Proteger votre compte et prevenir les fraudes</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">5. Base legale du traitement</h2>
        <p className="text-gray-300 mb-4">Nous traitons vos donnees sur les bases legales suivantes :</p>
        <ul className="list-disc list-inside text-gray-300 space-y-2">
          <li><strong className="text-white">Consentement :</strong> Pour la collecte de donnees de profil et l&apos;envoi de communications marketing</li>
          <li><strong className="text-white">Execution du contrat :</strong> Pour fournir les services de generation de contenu</li>
          <li><strong className="text-white">Interet legitime :</strong> Pour ameliorer nos services et assurer la securite</li>
          <li><strong className="text-white">Obligation legale :</strong> Pour respecter nos obligations reglementaires</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">6. Partage des donnees</h2>
        <p className="text-gray-300 mb-4">
          Vos donnees peuvent etre partagees avec :
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2">
          <li><strong className="text-white">Firebase (Google) :</strong> Hebergement et authentification</li>
          <li><strong className="text-white">OpenAI / Anthropic :</strong> Generation de contenu IA (donnees anonymisees)</li>
        </ul>
        <p className="text-gray-300 mt-4">
          Nous ne vendons jamais vos donnees personnelles a des tiers. Tout partage est encadre
          par des contrats garantissant la protection de vos donnees.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">7. Duree de conservation</h2>
        <p className="text-gray-300 mb-4">Nous conservons vos donnees selon les durees suivantes :</p>
        <ul className="list-disc list-inside text-gray-300 space-y-2">
          <li><strong className="text-white">Donnees de compte :</strong> Jusqu&apos;a la suppression de votre compte + 30 jours</li>
          <li><strong className="text-white">Historique des posts :</strong> 2 ans apres la derniere activite</li>
          <li><strong className="text-white">Donnees techniques :</strong> 12 mois</li>
          <li><strong className="text-white">Donnees de facturation :</strong> 10 ans (obligation legale)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">8. Vos droits RGPD</h2>
        <p className="text-gray-300 mb-4">
          Conformement au RGPD, vous disposez des droits suivants :
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">Droit d&apos;acces</h3>
            <p className="text-gray-400 text-sm">Obtenir une copie de vos donnees personnelles</p>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">Droit de rectification</h3>
            <p className="text-gray-400 text-sm">Corriger vos donnees inexactes ou incompletes</p>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">Droit a l&apos;effacement</h3>
            <p className="text-gray-400 text-sm">Demander la suppression de vos donnees</p>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">Droit a la portabilite</h3>
            <p className="text-gray-400 text-sm">Recevoir vos donnees dans un format structure</p>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">Droit d&apos;opposition</h3>
            <p className="text-gray-400 text-sm">Vous opposer a certains traitements</p>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">Droit de limitation</h3>
            <p className="text-gray-400 text-sm">Limiter le traitement de vos donnees</p>
          </div>
        </div>
        <p className="text-gray-300 mt-4">
          Pour exercer ces droits, rendez-vous dans les <strong className="text-white">Parametres de confidentialite</strong> de
          l&apos;application ou contactez-nous a : <span className="text-primary">privacy@posty.app</span>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">9. Securite des donnees</h2>
        <p className="text-gray-300 mb-4">
          Nous mettons en oeuvre des mesures de securite appropriees pour proteger vos donnees :
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-1">
          <li>Chiffrement des donnees en transit (HTTPS/TLS)</li>
          <li>Chiffrement des donnees au repos</li>
          <li>Authentification securisee</li>
          <li>Acces restreint aux donnees personnelles</li>
          <li>Surveillance et detection des intrusions</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">10. Cookies et traceurs</h2>
        <p className="text-gray-300 mb-4">
          Notre application utilise des cookies essentiels pour le fonctionnement du service.
          Pour les cookies non essentiels (analytics), nous demandons votre consentement explicite.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">11. Transferts internationaux</h2>
        <p className="text-gray-300">
          Vos donnees peuvent etre transferees vers des serveurs situes en dehors de l&apos;UE
          (notamment aux USA via Firebase/Google). Ces transferts sont encadres par des clauses
          contractuelles types ou des decisions d&apos;adequation de la Commission europeenne.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">12. Modifications de cette politique</h2>
        <p className="text-gray-300">
          Nous pouvons mettre a jour cette politique de confidentialite. En cas de modification
          substantielle, nous vous en informerons par email ou via l&apos;application. La date de
          derniere mise a jour est indiquee en haut de cette page.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">13. Reclamation</h2>
        <p className="text-gray-300">
          Si vous estimez que vos droits ne sont pas respectes, vous pouvez introduire une
          reclamation aupres de la CNIL (Commission Nationale de l&apos;Informatique et des Libertes) :
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
            www.cnil.fr
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white mb-4">14. Contact</h2>
        <p className="text-gray-300 mb-4">
          Pour toute question concernant cette politique ou vos donnees personnelles :
        </p>
        <div className="bg-dark-card border border-dark-border rounded-lg p-4 text-gray-300">
          <p>Email general : contact@posty.app</p>
          <p>Email RGPD / DPO : privacy@posty.app</p>
        </div>
      </section>
    </LegalLayout>
  );
}
