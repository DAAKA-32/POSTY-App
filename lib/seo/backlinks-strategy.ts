/**
 * Backlinks Strategy for POSTY
 * Comprehensive plan for acquiring high-quality backlinks
 * Focus: SaaS, LinkedIn, AI Tools, Content Marketing niches
 */

/**
 * Target Link Building Categories
 * Prioritized by relevance and authority potential
 */
export const backlinkCategories = {
  // Priority 1: Direct Competitors & Alternatives
  competitorAlternatives: {
    priority: 1,
    description: "Appear on 'alternatives to' and comparison sites",
    targets: [
      {
        type: "Alternative Pages",
        examples: [
          "G2 Crowd - LinkedIn Tools category",
          "Capterra - Social Media Marketing",
          "Product Hunt - Launch and get featured",
          "AlternativeTo - Register as Taplio/Jasper alternative",
          "SaaSHub - AI Writing Tools category",
        ],
        action: "Create profile, gather reviews, optimize listing",
      },
      {
        type: "Comparison Articles",
        examples: [
          "Best LinkedIn Post Generators 2024",
          "AI Writing Tools Comparison",
          "Taplio vs Alternatives",
        ],
        action: "Reach out to authors for inclusion",
      },
    ],
  },

  // Priority 2: LinkedIn & Professional Networks
  linkedInNiche: {
    priority: 2,
    description: "Build authority in LinkedIn marketing space",
    targets: [
      {
        type: "LinkedIn Influencers",
        strategy: "Offer free Pro accounts for honest reviews/mentions",
        targetProfiles: [
          "LinkedIn Top Voices in Marketing",
          "Personal Branding experts",
          "B2B Content creators",
          "Solopreneurs with 10K+ followers",
        ],
      },
      {
        type: "LinkedIn Marketing Blogs",
        examples: [
          "Social Media Examiner",
          "Buffer Blog",
          "Hootsuite Blog",
          "HubSpot Marketing Blog",
        ],
        action: "Guest post or tool mention",
      },
      {
        type: "LinkedIn Guides",
        strategy: "Create ultimate guides and get cited",
        topics: [
          "LinkedIn Algorithm Guide",
          "Personal Branding Playbook",
          "LinkedIn Content Calendar Template",
        ],
      },
    ],
  },

  // Priority 3: AI & Tech Publications
  aiTechMedia: {
    priority: 3,
    description: "Position as innovative AI tool",
    targets: [
      {
        type: "AI Tool Directories",
        examples: [
          "There's An AI For That",
          "Futurepedia",
          "AI Tool Directory",
          "TopAI.tools",
          "AIToolsDirectory.com",
        ],
        action: "Submit and maintain updated listing",
      },
      {
        type: "Tech Blogs",
        examples: [
          "TechCrunch (for funding/launch news)",
          "VentureBeat AI section",
          "The Verge - Productivity tools",
          "Mashable - Tech tools",
        ],
        action: "Press releases, unique angles",
      },
      {
        type: "SaaS Communities",
        examples: [
          "IndieHackers - Share building journey",
          "Hacker News - Launch post",
          "Reddit r/SaaS, r/Entrepreneur",
          "Dev.to - Technical AI articles",
        ],
        action: "Authentic engagement, not spam",
      },
    ],
  },

  // Priority 4: Content Marketing & SEO
  contentMarketing: {
    priority: 4,
    description: "Create linkable assets and resources",
    linkableAssets: [
      {
        type: "Original Research",
        ideas: [
          "LinkedIn Engagement Study 2024 - Analyze 10K posts",
          "Best Posting Times by Industry",
          "AI vs Human-Written Posts Comparison",
          "LinkedIn Algorithm Changes Timeline",
        ],
        expectedLinks: "High - Data-driven content attracts citations",
      },
      {
        type: "Free Tools",
        ideas: [
          "LinkedIn Post Analyzer (free, no signup)",
          "Engagement Calculator",
          "Profile Headline Generator",
          "Post Character Counter",
        ],
        expectedLinks: "Medium - Tools get shared and linked",
      },
      {
        type: "Templates & Resources",
        ideas: [
          "50 LinkedIn Post Templates PDF",
          "Content Calendar Spreadsheet",
          "Personal Branding Checklist",
          "LinkedIn Analytics Dashboard Template",
        ],
        expectedLinks: "Medium - Resources attract resource page links",
      },
      {
        type: "Ultimate Guides",
        ideas: [
          "Complete Guide to LinkedIn Storytelling",
          "B2B LinkedIn Strategy Playbook",
          "LinkedIn Personal Branding Masterclass",
          "How to Go Viral on LinkedIn",
        ],
        expectedLinks: "High - Comprehensive guides get referenced",
      },
    ],
  },

  // Priority 5: Local & Niche Directories
  directories: {
    priority: 5,
    description: "Build foundational link profile",
    targets: [
      {
        type: "Startup Directories",
        examples: [
          "Crunchbase",
          "AngelList",
          "F6S",
          "BetaList",
          "StartupStash",
        ],
      },
      {
        type: "French Directories (FR market)",
        examples: [
          "French Tech",
          "Maddyness",
          "FrenchWeb",
          "Journal du Net",
          "BPI France",
        ],
      },
      {
        type: "Marketing Tool Lists",
        examples: [
          "Zapier App Directory",
          "Make (Integromat) directory",
          "Marketing tool roundups",
        ],
      },
    ],
  },
};

/**
 * Outreach Templates
 * Personalized email templates for link building
 */
