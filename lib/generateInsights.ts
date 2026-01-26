import { PostInsights } from "@/types";

/**
 * Generate AI-powered insights for a LinkedIn post
 * Analyzes content structure, length, tone, and engagement potential
 */
export function generatePostInsights(content: string, variant?: "storytelling" | "business"): PostInsights {
  const wordCount = content.split(/\s+/).length;
  const charCount = content.length;
  const hasEmojis = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u.test(content);
  const hasHashtags = /#\w+/.test(content);
  const hasQuestions = /\?/.test(content);
  const hasCallToAction = /\b(cliquez|découvrez|rejoignez|téléchargez|inscrivez|partagez|commentez|likez)\b/i.test(content);
  const hasNumbers = /\d+/.test(content);
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim()).length;
  const hasHook = content.length > 50; // First 50 chars = hook
  const lineBreaks = (content.match(/\n/g) || []).length;

  // Analyze structure
  const isWellStructured = paragraphs >= 2 && lineBreaks >= 3;
  const hasGoodLength = wordCount >= 50 && wordCount <= 300;
  const isEngaging = hasCallToAction || hasQuestions;

  // Generate why it's effective
  let whyEffective = "";
  const strengths: string[] = [];

  if (variant === "storytelling") {
    if (hasHook) strengths.push("une accroche narrative captivante");
    if (isWellStructured) strengths.push("une structure en paragraphes qui facilite la lecture");
    if (hasEmojis) strengths.push("des émojis qui renforcent l'émotion");
    if (hasQuestions) strengths.push("des questions qui créent de l'engagement");
  } else {
    if (hasNumbers) strengths.push("des données chiffrées qui renforcent la crédibilité");
    if (isWellStructured) strengths.push("une structure professionnelle claire");
    if (hasCallToAction) strengths.push("un appel à l'action explicite");
    if (hasGoodLength) strengths.push("une longueur optimale pour LinkedIn");
  }

  if (strengths.length === 0) {
    whyEffective = "Votre post présente un contenu clair et direct, idéal pour transmettre votre message sur LinkedIn.";
  } else if (strengths.length === 1) {
    whyEffective = `Votre post se démarque grâce à ${strengths[0]}.`;
  } else if (strengths.length === 2) {
    whyEffective = `Votre post combine ${strengths[0]} et ${strengths[1]}.`;
  } else {
    const lastStrength = strengths.pop();
    whyEffective = `Votre post réunit ${strengths.join(", ")} et ${lastStrength}.`;
  }

  // Best time to post
  const bestTimeToPost = variant === "storytelling"
    ? "Mardi ou mercredi entre 8h-10h, quand votre audience est réceptive aux histoires inspirantes."
    : "Mardi à jeudi entre 7h-9h ou 17h-18h, aux moments de forte activité professionnelle.";

  // Expected engagement
  let engagementLevel = "moyen";
  let engagementScore = 0;

  if (hasCallToAction) engagementScore += 2;
  if (hasQuestions) engagementScore += 2;
  if (hasHashtags) engagementScore += 1;
  if (hasEmojis) engagementScore += 1;
  if (isWellStructured) engagementScore += 2;
  if (hasGoodLength) engagementScore += 1;
  if (hasNumbers) engagementScore += 1;

  if (engagementScore >= 7) {
    engagementLevel = "élevé";
  } else if (engagementScore >= 4) {
    engagementLevel = "bon";
  }

  let expectedEngagement = "";
  if (engagementLevel === "élevé") {
    expectedEngagement = "🔥 Engagement élevé attendu : ce post a tous les ingrédients pour générer de nombreuses interactions (likes, commentaires, partages).";
  } else if (engagementLevel === "bon") {
    expectedEngagement = "👍 Bon engagement attendu : ce post devrait susciter des interactions positives de votre réseau.";
  } else {
    expectedEngagement = "💬 Engagement modéré attendu : ajoutez une question ou un appel à l'action pour maximiser les interactions.";
  }

  // Key takeaway
  let keyTakeaway = "";
  if (variant === "storytelling") {
    if (hasQuestions && hasEmojis) {
      keyTakeaway = "Votre storytelling authentique, enrichi d'émojis et de questions, crée une connexion émotionnelle forte avec votre audience.";
    } else if (hasQuestions) {
      keyTakeaway = "Vos questions interpellent directement votre audience et l'invitent à réfléchir et interagir.";
    } else {
      keyTakeaway = "Votre récit personnel inspire et humanise votre message, renforçant votre authenticité sur LinkedIn.";
    }
  } else {
    if (hasCallToAction && hasNumbers) {
      keyTakeaway = "Votre approche data-driven combinée à un CTA clair guide votre audience vers l'action souhaitée.";
    } else if (hasNumbers) {
      keyTakeaway = "Vos données chiffrées apportent de la crédibilité et rendent votre message plus percutant.";
    } else if (hasCallToAction) {
      keyTakeaway = "Votre appel à l'action clair et direct maximise les chances de conversion de votre audience.";
    } else {
      keyTakeaway = "Votre message professionnel et structuré positionne votre expertise de manière crédible.";
    }
  }

  return {
    whyEffective,
    bestTimeToPost,
    expectedEngagement,
    keyTakeaway,
  };
}
