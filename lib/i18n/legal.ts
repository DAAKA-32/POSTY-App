/**
 * Legal Pages Translations
 * Privacy Policy, Terms of Service, Legal Notices, Cookie Policy
 * Always displayed in English regardless of user language selection
 *
 * VERSIONING: Each document has a version field for traceability
 * Format: "X.Y" where X = major revision, Y = minor update
 */

// Legal document versions - update when content changes
export const LEGAL_VERSIONS = {
  privacy: { version: "2.0", date: "2026-02-13" },
  terms: { version: "2.0", date: "2026-02-13" },
  notices: { version: "1.1", date: "2026-02-13" },
  cookies: { version: "2.0", date: "2026-02-13" },
} as const;

export const legalTranslations = {
  // Common
  lastUpdated: "Last updated:",
  version: "Version:",
  contact: "Contact",

  // Privacy Policy
  privacy: {
    title: "Privacy Policy",
    metaDescription: "Posty Privacy Policy: learn how we protect your personal data in compliance with the GDPR.",

    section1: {
      title: "1. Introduction",
      content1: "Welcome to Posty. We take the protection of your personal data and respect for your privacy very seriously. This Privacy Policy explains how we collect, use, store, and protect your personal information in accordance with the General Data Protection Regulation (GDPR) and applicable French data protection laws.",
      content2: "By using our application, you agree to the practices described in this policy.",
    },

    section2: {
      title: "2. Data Controller",
      companyName: "Posty",
      legalEntity: "Emilien Nepveu, sole proprietor",
      address: "Address: 42170 Chambles, France",
      email: "Email: postygroup@gmail.com",
      gdprContact: "GDPR / DPO Contact: postygroup@gmail.com",
    },

    section3: {
      title: "3. Data Collected",
      intro: "We collect the following categories of data:",
      identification: {
        title: "3.1 Identification Data",
        items: ["First and last name", "Email address", "Profile photo (if provided via Google)"],
      },
      profile: {
        title: "3.2 Professional Profile Data",
        items: ["Industry", "Role / Job title", "Preferred LinkedIn style", "Professional objectives"],
      },
      usage: {
        title: "3.3 Usage Data",
        items: ["Post generation history", "Prompts entered", "Content preferences"],
      },
      technical: {
        title: "3.4 Technical Data",
        items: ["IP address", "Browser type", "Connection data"],
      },
      payment: {
        title: "3.5 Payment Data",
        items: ["Credit card information (processed by Stripe, not stored by Posty)", "Transaction history", "Billing address (if applicable)"],
      },
    },

    section4: {
      title: "4. Purposes of Processing",
      intro: "Your data is used for:",
      purposes: [
        { label: "Service delivery:", desc: "Generation of personalized LinkedIn posts" },
        { label: "Personalization:", desc: "Adapting content to your profile and preferences" },
        { label: "Service improvement:", desc: "Analyzing usage to improve the experience" },
        { label: "Communication:", desc: "Informing you of important updates" },
        { label: "Security:", desc: "Protecting your account and preventing fraud" },
      ],
    },

    section5: {
      title: "5. Legal Basis for Processing",
      intro: "We process your data on the following legal bases:",
      bases: [
        { label: "Consent:", desc: "For collecting profile data and sending marketing communications" },
        { label: "Performance of contract:", desc: "For providing content generation services" },
        { label: "Legitimate interest:", desc: "For improving our services and ensuring security" },
        { label: "Legal obligation:", desc: "For meeting our regulatory obligations" },
      ],
    },

    section6: {
      title: "6. Data Sharing",
      intro: "Your data may be shared with:",
      partners: [
        { name: "Firebase (Google):", desc: "Hosting and authentication" },
        { name: "OpenAI / Anthropic:", desc: "AI content generation (anonymized data)" },
        { name: "Stripe:", desc: "Secure payment processing and billing" },
        { name: "Vercel:", desc: "Application hosting and deployment" },
      ],
      noSale: "We never sell your personal data to third parties. All sharing is governed by contracts that ensure the protection of your data.",
    },

    section7: {
      title: "7. Data Retention",
      intro: "We retain your data for the following periods:",
      periods: [
        { label: "Account data:", duration: "Until account deletion + 30 days" },
        { label: "Post history:", duration: "2 years after last activity" },
        { label: "Technical data:", duration: "12 months" },
        { label: "Billing data:", duration: "10 years (legal requirement)" },
      ],
    },

    section8: {
      title: "8. Your GDPR Rights",
      intro: "Under the GDPR, you have the following rights:",
      rights: [
        { title: "Right of access", desc: "Obtain a copy of your personal data" },
        { title: "Right to rectification", desc: "Correct inaccurate or incomplete data" },
        { title: "Right to erasure", desc: "Request the deletion of your data" },
        { title: "Right to data portability", desc: "Receive your data in a structured format" },
        { title: "Right to object", desc: "Object to certain processing activities" },
        { title: "Right to restriction", desc: "Restrict the processing of your data" },
        { title: "Right to withdraw consent", desc: "Withdraw your consent at any time, without affecting the lawfulness of processing carried out before withdrawal" },
      ],
      exercise: "To exercise these rights or withdraw your consent, go to the Privacy Settings in the application or contact us at: postygroup@gmail.com",
    },

    section9: {
      title: "9. Data Security",
      intro: "We implement appropriate security measures to protect your data:",
      measures: [
        "Data encryption in transit (HTTPS/TLS)",
        "Data encryption at rest",
        "Secure authentication",
        "Restricted access to personal data",
        "Intrusion monitoring and detection",
      ],
    },

    section10: {
      title: "10. Cookies and Trackers",
      content: "Our application uses essential cookies for the operation of the service. For non-essential cookies (analytics), we request your explicit consent. For more details, please refer to our Cookie Policy.",
      cookiesPolicyLink: "/legal/cookies",
    },

    section11: {
      title: "11. International Transfers",
      content: "Your data may be transferred to servers located outside the EU (notably in the USA via Firebase/Google). These transfers are governed by Standard Contractual Clauses or adequacy decisions of the European Commission.",
    },

    section12: {
      title: "12. Changes to This Policy",
      content: "We may update this Privacy Policy. In the event of a substantial change, we will inform you by email or through the application. The Last updated date is indicated at the top of this page.",
    },

    section13: {
      title: "13. Complaints",
      content: "If you believe your rights are not being respected, you may file a complaint with the CNIL (Commission Nationale de l'Informatique et des Libertés):",
      cnilLink: "www.cnil.fr",
    },

    section14: {
      title: "14. Automated Decisions and Profiling",
      content1: "Posty uses artificial intelligence (via OpenAI and Anthropic) to generate personalized content based on your profile data (industry, role, style, objectives). This processing constitutes profiling within the meaning of Article 22 of the GDPR.",
      content2: "However, no decision with legal or significant effect on you is made in an automated manner. Content generation is an assistive tool: you remain in full control of the final decision to publish or not.",
      content3: "Your profile data is anonymized before being sent to AI services. No directly identifiable data (name, email) is transmitted to the language models.",
      rights: "You may modify your profile or withdraw your consent for personalized processing at any time from the application Settings.",
    },

    section15: {
      title: "15. Sub-processors and Data Processing Agreements (DPA)",
      intro: "We use the following sub-processors for the operation of the service. Each is bound by a GDPR-compliant Data Processing Agreement (DPA):",
      subprocessors: [
        { name: "Google / Firebase", purpose: "Hosting, database, authentication", location: "USA (Standard Contractual Clauses)", dpa: "https://cloud.google.com/terms/data-processing-addendum" },
        { name: "OpenAI", purpose: "AI content generation (anonymized data)", location: "USA (Standard Contractual Clauses)", dpa: "https://openai.com/policies/data-processing-addendum" },
        { name: "Anthropic", purpose: "AI content generation (anonymized data)", location: "USA (Standard Contractual Clauses)", dpa: "https://www.anthropic.com/policies/data-processing-addendum" },
        { name: "Stripe", purpose: "Payment processing and billing", location: "USA (Standard Contractual Clauses)", dpa: "https://stripe.com/fr/legal/dpa" },
        { name: "Vercel", purpose: "Application hosting and deployment", location: "USA (Standard Contractual Clauses)", dpa: "https://vercel.com/legal/dpa" },
        { name: "LinkedIn (Microsoft)", purpose: "OAuth connection and post publishing", location: "USA (Standard Contractual Clauses)", dpa: "https://learn.microsoft.com/en-us/legal/gdpr" },
        { name: "X Corp. (Twitter)", purpose: "OAuth connection and post publishing", location: "USA (Standard Contractual Clauses)", dpa: "https://twitter.com/en/privacy" },
        { name: "Meta Platforms", purpose: "OAuth connection and publishing on Facebook/Threads", location: "USA (Standard Contractual Clauses)", dpa: "https://www.facebook.com/legal/terms/dataprocessing" },
      ],
      note: "This list is updated regularly. Any addition of a sub-processor is subject to prior GDPR compliance verification.",
    },

    section16: {
      title: "16. Data Breach Notification",
      content1: "In the event of a personal data breach likely to pose a risk to your rights and freedoms, we commit to:",
      obligations: [
        "Notifying the CNIL within 72 hours of becoming aware of it, in accordance with Article 33 of the GDPR",
        "Informing you as soon as possible if the breach poses a high risk to your rights and freedoms (Article 34 of the GDPR)",
        "Documenting any breach in an internal incident register",
        "Implementing necessary corrective measures to limit the impact of the breach",
      ],
      contact: "If you suspect a breach of your data, contact us immediately: postygroup@gmail.com",
    },

    section17: {
      title: "17. Data Protection Impact Assessment (DPIA)",
      content: "In accordance with Article 35 of the GDPR, we conduct Data Protection Impact Assessments (DPIA) for processing activities likely to pose a high risk to the rights and freedoms of data subjects. The processing of data by AI models for content personalization is subject to a documented internal DPIA.",
    },

    section18: {
      title: "18. Contact",
      intro: "For any questions regarding this policy or your personal data:",
      emailGeneral: "General email: postygroup@gmail.com",
      emailGDPR: "GDPR / DPO email: postygroup@gmail.com",
    },
  },

  // Terms of Service
  terms: {
    title: "Terms of Service",
    metaDescription: "Posty Terms of Service: review the terms and conditions for using our AI LinkedIn post generator.",

    section1: {
      title: "1. Purpose",
      content1: "These Terms of Service (hereinafter \"Terms\") define the terms and conditions of use of the Posty application (hereinafter \"the Service\"), as well as the rights and obligations of the parties.",
      content2: "Use of the Service implies full and complete acceptance of these Terms.",
    },

    section2: {
      title: "2. Description of the Service",
      intro: "Posty is an AI-powered content generation application for LinkedIn. The Service allows users to:",
      features: [
        "Generate personalized LinkedIn posts",
        "Obtain multiple content versions (storytelling, business)",
        "Save and manage their post history",
        "Customize content style based on their professional profile",
      ],
    },

    section3: {
      title: "3. Access to the Service",
      registration: {
        title: "3.1 Registration",
        content: "Access to the Service requires the creation of a user account. The user agrees to provide accurate and up-to-date information during registration.",
      },
      age: {
        title: "3.2 Age Requirements",
        content: "The Service is intended for persons aged at least 18 years or who have reached the age of majority in their country of residence.",
      },
      security: {
        title: "3.3 Account Security",
        content: "The user is responsible for the confidentiality of their login credentials and for all activity carried out from their account.",
      },
    },

    section4: {
      title: "4. User Obligations",
      intro: "The user agrees to:",
      obligations: [
        "Use the Service in accordance with these Terms and applicable law",
        "Not use the Service for illegal, fraudulent, or harmful purposes",
        "Not generate defamatory, hateful, discriminatory, or illegal content",
        "Not attempt to circumvent the security measures of the Service",
        "Not use unauthorized robots, scrapers, or other automated tools",
        "Respect the intellectual property rights of third parties",
        "Not resell or redistribute the Service without authorization",
      ],
    },

    section5: {
      title: "5. Intellectual Property",
      posty: {
        title: "5.1 Posty's Property",
        content: "All elements of the Service (design, logos, text, source code, algorithms) are the exclusive property of Posty and are protected by intellectual property laws.",
      },
      generated: {
        title: "5.2 Generated Content",
        content: "The user retains ownership of the prompts they submit. Content generated by the AI may be freely used by the user, subject to respecting the rights of third parties and LinkedIn's terms of use.",
      },
      license: {
        title: "5.3 License",
        content: "Posty grants the user a limited, non-exclusive, and revocable license to use the Service for personal and professional purposes.",
      },
    },

    section6: {
      title: "6. Pricing and Subscriptions",
      intro: "The Service offers paid subscriptions. The detailed terms are as follows:",
      plans: {
        title: "6.1 Available Plans",
        content: "Posty offers two paid subscriptions: a Pro plan and a Max plan. A free plan with limited features exists for legacy users but is no longer offered to new registrants. Current prices are displayed in the application and on the pricing page. Posty reserves the right to change its prices with 30 days' notice for current subscriptions.",
      },
      trial: {
        title: "6.2 Free Trial Period",
        content: "The Pro and Max plans include a 7-day free trial period. During this period, the user has access to all features of the chosen plan at no cost. A valid credit card is required to start the trial. If the user does not cancel before the end of the trial period, the subscription will be automatically activated and the first payment will be charged. The user may cancel at any time during the trial period at no cost from the application settings or by contacting support.",
      },
      billing: {
        title: "6.3 Billing and Payment",
        content: "Payments are securely managed by Stripe. Subscriptions are billed on a recurring basis (monthly or yearly depending on the chosen option). Invoices are available in the application's payment history. All prices are listed in euros (EUR) including tax.",
      },
      guarantee: {
        title: "6.4 Money-Back Guarantee",
        content: "After the free trial period, Posty offers a 7-day money-back guarantee from the first payment. If the user is not satisfied with the service, they may request a full refund within this period by contacting support at postygroup@gmail.com. After this 7-day period, no refund will be issued for the current period, but the user may cancel their subscription at any time to avoid future charges.",
      },
      cancellation: {
        title: "6.5 Subscription Cancellation",
        content: "The user may cancel their subscription at any time from the application settings. Cancellation takes effect at the end of the current billing period. The user retains access to paid features until that date. After cancellation, access to premium features is revoked.",
      },
      withdrawal: {
        title: "6.6 Right of Withdrawal",
        content: "In accordance with Article L.221-28 of the French Consumer Code, by subscribing to Posty, the user expressly requests immediate execution of the service and acknowledges waiving their 14-day right of withdrawal for digital content provided from the start of service execution.",
      },
    },

    section7: {
      title: "7. Limitation of Liability",
      ai: {
        title: "7.1 Nature of AI Content",
        content: "Content generated by artificial intelligence is provided \"as is\". The user acknowledges that this content may contain errors or inaccuracies and agrees to verify it before publication.",
      },
      availability: {
        title: "7.2 Availability",
        content: "Posty strives to ensure the availability of the Service but cannot guarantee uninterrupted availability. Maintenance or outages may occur.",
      },
      userResponsibility: {
        title: "7.3 User Responsibility",
        content: "The user is solely responsible for the use they make of generated content and its publication on LinkedIn or any other platform.",
      },
    },

    section8: {
      title: "8. Suspension and Termination",
      byUser: {
        title: "8.1 By the User",
        content: "The user may delete their account at any time from the application settings. Deletion results in the erasure of personal data in accordance with our Privacy Policy.",
      },
      byPosty: {
        title: "8.2 By Posty",
        content: "Posty reserves the right to suspend or terminate a user's access in the event of a violation of these Terms, without prior notice or compensation.",
      },
    },

    section9: {
      title: "9. Data Protection",
      content: "The processing of personal data is described in our Privacy Policy, which forms an integral part of these Terms.",
      privacyLink: "Privacy Policy",
    },

    section10: {
      title: "10. Changes to the Terms",
      content: "Posty reserves the right to modify these Terms at any time. Users will be informed of substantial changes by email or through the application. Continued use of the Service after modification constitutes acceptance of the new Terms.",
    },

    section11: {
      title: "11. Governing Law and Disputes",
      content1: "These Terms are governed by French law. In the event of a dispute, the parties agree to seek an amicable solution before taking legal action.",
      content2: "Failing amicable agreement, French courts shall have sole jurisdiction.",
      content3: "In accordance with Article L.616-1 of the French Consumer Code, the user may freely use the following consumer mediator: Medicys — 73 Boulevard de Clichy, 75009 Paris — https://www.medicys.fr — The consumer may also use the European Online Dispute Resolution platform: https://ec.europa.eu/consumers/odr",
    },

    section12: {
      title: "12. Miscellaneous Provisions",
      entirety: {
        title: "12.1 Entirety",
        content: "These Terms constitute the entire agreement between the user and Posty.",
      },
      severability: {
        title: "12.2 Severability",
        content: "If any provision of these Terms is declared void, the remaining provisions shall remain enforceable.",
      },
      noWaiver: {
        title: "12.3 No Waiver",
        content: "Failure to exercise a right under these Terms does not constitute a waiver of that right.",
      },
    },

    section13: {
      title: "13. Contact",
      intro: "For any questions regarding these Terms:",
      email: "Email: postygroup@gmail.com",
    },
  },

  // Legal Notices
  notices: {
    title: "Legal Notices",
    metaDescription: "Posty Legal Notices: information about the publisher, hosting provider, and applicable rights.",
    intro: "In accordance with the provisions of Articles 6-III and 19 of Law No. 2004-575 of June 21, 2004, for Confidence in the Digital Economy (LCEN).",

    section1: {
      title: "1. Publisher",
      appName: "Application name:",
      legalForm: "Legal form:",
      address: "Registered office:",
      siret: "SIRET:",
      capital: "Share capital:",
      vat: "VAT number:",
      email: "Email:",
      phone: "Phone:",
      toComplete: "Micro-enterprise (Sole Proprietorship)",
      addressValue: "42170 Chambles, France",
      siretValue: "101 134 633 00011",
      capitalValue: "Not applicable (Sole Proprietorship)",
      vatValue: "Not applicable — VAT exemption (Art. 293 B of the French Tax Code)",
      note: "* POSTY is published by Emilien Nepveu as a micro-entrepreneur.",
    },

    section2: {
      title: "2. Publication Director",
      name: "Name:",
      email: "Email:",
      toComplete: "Emilien Nepveu",
    },

    section3: {
      title: "3. Hosting Providers",
      name: "Name:",
      company: "Company:",
      address: "Address:",
      website: "Website:",
      firebase: "Google Cloud Platform / Firebase",
      google: "Google LLC",
      googleAddress: "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA",
      vercel: "Vercel Inc.",
      vercelAddress: "340 S Lemon Ave #4133, Walnut, CA 91789, USA",
      vercelWebsite: "https://vercel.com",
    },

    section4: {
      title: "4. Data Protection Officer (DPO)",
      contact: "DPO Contact:",
      description: "For any question regarding the protection of your personal data or to exercise your GDPR rights, you may contact our DPO at the address above.",
    },

    section5: {
      title: "5. Intellectual Property",
      content1: "All content on this site (text, images, logos, icons, sounds, software, etc.) is the exclusive property of Posty or its partners and is protected by French and international intellectual property laws.",
      content2: "Any reproduction, representation, modification, publication, or adaptation of all or part of the site's elements, by any means or process, is prohibited without the prior written authorization of Posty.",
    },

    section6: {
      title: "6. Credits",
      development: "Design and development:",
      team: "Posty Team",
      tech: "Technologies used:",
      technologies: [
        "Next.js / React",
        "TypeScript",
        "Tailwind CSS",
        "Firebase (Authentication, Firestore)",
        "Artificial Intelligence (OpenAI / Anthropic)",
      ],
    },

    section7: {
      title: "7. Cookies",
      content1: "The Posty application uses cookies to ensure the proper functioning of the service and improve the user experience.",
      content2: "For more information about the use of cookies and managing your preferences, please refer to our Cookie Policy.",
      cookiesLink: "Cookie Policy",
    },

    section8: {
      title: "8. Limitation of Liability",
      content1: "Posty strives to ensure the accuracy of the information published on the application. However, Posty cannot guarantee the accuracy, precision, or completeness of the information provided.",
      content2: "Content generated by artificial intelligence is provided for informational purposes. The user is solely responsible for the use they make of it.",
    },

    section9: {
      title: "9. Governing Law",
      content: "These Legal Notices are governed by French law. In the event of a dispute, and failing amicable resolution, French courts shall have sole jurisdiction.",
    },

    section10: {
      title: "10. Contact",
      intro: "For any question or request for information regarding the application:",
      emailGeneral: "General email:",
      emailGDPR: "GDPR email:",
      emailSupport: "Technical support:",
    },
  },

  // Cookie Policy
  cookies: {
    title: "Cookie Policy",
    metaDescription: "Posty Cookie Policy: learn what cookies we use and how to manage them.",

    section1: {
      title: "1. What Is a Cookie?",
      content: "A cookie is a small text file stored on your device (computer, tablet, smartphone) when you visit a website or use an application. Cookies store information about your browsing and are essential for the proper functioning of many online services.",
    },

    section2: {
      title: "2. Cookies Used by Posty",
      intro: "Posty uses different categories of cookies:",
      essential: {
        title: "2.1 Strictly Necessary Cookies",
        description: "These cookies are essential for the operation of the service. They cannot be disabled.",
        items: [
          { name: "Firebase Auth Session", purpose: "Authentication and session management", duration: "Session", provider: "Firebase (Google)" },
          { name: "twitter_code_verifier", purpose: "Twitter login security (OAuth PKCE)", duration: "10 minutes", provider: "Posty" },
          { name: "posty_theme", purpose: "Remembering your theme preference (light/dark)", duration: "Persistent", provider: "Posty (localStorage)" },
          { name: "posty_cookie_consent", purpose: "Recording your cookie consent choices", duration: "12 months", provider: "Posty (localStorage)" },
        ],
      },
      functional: {
        title: "2.2 Functional Cookies",
        description: "These cookies enhance your user experience but are not essential.",
        items: [
          { name: "posty_sidebar_collapsed", purpose: "Remembering sidebar state", duration: "Persistent", provider: "Posty (localStorage)" },
          { name: "posty_onboarding_completed", purpose: "Knowing if onboarding was completed", duration: "Persistent", provider: "Posty (localStorage)" },
          { name: "posty_last_visited_page", purpose: "Remembering the last visited page", duration: "Persistent", provider: "Posty (localStorage)" },
        ],
      },
      analytics: {
        title: "2.3 Analytics Cookies (optional)",
        description: "These cookies help us understand how you use the application to improve it. They are only activated with your explicit consent.",
        items: [
          { name: "Internal analytics", purpose: "Anonymized usage metrics (number of posts, sessions)", duration: "12 months", provider: "Posty" },
        ],
        noThirdParty: "Posty does not use third-party analytics services (no Google Analytics, Facebook Pixel, etc.). All measurements are performed internally and data remains on our servers.",
      },
      thirdParty: {
        title: "2.4 Third-Party Cookies",
        description: "Some third-party services may set cookies during their use:",
        items: [
          { name: "Stripe", purpose: "Payment security and fraud prevention", duration: "Variable", provider: "Stripe Inc." },
          { name: "LinkedIn OAuth", purpose: "LinkedIn connection and publishing", duration: "Session", provider: "LinkedIn (Microsoft)" },
          { name: "Twitter/X OAuth", purpose: "Twitter/X connection and publishing", duration: "Session", provider: "X Corp." },
          { name: "Facebook/Threads OAuth", purpose: "Facebook/Threads connection and publishing", duration: "Session", provider: "Meta Platforms" },
        ],
        note: "These third-party cookies are subject to the privacy policies of their respective providers.",
      },
    },

    section3: {
      title: "3. Managing Your Preferences",
      intro: "You can manage your cookie preferences in several ways:",
      methods: [
        { title: "Via the cookie banner", desc: "On your first visit, a banner allows you to accept or decline non-essential cookies." },
        { title: "Via application settings", desc: "In Settings > Privacy Preferences, you can change your choices at any time." },
        { title: "Via your browser", desc: "You can configure your browser to block or delete cookies. Please note that this may affect the functioning of the service." },
      ],
    },

    section4: {
      title: "4. Consequences of Refusing Cookies",
      content: "Refusing strictly necessary cookies may prevent the use of the service (authentication impossible). Refusing analytics cookies has no impact on your use of the service.",
    },

    section5: {
      title: "5. Retention Period",
      content: "Your cookie preferences are stored for 12 months. At the end of this period, your consent will be requested again.",
    },

    section6: {
      title: "6. Updates to This Policy",
      content: "This cookie policy may be updated to reflect changes in our practices or for regulatory reasons. The last updated date is indicated at the top of this page.",
    },

    section7: {
      title: "7. Contact",
      intro: "For any questions regarding our use of cookies:",
      email: "Email: postygroup@gmail.com",
    },
  },

  // Cookie Banner
  cookieBanner: {
    title: "We respect your privacy",
    description: "Posty uses essential cookies for the operation of the service. Analytics cookies are optional and help us improve the application.",
    acceptAll: "Accept all",
    rejectOptional: "Reject optional",
    customize: "Customize",
    savePreferences: "Save my preferences",
    essentialLabel: "Essential cookies",
    essentialDesc: "Required for operation (authentication, security). Cannot be disabled.",
    analyticsLabel: "Analytics cookies",
    analyticsDesc: "Help us understand how the application is used to improve it.",
    learnMore: "Learn more",
    preferencesTitle: "Cookie preferences",
  },
} as const;