export const outreachTemplates = {
  guestPost: {
    subject: "Contribution article - {Topic} pour {Site}",
    body: `Bonjour {Name},

Je suis {YourName}, fondateur de POSTY, un outil IA pour la creation de posts LinkedIn.

J'ai remarque que {Site} publie d'excellents contenus sur {Topic}. J'aimerais proposer un article invite sur :

"{Proposed Title}"

Points cles que je couvrirais :
- {Point1}
- {Point2}
- {Point3}

L'article serait 100% original et adapte a votre audience. Seriez-vous interesse ?

Cordialement,
{YourName}`,
  },

  toolMention: {
    subject: "Suggestion pour votre article - {ArticleTitle}",
    body: `Bonjour {Name},

J'ai lu votre excellent article "{ArticleTitle}" et je pense qu'il pourrait bénéficier d'une mention de POSTY dans la section {Section}.

POSTY est un générateur de posts LinkedIn par IA qui crée 2 versions (Storytelling & Business) en quelques secondes. Il pourrait être utile à vos lecteurs car {Reason}.

Voici quelques infos :
- Site : postyapp.ai
- Prix : Gratuit (3 posts/semaine) ou Pro 9,99€/mois
- Différence : Double version unique (narratif + factuel)

Je serais ravi de répondre à vos questions.

Cordialement,
{YourName}`,
  },

  partnership: {
    subject: "Partenariat POSTY x {TheirBrand}",
    body: `Bonjour {Name},

Je suis {YourName} de POSTY. Je vous contacte car je vois une opportunité de partenariat mutuellement bénéfique.

Proposition :
- Offre exclusive POSTY Pro pour vos utilisateurs/abonnés
- Co-création de contenu (webinar, guide, etc.)
- Intégration technique si pertinent

En échange, nous pourrions :
- Promouvoir {TheirBrand} auprès de notre audience
- Créer du contenu conjoint
- {CustomOffer}

Intéressé pour en discuter ?

Cordialement,
{YourName}`,
  },

  influencerReview: {
    subject: "Accès Pro gratuit à POSTY - Votre avis ?",
    body: `Bonjour {Name},

Je suis fan de votre contenu LinkedIn sur {Topic}. Je suis {YourName}, fondateur de POSTY.

J'aimerais vous offrir un accès Pro illimité (valeur 120€/an) pour tester notre outil de génération de posts LinkedIn par IA.

Ce qui nous différencie :
- 2 versions par idée : Storytelling + Business
- Génération en 30 secondes
- Optimisé pour l'algorithme LinkedIn

Aucune obligation de publication, mais si vous aimez l'outil, un post ou une mention serait apprécié.

Intéressé ?

Cordialement,
{YourName}`,
  },
};

/**
 * Link Building Calendar
 * Monthly action plan for consistent backlink acquisition
 */
export const linkBuildingCalendar = {
  monthly: {
    week1: {
      focus: "Directories & Listings",
      actions: [
        "Submit to 2-3 new directories",
        "Update existing listings with fresh screenshots",
        "Respond to reviews on G2/Capterra",
        "Check for broken competitor backlinks (opportunity)",
      ],
    },
    week2: {
      focus: "Content Creation",
      actions: [
        "Publish 1 linkable asset (guide, template, tool)",
        "Create social proof content (case study, testimonial)",
        "Update existing content with fresh data",
        "Internal linking audit",
      ],
    },
    week3: {
      focus: "Outreach",
      actions: [
        "Send 10-15 personalized outreach emails",
        "Follow up on previous outreach (1 week later)",
        "Engage with target site authors on social",
        "Guest post pitching",
      ],
    },
    week4: {
      focus: "Partnerships & PR",
      actions: [
        "Reach out to 2-3 potential partners",
        "Contact LinkedIn influencers for reviews",
        "Monitor brand mentions (claim unlinked mentions)",
        "HARO responses (Help A Reporter Out)",
      ],
    },
  },

  quarterly: {
    q1: "Launch campaign - Product Hunt, BetaList, AI directories",
    q2: "Research campaign - Publish original LinkedIn data study",
    q3: "Partnership push - Influencer reviews, co-marketing",
    q4: "Year-end roundups - Get included in 'Best of' lists",
  },
};

/**
 * Metrics & KPIs for Link Building
 */
export const linkBuildingKPIs = {
  targets: {
    monthly: {
      newBacklinks: 10, // New referring domains
      directoryListings: 3, // New directory submissions
      guestPosts: 1, // Published guest articles
      mentionsClaimed: 5, // Unlinked mentions converted to links
    },
    quarterly: {
      domainAuthority: "+5 DA", // Moz/Ahrefs improvement
      referringDomains: 50, // Total new RDs
      topTierLinks: 3, // DA 50+ sites
    },
  },

  tracking: {
    tools: [
      "Ahrefs - Backlink monitoring",
      "Google Search Console - Links report",
      "Moz - Domain Authority tracking",
      "BuzzSumo - Brand mention alerts",
    ],
    frequency: "Weekly backlink audit, Monthly full report",
  },
};

/**
 * Competitor Backlink Analysis
 * Sites linking to competitors to target
 */
export const competitorAnalysis = {
  competitors: ["Taplio", "Jasper", "Copy.ai", "Authory", "Typeshare"],
  analysisSteps: [
    "Export competitor backlinks from Ahrefs/SEMrush",
    "Filter by DA 30+",
    "Categorize: directories, blogs, news, social",
    "Identify overlapping links (multiple competitors)",
    "Prioritize by relevance and obtainability",
    "Create outreach list",
  ],
  opportunityTypes: [
    "Resource pages listing similar tools",
    "Comparison articles without POSTY",
    "Roundup posts (Best AI tools for X)",
    "Guest posts by competitors (pitch same sites)",
    "Broken links to competitor content",
  ],
};

export default {
  backlinkCategories,
  outreachTemplates,
  linkBuildingCalendar,
  linkBuildingKPIs,
  competitorAnalysis,
};
