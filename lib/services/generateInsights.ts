import { PostInsights, UserProfile } from "@/types";

/**
 * User profile context for personalized insights
 */
interface UserContext {
  sector?: string;
  role?: string;
  objective?: string;
  targetAudience?: string;
  communicationTone?: string;
}

/**
 * Content analysis metrics
 */
interface ContentMetrics {
  wordCount: number;
  charCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  paragraphCount: number;
  lineBreaks: number;
  hasEmojis: boolean;
  emojiCount: number;
  hasHashtags: boolean;
  hashtagCount: number;
  hasQuestions: boolean;
  questionCount: number;
  hasCTA: boolean;
  ctaType: string | null;
  hasNumbers: boolean;
  numberCount: number;
  hookLength: number;
  hasStrongHook: boolean;
  readabilityScore: number;
  engagementScore: number;
}

/**
 * Analyze content and extract detailed metrics
 */
function analyzeContent(content: string): ContentMetrics {
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const charCount = content.length;

  // Sentence analysis
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;
  const avgWordsPerSentence = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;

  // Structure analysis
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
  const paragraphCount = paragraphs.length;
  const lineBreaks = (content.match(/\n/g) || []).length;

  // Emoji analysis
  const emojiMatches = content.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || [];
  const hasEmojis = emojiMatches.length > 0;
  const emojiCount = emojiMatches.length;

  // Hashtag analysis
  const hashtagMatches = content.match(/#\w+/g) || [];
  const hasHashtags = hashtagMatches.length > 0;
  const hashtagCount = hashtagMatches.length;

  // Question analysis
  const questionMatches = content.match(/\?/g) || [];
  const hasQuestions = questionMatches.length > 0;
  const questionCount = questionMatches.length;

  // CTA analysis
  const ctaPatterns = {
    comment: /\b(commentez|commenter|partagez|partager|réagissez|votre avis|qu'en pensez-vous|dites-moi|racontez)\b/i,
    click: /\b(cliquez|découvrez|lien|bio|profil)\b/i,
    follow: /\b(suivez|abonnez|follow)\b/i,
    save: /\b(enregistrez|sauvegardez|gardez)\b/i,
    action: /\b(téléchargez|inscrivez|rejoignez|contactez)\b/i,
  };

  let hasCTA = false;
  let ctaType: string | null = null;
  for (const [type, pattern] of Object.entries(ctaPatterns)) {
    if (pattern.test(content)) {
      hasCTA = true;
      ctaType = type;
      break;
    }
  }

  // Number analysis
  const numberMatches = content.match(/\d+[%€$]?|\d+\s*(ans?|mois|jours?|heures?|minutes?|k|M|milliards?|millions?)/gi) || [];
  const hasNumbers = numberMatches.length > 0;
  const numberCount = numberMatches.length;

  // Hook analysis (first line or first 150 chars)
  const firstLine = content.split('\n')[0];
  const hookLength = firstLine.length;
  const hookIndicators = [
    /^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ].*[?!]$/,  // Starts with capital, ends with ? or !
    /^\d+/,                            // Starts with number
    /^["«]/,                           // Starts with quote
    /^(J'ai|Je|On|Hier|Aujourd'hui|Il y a)/i, // Story starter
    /^(Stop|Attention|Erreur|Secret|Astuce)/i, // Attention grabber
  ];
  const hasStrongHook = hookIndicators.some(p => p.test(firstLine)) || hookLength < 80;

  // Calculate readability score (0-100)
  let readabilityScore = 50;
  if (avgWordsPerSentence <= 15) readabilityScore += 15;
  else if (avgWordsPerSentence <= 20) readabilityScore += 10;
  else if (avgWordsPerSentence > 25) readabilityScore -= 15;

  if (paragraphCount >= 3 && paragraphCount <= 6) readabilityScore += 15;
  if (lineBreaks >= 3) readabilityScore += 10;
  if (hasEmojis && emojiCount <= 5) readabilityScore += 10;
  if (emojiCount > 8) readabilityScore -= 10;

  readabilityScore = Math.max(0, Math.min(100, readabilityScore));

  // Calculate engagement score (0-100)
  let engagementScore = 30;
  if (hasCTA) engagementScore += 20;
  if (hasQuestions) engagementScore += 15;
  if (hasHashtags && hashtagCount <= 5) engagementScore += 10;
  if (hasEmojis) engagementScore += 10;
  if (hasNumbers) engagementScore += 10;
  if (hasStrongHook) engagementScore += 15;
  if (wordCount >= 100 && wordCount <= 250) engagementScore += 10;

  engagementScore = Math.max(0, Math.min(100, engagementScore));

  return {
    wordCount,
    charCount,
    sentenceCount,
    avgWordsPerSentence,
    paragraphCount,
    lineBreaks,
    hasEmojis,
    emojiCount,
    hasHashtags,
    hashtagCount,
    hasQuestions,
    questionCount,
    hasCTA,
    ctaType,
    hasNumbers,
    numberCount,
    hookLength,
    hasStrongHook,
    readabilityScore,
    engagementScore,
  };
}

/**
 * Generate specific strengths based on content analysis
 */
function generateStrengths(metrics: ContentMetrics, variant?: "storytelling" | "business"): string[] {
  const strengths: string[] = [];

  if (metrics.hasStrongHook) {
    strengths.push(`Accroche percutante de ${metrics.hookLength} caractères qui capte l'attention dès les premières secondes`);
  }

  if (metrics.paragraphCount >= 3 && metrics.lineBreaks >= 3) {
    strengths.push(`Structure aérée en ${metrics.paragraphCount} paragraphes, idéale pour la lecture mobile (78% des utilisateurs LinkedIn)`);
  }

  if (metrics.avgWordsPerSentence <= 15) {
    strengths.push(`Phrases courtes (${metrics.avgWordsPerSentence} mots en moyenne) qui maintiennent le rythme et l'attention`);
  }

  if (metrics.hasNumbers && variant === "business") {
    strengths.push(`${metrics.numberCount} donnée(s) chiffrée(s) qui renforce(nt) votre crédibilité et rend(ent) le message mémorable`);
  }

  if (metrics.hasCTA) {
    const ctaMessages: Record<string, string> = {
      comment: "Appel à l'interaction qui encourage les commentaires et booste la visibilité algorithmique",
      click: "CTA orienté action qui guide clairement votre audience",
      follow: "Invitation à suivre qui développe votre communauté",
      save: "Incitation à sauvegarder qui signale un contenu de valeur à l'algorithme",
      action: "Call-to-action direct qui maximise les conversions",
    };
    strengths.push(ctaMessages[metrics.ctaType || "comment"]);
  }

  if (metrics.hasQuestions && metrics.questionCount <= 3) {
    strengths.push(`${metrics.questionCount} question(s) rhétorique(s) qui implique(nt) le lecteur et favorise(nt) l'engagement`);
  }

  if (metrics.hasEmojis && metrics.emojiCount >= 2 && metrics.emojiCount <= 5) {
    strengths.push(`Utilisation équilibrée des émojis (${metrics.emojiCount}) qui humanise le message sans surcharger`);
  }

  if (metrics.wordCount >= 100 && metrics.wordCount <= 200) {
    strengths.push(`Longueur optimale de ${metrics.wordCount} mots : assez pour développer votre idée, assez court pour être lu en entier`);
  }

  // Return top 4 strengths
  return strengths.slice(0, 4);
}

/**
 * Generate specific actionable improvements
 */
function generateImprovements(metrics: ContentMetrics, variant?: "storytelling" | "business"): string[] {
  const improvements: string[] = [];

  if (!metrics.hasStrongHook) {
    improvements.push("💡 Renforcez votre accroche : commencez par un chiffre choc, une question provocante ou une affirmation contre-intuitive. Ex: \"90% des posts LinkedIn échouent pour cette raison...\"");
  }

  if (!metrics.hasCTA) {
    if (variant === "storytelling") {
      improvements.push("💬 Ajoutez un appel à l'interaction en fin de post. Ex: \"Et vous, avez-vous vécu une situation similaire ? Racontez-moi en commentaire 👇\"");
    } else {
      improvements.push("🎯 Terminez par un CTA clair. Ex: \"Quel est votre plus grand défi sur ce sujet ? Partagez en commentaire, je réponds à chacun.\"");
    }
  }

  if (!metrics.hasQuestions && variant === "storytelling") {
    improvements.push("❓ Intégrez 1-2 questions pour créer du dialogue. Les posts avec questions génèrent 50% de commentaires en plus.");
  }

  if (metrics.avgWordsPerSentence > 20) {
    improvements.push(`✂️ Raccourcissez vos phrases (actuellement ${metrics.avgWordsPerSentence} mots/phrase). Visez 12-15 mots max pour une lecture fluide sur mobile.`);
  }

  if (metrics.paragraphCount < 3) {
    improvements.push("📝 Aérez votre texte avec plus de sauts de ligne. Un bloc de texte dense perd 60% des lecteurs sur mobile.");
  }

  if (!metrics.hasEmojis && variant === "storytelling") {
    improvements.push("🎨 Ajoutez 2-3 émojis stratégiques pour guider l'œil et humaniser votre message. Placez-les en début de paragraphe.");
  }

  if (metrics.emojiCount > 8) {
    improvements.push(`⚠️ Réduisez le nombre d'émojis (${metrics.emojiCount} actuellement). Plus de 5-6 émojis peut nuire à la crédibilité professionnelle.`);
  }

  if (!metrics.hasNumbers && variant === "business") {
    improvements.push("📊 Intégrez des données chiffrées pour renforcer votre expertise. Les posts avec statistiques sont partagés 3x plus.");
  }

  if (metrics.hashtagCount > 5) {
    improvements.push(`#️⃣ Réduisez vos hashtags (${metrics.hashtagCount} → 3-5 max). Trop de hashtags dilue la portée et paraît spam.`);
  }

  if (metrics.hashtagCount === 0) {
    improvements.push("#️⃣ Ajoutez 3-5 hashtags ciblés à la fin de votre post pour améliorer la découvrabilité.");
  }

  if (metrics.wordCount > 300) {
    improvements.push(`📏 Post un peu long (${metrics.wordCount} mots). Les posts de 150-250 mots ont le meilleur taux de lecture complète.`);
  }

  if (metrics.wordCount < 80) {
    improvements.push(`📏 Post très court (${metrics.wordCount} mots). Développez davantage pour apporter plus de valeur et retenir l'attention.`);
  }

  // Return top 3 most relevant improvements
  return improvements.slice(0, 3);
}

/**
 * Generate personalized coaching tip based on user profile
 */
function generateCoachingTip(metrics: ContentMetrics, userContext?: UserContext, variant?: "storytelling" | "business"): string {
  const tips: string[] = [];

  // Objective-based coaching
  if (userContext?.objective) {
    const objectiveTips: Record<string, string> = {
      "Trouver de nouveaux clients": "🎯 Pour attirer des clients : terminez toujours par une question ouverte liée à leur problématique. Cela génère des commentaires = visibilité = opportunités.",
      "Augmenter mon chiffre d'affaires": "💰 Conseil conversion : chaque post devrait résoudre un problème concret de votre cible. Montrez votre expertise en action, pas juste en théorie.",
      "Développer ma visibilité et crédibilité": "🌟 Pour la visibilité : publiez à heures fixes (l'algorithme aime la régularité) et répondez à TOUS les commentaires dans l'heure.",
      "Générer des leads qualifiés": "🧲 Pour générer des leads : offrez une valeur concrète (checklist, template, conseil actionnable) qui donne envie d'en savoir plus.",
      "Construire une audience engagée": "💬 Pour l'engagement : posez des questions qui divisent (opinion A vs B) - les débats génèrent 3x plus de commentaires.",
    };
    const tip = objectiveTips[userContext.objective];
    if (tip) tips.push(tip);
  }

  // Target audience coaching
  if (userContext?.targetAudience) {
    if (userContext.targetAudience.includes("Dirigeants") || userContext.targetAudience.includes("C-Level")) {
      tips.push("👔 Pour toucher les dirigeants : privilégiez les insights stratégiques et les résultats business. Ils scrollent vite, allez droit au but.");
    } else if (userContext.targetAudience.includes("Entrepreneurs") || userContext.targetAudience.includes("Fondateurs")) {
      tips.push("🚀 Pour les entrepreneurs : partagez vos échecs et apprentissages. L'authenticité crée la connexion, pas la perfection.");
    } else if (userContext.targetAudience.includes("Freelances")) {
      tips.push("💼 Pour les freelances : montrez votre processus et vos coulisses. Ils cherchent l'inspiration ET les méthodes concrètes.");
    }
  }

  // Sector-specific coaching
  if (userContext?.sector) {
    if (userContext.sector.includes("Tech")) {
      tips.push("💻 Dans la Tech : les posts éducatifs (tutoriels, explications) performent 2x mieux que les annonces produit.");
    } else if (userContext.sector.includes("Marketing")) {
      tips.push("📈 En Marketing : montrez vos résultats avec des captures d'écran et des métriques réelles. La preuve sociale est clé.");
    } else if (userContext.sector.includes("Finance")) {
      tips.push("💹 En Finance : vulgarisez les concepts complexes avec des analogies du quotidien. Rendez l'expertise accessible.");
    }
  }

  // Variant-specific coaching
  if (variant === "storytelling" && metrics.engagementScore < 60) {
    tips.push("📖 Storytelling : la clé est l'émotion. Commencez par le moment de tension/problème, pas par le contexte. Hook → Conflit → Résolution → Leçon.");
  } else if (variant === "business" && metrics.engagementScore < 60) {
    tips.push("💼 Post business : structurez en Problème → Solution → Preuve → CTA. Chaque phrase doit apporter de la valeur ou être supprimée.");
  }

  // Generic high-value tips if no specific context
  if (tips.length === 0) {
    if (metrics.engagementScore >= 70) {
      tips.push("🔥 Ce post a un fort potentiel ! Pour maximiser l'impact : publiez quand votre audience est active et répondez aux commentaires dans les 30 premières minutes.");
    } else if (metrics.engagementScore >= 50) {
      tips.push("✨ Bon post ! Pour passer au niveau supérieur : ajoutez une touche personnelle (anecdote, opinion tranchée) qui vous différencie.");
    } else {
      tips.push("💡 Conseil coaching : un post qui performe = 1 idée forte + 1 structure claire + 1 CTA engageant. Simplifiez pour amplifier.");
    }
  }

  return tips[0] || "💡 Continuez à publier régulièrement et analysez vos posts les plus performants pour comprendre ce qui résonne avec votre audience.";
}

/**
 * Generate hook analysis
 */
function generateHookAnalysis(content: string, metrics: ContentMetrics): string {
  const firstLine = content.split('\n')[0];

  if (metrics.hasStrongHook) {
    if (/^\d+/.test(firstLine)) {
      return `✅ Excellent : votre accroche commence par un chiffre ("${firstLine.slice(0, 40)}..."), technique qui augmente le taux de lecture de 36%.`;
    }
    if (/^[?!]/.test(firstLine.slice(-1))) {
      return `✅ Très bien : votre accroche pose une question ou crée de la tension, ce qui incite à lire la suite.`;
    }
    if (metrics.hookLength < 60) {
      return `✅ Accroche concise et percutante (${metrics.hookLength} caractères). Elle s'affiche entièrement dans le fil sans coupure.`;
    }
    return `✅ Bonne accroche qui capte l'attention. Elle établit rapidement le sujet et l'enjeu.`;
  } else {
    if (metrics.hookLength > 150) {
      return `⚠️ Accroche trop longue (${metrics.hookLength} caractères). LinkedIn coupe après ~140 caractères. Raccourcissez pour créer un effet "cliffhanger".`;
    }
    return `💡 Accroche à renforcer. Testez : un chiffre surprenant, une question provocante, ou une affirmation contre-intuitive.`;
  }
}

/**
 * Generate CTA analysis
 */
function generateCtaAnalysis(metrics: ContentMetrics): string {
  if (metrics.hasCTA) {
    const ctaAnalysis: Record<string, string> = {
      comment: "✅ Votre CTA invite aux commentaires - excellent pour l'algorithme qui favorise les conversations.",
      click: "✅ CTA d'action présent. Assurez-vous que le lien/ressource promise délivre vraiment de la valeur.",
      follow: "✅ Invitation à suivre détectée. Positionnez-la après avoir démontré votre valeur dans le post.",
      save: "✅ Incitation à sauvegarder - signal fort pour l'algorithme que votre contenu a de la valeur durable.",
      action: "✅ CTA de conversion direct. Veillez à ce qu'il soit aligné avec la valeur apportée dans le post.",
    };
    return ctaAnalysis[metrics.ctaType || "comment"];
  }

  return "⚠️ Pas de CTA détecté. Sans appel à l'action, vous perdez 40% d'engagement potentiel. Terminez par une question ou une invitation claire.";
}

/**
 * Generate AI-powered insights for a LinkedIn post
 * Analyzes content structure, length, tone, and engagement potential
 * Now with enhanced coaching-style insights and user personalization
 */
export function generatePostInsights(
  content: string,
  variant?: "storytelling" | "business",
  userProfile?: UserProfile | null
): PostInsights {
  const metrics = analyzeContent(content);

  // Extract user context for personalization
  const userContext: UserContext = {
    sector: userProfile?.profile?.sector,
    role: userProfile?.profile?.role,
    objective: userProfile?.profile?.objective,
    targetAudience: userProfile?.profile?.targetAudience,
    communicationTone: userProfile?.profile?.communicationTone,
  };

  // Generate strengths
  const strengths = generateStrengths(metrics, variant);

  // Generate improvements
  const improvements = generateImprovements(metrics, variant);

  // Generate why it's effective (coaching style)
  let whyEffective = "";
  if (strengths.length >= 3) {
    whyEffective = `Votre post coche les cases essentielles : ${strengths[0].toLowerCase()}, ${strengths[1].toLowerCase()}. C'est exactement ce que l'algorithme LinkedIn récompense.`;
  } else if (strengths.length >= 1) {
    whyEffective = `Point fort : ${strengths[0]}. ${improvements.length > 0 ? "Avec quelques ajustements, ce post peut vraiment performer." : ""}`;
  } else {
    whyEffective = "Votre message est clair et direct. Avec quelques optimisations structurelles, vous pouvez significativement augmenter son impact.";
  }

  // Generate best time to post (more specific)
  let bestTimeToPost = "";
  if (variant === "storytelling") {
    if (userContext.targetAudience?.includes("Dirigeants")) {
      bestTimeToPost = "📅 Mardi ou mercredi 7h-8h : les dirigeants consultent LinkedIn tôt avant leurs réunions. Votre story sera dans leur fil matinal.";
    } else if (userContext.targetAudience?.includes("Entrepreneurs")) {
      bestTimeToPost = "📅 Mardi/Mercredi 8h-9h ou Dimanche 20h : les entrepreneurs sont actifs tôt en semaine et le dimanche soir pour préparer leur semaine.";
    } else {
      bestTimeToPost = "📅 Mardi-Jeudi 8h-10h : période de forte réceptivité aux contenus inspirants. Évitez le lundi (emails) et vendredi après-midi (déconnexion).";
    }
  } else {
    if (userContext.sector?.includes("Tech")) {
      bestTimeToPost = "📅 Mardi-Jeudi 10h-11h ou 14h-15h : après les stand-ups matinaux, la communauté tech est active sur LinkedIn.";
    } else if (userContext.sector?.includes("Finance")) {
      bestTimeToPost = "📅 Mardi-Mercredi 7h-8h ou 18h-19h : les professionnels de la finance consultent LinkedIn avant/après le marché.";
    } else {
      bestTimeToPost = "📅 Mardi-Jeudi 7h-9h ou 17h-18h : pics d'activité professionnelle sur LinkedIn. Le mardi matin est statistiquement le meilleur moment.";
    }
  }

  // Generate expected engagement (more nuanced)
  let expectedEngagement = "";
  if (metrics.engagementScore >= 80) {
    expectedEngagement = `🔥 Score d'engagement : ${metrics.engagementScore}/100 — Ce post a tous les ingrédients d'un contenu viral. Attendez-vous à un reach 3-5x supérieur à la moyenne.`;
  } else if (metrics.engagementScore >= 60) {
    expectedEngagement = `👍 Score d'engagement : ${metrics.engagementScore}/100 — Bon potentiel d'engagement. Répondez rapidement aux premiers commentaires pour booster l'algorithme.`;
  } else if (metrics.engagementScore >= 40) {
    expectedEngagement = `💬 Score d'engagement : ${metrics.engagementScore}/100 — Engagement modéré attendu. Les optimisations suggérées peuvent augmenter ce score de 20-30 points.`;
  } else {
    expectedEngagement = `📊 Score d'engagement : ${metrics.engagementScore}/100 — Potentiel d'amélioration significatif. Appliquez les conseils ci-dessous pour transformer ce post.`;
  }

  // Generate key takeaway (action-oriented)
  let keyTakeaway = "";
  if (improvements.length === 0) {
    keyTakeaway = "🎯 Ce post est prêt à être publié ! Dernière étape : choisissez le bon timing et préparez 2-3 réponses pour les premiers commentaires.";
  } else if (improvements.length === 1) {
    keyTakeaway = `🎯 Une seule optimisation à faire : ${improvements[0].replace(/^[💡💬❓✂️📝🎨⚠️📊#️⃣📏]\s*/, '').split('.')[0]}.`;
  } else {
    keyTakeaway = `🎯 Priorité : ${improvements[0].replace(/^[💡💬❓✂️📝🎨⚠️📊#️⃣📏]\s*/, '').split('.')[0]}. C'est l'optimisation qui aura le plus d'impact.`;
  }

  // Generate coaching tip
  const coachingTip = generateCoachingTip(metrics, userContext, variant);

  // Generate hook and CTA analysis
  const hookAnalysis = generateHookAnalysis(content, metrics);
  const ctaAnalysis = generateCtaAnalysis(metrics);

  return {
    whyEffective,
    bestTimeToPost,
    expectedEngagement,
    keyTakeaway,
    strengths,
    improvements,
    coachingTip,
    engagementScore: metrics.engagementScore,
    readabilityScore: metrics.readabilityScore,
    hookAnalysis,
    ctaAnalysis,
  };
}
