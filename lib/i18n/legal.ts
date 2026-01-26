/**
 * Legal Pages Translations
 * Privacy Policy, Terms of Service, Legal Notices
 * Application uniquement en français
 */

export const legalTranslations = {
  // Common
  lastUpdated: "Dernière mise à jour :",
  contact: "Contact",

  // Privacy Policy
  privacy: {
    title: "Politique de confidentialité",
    metaDescription: "Politique de confidentialité Posty : découvrez comment nous protégeons vos données personnelles conformément au RGPD.",

    section1: {
      title: "1. Introduction",
      content1: "Bienvenue sur Posty. Nous accordons une grande importance à la protection de vos données personnelles et au respect de votre vie privée. Cette Politique de confidentialité explique comment nous collectons, utilisons, stockons et protégeons vos informations personnelles conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.",
      content2: "En utilisant notre application, vous acceptez les pratiques décrites dans cette politique.",
    },

    section2: {
      title: "2. Responsable du traitement",
      companyName: "Posty",
      email: "Email : contact@posty.app",
      gdprContact: "Contact RGPD : privacy@posty.app",
    },

    section3: {
      title: "3. Données collectées",
      intro: "Nous collectons les catégories de données suivantes :",
      identification: {
        title: "3.1 Données d'identification",
        items: ["Nom et prénom", "Adresse email", "Photo de profil (si fournie via Google)"],
      },
      profile: {
        title: "3.2 Données de profil professionnel",
        items: ["Secteur d'activité", "Rôle / Métier", "Style LinkedIn préféré", "Objectifs professionnels"],
      },
      usage: {
        title: "3.3 Données d'utilisation",
        items: ["Historique des posts générés", "Prompts saisis", "Préférences de contenu"],
      },
      technical: {
        title: "3.4 Données techniques",
        items: ["Adresse IP", "Type de navigateur", "Données de connexion"],
      },
    },

    section4: {
      title: "4. Finalités du traitement",
      intro: "Vos données sont utilisées pour :",
      purposes: [
        { label: "Fournir le service :", desc: "Génération de posts LinkedIn personnalisés" },
        { label: "Personnalisation :", desc: "Adapter le contenu à votre profil et préférences" },
        { label: "Amélioration du service :", desc: "Analyser l'utilisation pour améliorer l'expérience" },
        { label: "Communication :", desc: "Vous informer des mises à jour importantes" },
        { label: "Sécurité :", desc: "Protéger votre compte et prévenir les fraudes" },
      ],
    },

    section5: {
      title: "5. Base légale du traitement",
      intro: "Nous traitons vos données sur les bases légales suivantes :",
      bases: [
        { label: "Consentement :", desc: "Pour la collecte de données de profil et l'envoi de communications marketing" },
        { label: "Exécution du contrat :", desc: "Pour fournir les services de génération de contenu" },
        { label: "Intérêt légitime :", desc: "Pour améliorer nos services et assurer la sécurité" },
        { label: "Obligation légale :", desc: "Pour respecter nos obligations réglementaires" },
      ],
    },

    section6: {
      title: "6. Partage des données",
      intro: "Vos données peuvent être partagées avec :",
      partners: [
        { name: "Firebase (Google) :", desc: "Hébergement et authentification" },
        { name: "OpenAI / Anthropic :", desc: "Génération de contenu IA (données anonymisées)" },
      ],
      noSale: "Nous ne vendons jamais vos données personnelles à des tiers. Tout partage est encadré par des contrats garantissant la protection de vos données.",
    },

    section7: {
      title: "7. Durée de conservation",
      intro: "Nous conservons vos données selon les durées suivantes :",
      periods: [
        { label: "Données de compte :", duration: "Jusqu'à la suppression de votre compte + 30 jours" },
        { label: "Historique des posts :", duration: "2 ans après la dernière activité" },
        { label: "Données techniques :", duration: "12 mois" },
        { label: "Données de facturation :", duration: "10 ans (obligation légale)" },
      ],
    },

    section8: {
      title: "8. Vos droits RGPD",
      intro: "Conformément au RGPD, vous disposez des droits suivants :",
      rights: [
        { title: "Droit d'accès", desc: "Obtenir une copie de vos données personnelles" },
        { title: "Droit de rectification", desc: "Corriger vos données inexactes ou incomplètes" },
        { title: "Droit à l'effacement", desc: "Demander la suppression de vos données" },
        { title: "Droit à la portabilité", desc: "Recevoir vos données dans un format structuré" },
        { title: "Droit d'opposition", desc: "Vous opposer à certains traitements" },
        { title: "Droit de limitation", desc: "Limiter le traitement de vos données" },
      ],
      exercise: "Pour exercer ces droits, rendez-vous dans les Paramètres de confidentialité de l'application ou contactez-nous à : privacy@posty.app",
    },

    section9: {
      title: "9. Sécurité des données",
      intro: "Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données :",
      measures: [
        "Chiffrement des données en transit (HTTPS/TLS)",
        "Chiffrement des données au repos",
        "Authentification sécurisée",
        "Accès restreint aux données personnelles",
        "Surveillance et détection des intrusions",
      ],
    },

    section10: {
      title: "10. Cookies et traceurs",
      content: "Notre application utilise des cookies essentiels pour le fonctionnement du service. Pour les cookies non essentiels (analytics), nous demandons votre consentement explicite.",
    },

    section11: {
      title: "11. Transferts internationaux",
      content: "Vos données peuvent être transférées vers des serveurs situés en dehors de l'UE (notamment aux USA via Firebase/Google). Ces transferts sont encadrés par des clauses contractuelles types ou des décisions d'adéquation de la Commission européenne.",
    },

    section12: {
      title: "12. Modifications de cette politique",
      content: "Nous pouvons mettre à jour cette Politique de confidentialité. En cas de modification substantielle, nous vous en informerons par email ou via l'application. La date de Dernière mise à jour est indiquée en haut de cette page.",
    },

    section13: {
      title: "13. Réclamation",
      content: "Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) :",
      cnilLink: "www.cnil.fr",
    },

    section14: {
      title: "14. Contact",
      intro: "Pour toute question concernant cette politique ou vos données personnelles :",
      emailGeneral: "Email général : contact@posty.app",
      emailGDPR: "Email RGPD / DPO : privacy@posty.app",
    },
  },

  // Terms of Service
  terms: {
    title: "Conditions Générales d'Utilisation",
    metaDescription: "CGU Posty : consultez les conditions d'utilisation de notre générateur de posts LinkedIn IA.",

    section1: {
      title: "1. Objet",
      content1: "Les présentes Conditions Générales d'Utilisation (ci-après \"CGU\") ont pour objet de définir les modalités et conditions d'utilisation de l'application Posty (ci-après \"le Service\"), ainsi que les droits et obligations des parties dans ce cadre.",
      content2: "L'utilisation du Service implique l'acceptation pleine et entière des présentes CGU.",
    },

    section2: {
      title: "2. Description du Service",
      intro: "Posty est une application de génération de contenu pour LinkedIn utilisant l'intelligence artificielle. Le Service permet aux utilisateurs de :",
      features: [
        "Générer des posts LinkedIn personnalisés",
        "Obtenir plusieurs versions de contenu (storytelling, business)",
        "Sauvegarder et gérer leur historique de posts",
        "Personnaliser le style de contenu selon leur profil professionnel",
      ],
    },

    section3: {
      title: "3. Accès au Service",
      registration: {
        title: "3.1 Inscription",
        content: "L'accès au Service nécessite la création d'un compte utilisateur. L'utilisateur s'engage à fournir des informations exactes et à jour lors de son inscription.",
      },
      age: {
        title: "3.2 Conditions d'âge",
        content: "Le Service est destiné aux personnes âgées d'au moins 18 ans ou ayant atteint l'âge de la majorité dans leur pays de résidence.",
      },
      security: {
        title: "3.3 Sécurité du compte",
        content: "L'utilisateur est responsable de la confidentialité de ses identifiants de connexion et de toute activité effectuée depuis son compte.",
      },
    },

    section4: {
      title: "4. Obligations de l'utilisateur",
      intro: "L'utilisateur s'engage à :",
      obligations: [
        "Utiliser le Service conformément aux présentes CGU et à la législation applicable",
        "Ne pas utiliser le Service à des fins illégales, frauduleuses ou nuisibles",
        "Ne pas générer de contenu diffamatoire, haineux, discriminatoire ou illégal",
        "Ne pas tenter de contourner les mesures de sécurité du Service",
        "Ne pas utiliser de robots, scrapers ou autres outils automatisés non autorisés",
        "Respecter les droits de propriété intellectuelle de tiers",
        "Ne pas revendre ou redistribuer le Service sans autorisation",
      ],
    },

    section5: {
      title: "5. Propriété intellectuelle",
      posty: {
        title: "5.1 Propriété de Posty",
        content: "L'ensemble des éléments du Service (design, logos, textes, code source, algorithmes) sont la propriété exclusive de Posty et sont protégés par les lois sur la propriété intellectuelle.",
      },
      generated: {
        title: "5.2 Contenu généré",
        content: "L'utilisateur conserve la propriété des prompts qu'il soumet. Le contenu généré par l'IA peut être utilisé librement par l'utilisateur, sous réserve du respect des droits des tiers et des conditions d'utilisation de LinkedIn.",
      },
      license: {
        title: "5.3 Licence d'utilisation",
        content: "Posty accorde à l'utilisateur une licence limitée, non exclusive et révocable d'utilisation du Service pour un usage personnel et professionnel.",
      },
    },

    section6: {
      title: "6. Tarification",
      content: "Le Service peut proposer des fonctionnalités gratuites et/ou payantes. Les conditions tarifaires sont indiquées dans l'application. Posty se réserve le droit de modifier ses tarifs à tout moment, avec un préavis raisonnable pour les abonnements en cours.",
    },

    section7: {
      title: "7. Limitation de responsabilité",
      ai: {
        title: "7.1 Nature du contenu IA",
        content: "Le contenu généré par l'intelligence artificielle est fourni \"tel quel\". L'utilisateur reconnaît que ce contenu peut contenir des erreurs ou inexactitudes et s'engage à le vérifier avant publication.",
      },
      availability: {
        title: "7.2 Disponibilité",
        content: "Posty s'efforce d'assurer la disponibilité du Service mais ne peut garantir une disponibilité ininterrompue. Des maintenances ou pannes peuvent survenir.",
      },
      userResponsibility: {
        title: "7.3 Responsabilité de l'utilisateur",
        content: "L'utilisateur est seul responsable de l'utilisation qu'il fait du contenu généré et de sa publication sur LinkedIn ou tout autre plateforme.",
      },
    },

    section8: {
      title: "8. Suspension et résiliation",
      byUser: {
        title: "8.1 Par l'utilisateur",
        content: "L'utilisateur peut supprimer son compte à tout moment depuis les paramètres de l'application. La suppression entraîne l'effacement des données personnelles conformément à notre Politique de confidentialité.",
      },
      byPosty: {
        title: "8.2 Par Posty",
        content: "Posty se réserve le droit de suspendre ou résilier l'accès d'un utilisateur en cas de violation des présentes CGU, sans préavis ni indemnité.",
      },
    },

    section9: {
      title: "9. Protection des données",
      content: "Le traitement des données personnelles est décrit dans notre Politique de confidentialité, qui fait partie intégrante des présentes CGU.",
      privacyLink: "Politique de confidentialité",
    },

    section10: {
      title: "10. Modifications des CGU",
      content: "Posty se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des modifications substantielles par email ou via l'application. La poursuite de l'utilisation du Service après modification vaut acceptation des nouvelles CGU.",
    },

    section11: {
      title: "11. Droit applicable et litiges",
      content1: "Les présentes CGU sont régies par le droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable avant toute action judiciaire.",
      content2: "À défaut d'accord amiable, les tribunaux français seront seuls compétents.",
    },

    section12: {
      title: "12. Dispositions diverses",
      entirety: {
        title: "12.1 Intégralité",
        content: "Les présentes CGU constituent l'intégralité de l'accord entre l'utilisateur et Posty.",
      },
      severability: {
        title: "12.2 Nullité partielle",
        content: "Si une clause des CGU est déclarée nulle, les autres clauses restent applicables.",
      },
      noWaiver: {
        title: "12.3 Non-renonciation",
        content: "Le fait de ne pas exercer un droit prévu aux CGU ne constitue pas une renonciation à ce droit.",
      },
    },

    section13: {
      title: "13. Contact",
      intro: "Pour toute question concernant les présentes CGU :",
      email: "Email : contact@posty.app",
    },
  },

  // Legal Notices
  notices: {
    title: "Mentions légales",
    metaDescription: "Mentions légales Posty : informations sur l'éditeur, l'hébergeur et les droits applicables.",
    intro: "Conformément aux dispositions des articles 6-III et 19 de la Loi n° 2004-575 du 21 juin 2004 pour la Confiance dans l'économie numérique (LCEN).",

    section1: {
      title: "1. Éditeur du site",
      appName: "Nom de l'application :",
      legalForm: "Forme juridique :",
      address: "Siège social :",
      siret: "SIRET :",
      capital: "Capital social :",
      vat: "Numéro de TVA :",
      email: "Email :",
      phone: "Téléphone :",
      toComplete: "Entreprise individuelle (en cours d'immatriculation)",
      addressValue: "France",
      siretValue: "En cours d'attribution",
      capitalValue: "N/A",
      vatValue: "En cours d'attribution",
      phoneValue: "Non communiqué",
      note: "* POSTY est actuellement édité par Emilien Nepveu en tant qu'entrepreneur individuel. L'immatriculation légale est en cours.",
    },

    section2: {
      title: "2. Directeur de la publication",
      name: "Nom :",
      email: "Email :",
      toComplete: "Emilien Nepveu",
    },

    section3: {
      title: "3. Hébergeur",
      name: "Nom :",
      company: "Société :",
      address: "Adresse :",
      website: "Site web :",
      firebase: "Google Cloud Platform / Firebase",
      google: "Google LLC",
      googleAddress: "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA",
    },

    section4: {
      title: "4. Délégué à la Protection des Données (DPO)",
      contact: "Contact DPO :",
      description: "Pour toute question relative à la protection de vos données personnelles ou pour exercer vos droits RGPD, vous pouvez contacter notre DPO à l'adresse ci-dessus.",
    },

    section5: {
      title: "5. Propriété intellectuelle",
      content1: "L'ensemble du contenu de ce site (textes, images, logos, icônes, sons, logiciels, etc.) est la propriété exclusive de Posty ou de ses partenaires et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.",
      content2: "Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans autorisation écrite préalable de Posty.",
    },

    section6: {
      title: "6. Crédits",
      development: "Conception et développement :",
      team: "Posty Team",
      tech: "Technologies utilisées :",
      technologies: [
        "Next.js / React",
        "TypeScript",
        "Tailwind CSS",
        "Firebase (Authentication, Firestore)",
        "Intelligence Artificielle (OpenAI / Anthropic)",
      ],
    },

    section7: {
      title: "7. Cookies",
      content1: "L'application Posty utilise des cookies pour assurer le bon fonctionnement du service et améliorer l'expérience utilisateur.",
      content2: "Pour plus d'informations sur l'utilisation des cookies et la gestion de vos préférences, consultez notre Politique de confidentialité.",
      privacyLink: "Politique de confidentialité",
    },

    section8: {
      title: "8. Limitation de responsabilité",
      content1: "Posty s'efforce d'assurer l'exactitude des informations diffusées sur l'application. Cependant, Posty ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition.",
      content2: "Le contenu généré par l'intelligence artificielle est fourni à titre indicatif. L'utilisateur reste seul responsable de l'utilisation qu'il en fait.",
    },

    section9: {
      title: "9. Droit applicable",
      content: "Les présentes Mentions légales sont régies par le droit français. En cas de litige, et à défaut de résolution amiable, les tribunaux français seront seuls compétents.",
    },

    section10: {
      title: "10. Contact",
      intro: "Pour toute question ou demande d'information concernant l'application :",
      emailGeneral: "Email général :",
      emailGDPR: "Email RGPD :",
      emailSupport: "Support technique :",
    },
  },
} as const;
