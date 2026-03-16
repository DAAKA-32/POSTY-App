/**
 * Lightweight prompt language detection (French vs English).
 *
 * Strategy:
 * 1. Tokenize the user prompt into words
 * 2. Score against French and English indicator words
 * 3. If French score > English score → "fr"
 * 4. If English score > French score → "en"
 * 5. If ambiguous or too short → fallback to "en"
 *
 * This avoids external API calls and works reliably for
 * the two languages Posty supports.
 */

// High-signal French words (articles, prepositions, conjunctions, common verbs)
const FR_INDICATORS = new Set([
  // Articles & determiners
  "le", "la", "les", "un", "une", "des", "du", "au", "aux", "ce", "cette", "ces",
  // Prepositions & conjunctions
  "de", "dans", "sur", "pour", "avec", "sans", "entre", "mais", "ou", "et",
  "donc", "car", "ni", "puis", "vers", "chez", "depuis", "pendant", "après",
  // Pronouns
  "je", "tu", "il", "elle", "nous", "vous", "ils", "elles", "on", "moi", "toi",
  "qui", "que", "dont", "quoi", "celui", "celle",
  // Common verbs
  "est", "sont", "suis", "être", "avoir", "fait", "faire", "peut", "peux",
  "dois", "doit", "faut", "veux", "veut", "va", "vais", "été", "eu",
  "comment", "pourquoi", "quand", "où",
  // Very common words
  "pas", "ne", "plus", "aussi", "très", "bien", "comme", "tout", "tous",
  "même", "encore", "déjà", "jamais", "toujours", "rien", "beaucoup",
  // LinkedIn/Posty context
  "post", "sujet", "écris", "rédige", "génère", "crée", "améliorer",
  "linkedin", "publication", "contenu", "aujourd",
]);

// High-signal English words
const EN_INDICATORS = new Set([
  // Articles & determiners
  "the", "a", "an", "this", "that", "these", "those",
  // Prepositions & conjunctions
  "of", "in", "on", "for", "with", "without", "between", "but", "or", "and",
  "so", "because", "nor", "yet", "from", "about", "into", "through", "after",
  // Pronouns
  "i", "you", "he", "she", "we", "they", "it", "me", "my", "your", "his",
  "her", "our", "their", "who", "what", "which", "whom",
  // Common verbs
  "is", "are", "am", "was", "were", "be", "been", "being", "have", "has",
  "had", "do", "does", "did", "will", "would", "could", "should", "can",
  "may", "might", "shall",
  // Very common words
  "not", "also", "very", "well", "like", "all", "every", "even",
  "already", "never", "always", "nothing", "much", "how", "why", "when",
  "where",
  // LinkedIn/Posty context
  "post", "write", "create", "generate", "improve", "topic", "content",
  "linkedin", "about",
]);

// Words that exist in both languages and should be ignored
const AMBIGUOUS = new Set(["post", "linkedin", "content", "simple", "social", "client", "expert"]);

type DetectedLanguage = "fr" | "en";

/**
 * Detects whether a prompt is written in French or English.
 * Returns "en" as default when ambiguous or undetectable.
 */
export function detectPromptLanguage(prompt: string): DetectedLanguage {
  if (!prompt || typeof prompt !== "string") return "en";

  // Normalize: lowercase, remove URLs, remove special chars except accented letters
  const cleaned = prompt
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .trim();

  if (!cleaned) return "en";

  // Tokenize into words
  const words = cleaned.split(/\s+/).filter((w) => w.length >= 1);

  if (words.length === 0) return "en";

  // French accent detection — strong signal
  const hasAccents = /[àâäéèêëïîôùûüÿçœæ]/i.test(cleaned);

  let frScore = 0;
  let enScore = 0;

  for (const word of words) {
    if (AMBIGUOUS.has(word)) continue;

    if (FR_INDICATORS.has(word)) frScore++;
    if (EN_INDICATORS.has(word)) enScore++;
  }

  // Accented characters are a strong French signal
  if (hasAccents) frScore += 2;

  // French contractions: l', d', n', s', j', qu'
  const frContractions = (cleaned.match(/\b[ldsnjq]'/g) || []).length;
  frScore += frContractions;

  // English contractions: 's, 't, 're, 've, 'll, 'd
  const enContractions = (cleaned.match(/'(s|t|re|ve|ll|d)\b/g) || []).length;
  enScore += enContractions;

  // Decision
  if (frScore > enScore) return "fr";
  if (enScore > frScore) return "en";

  // Tie or both zero → default to English
  return "en";
}
