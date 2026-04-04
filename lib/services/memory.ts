/**
 * AI Contextual Memory Service for POSTY
 *
 * Extracts key facts from conversations and injects relevant memories
 * into generation prompts for personalized, contextually-aware content.
 *
 * Design:
 * - Extraction uses gpt-3.5-turbo (cheap, fast) after post generation
 * - Memory items are short facts (~20-50 tokens each)
 * - Max 30 items per user, oldest evicted when full
 * - Injected into system prompt as a concise context block (~100-200 tokens)
 */

import type { MemoryItem, MemoryCategory } from "@/types";
import { MEMORY_MAX_ITEMS } from "@/types";

// ============== EXTRACTION PROMPT ==============

const EXTRACTION_PROMPT = {
  fr: `Tu es un extracteur de mémoire contextuelle. À partir de la conversation ci-dessous, extrais les faits importants qui seraient utiles pour personnaliser de futures générations de posts LinkedIn.

RÈGLES:
- Extrais 0 à 3 faits maximum (0 si rien d'intéressant)
- Chaque fait doit être une phrase courte et factuelle
- Catégorise chaque fait: "topic" (sujet récurrent), "event" (événement daté), "preference" (préférence de style/format), "fact" (info personnelle/professionnelle)
- Extrais des mots-clés pertinents pour chaque fait
- IGNORE les salutations, les demandes génériques et le contenu du post lui-même
- Concentre-toi sur ce qui est SPÉCIFIQUE à l'utilisateur

Réponds UNIQUEMENT en JSON valide:
[{"content": "...", "category": "topic|event|preference|fact", "keywords": ["...", "..."]}]

Si rien d'intéressant, réponds: []`,
  en: `You are a contextual memory extractor. From the conversation below, extract important facts that would be useful for personalizing future LinkedIn post generations.

RULES:
- Extract 0 to 3 facts maximum (0 if nothing interesting)
- Each fact must be a short, factual sentence
- Categorize each fact: "topic" (recurring subject), "event" (dated event), "preference" (style/format preference), "fact" (personal/professional info)
- Extract relevant keywords for each fact
- IGNORE greetings, generic requests, and the post content itself
- Focus on what is SPECIFIC to the user

Respond ONLY with valid JSON:
[{"content": "...", "category": "topic|event|preference|fact", "keywords": ["...", "..."]}]

If nothing interesting, respond: []`,
};

// ============== EXTRACTION ==============

export interface RawExtractedMemory {
  content: string;
  category: MemoryCategory;
  keywords: string[];
}

/**
 * Builds the extraction messages to send to GPT-3.5-turbo.
 * Returns messages array ready for OpenAI chat completion.
 */
export function buildExtractionMessages(
  userPrompt: string,
  aiResponse: string,
  language: "fr" | "en"
): Array<{ role: "system" | "user"; content: string }> {
  return [
    { role: "system", content: EXTRACTION_PROMPT[language] },
    {
      role: "user",
      content: `Utilisateur: ${userPrompt.slice(0, 500)}\n\nAssistant: ${aiResponse.slice(0, 500)}`,
    },
  ];
}

/**
 * Parses the GPT extraction response into typed memory items.
 * Returns empty array on any parsing failure (fail-safe).
 */
export function parseExtractionResponse(raw: string): RawExtractedMemory[] {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item: unknown): item is RawExtractedMemory =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as RawExtractedMemory).content === "string" &&
          typeof (item as RawExtractedMemory).category === "string" &&
          ["topic", "event", "preference", "fact"].includes(
            (item as RawExtractedMemory).category
          ) &&
          Array.isArray((item as RawExtractedMemory).keywords)
      )
      .slice(0, 3); // Hard cap at 3
  } catch {
    return [];
  }
}

// ============== MEMORY MANAGEMENT ==============

/**
 * Deduplicates and merges new memory items into existing ones.
 * Uses keyword overlap to detect duplicates (>50% overlap = duplicate).
 * Evicts oldest items when exceeding MEMORY_MAX_ITEMS.
 */
export function mergeMemoryItems(
  existing: MemoryItem[],
  newItems: RawExtractedMemory[],
  sourcePostId?: string
): MemoryItem[] {
  const merged = [...existing];

  for (const item of newItems) {
    // Check for duplicates via keyword overlap
    const isDuplicate = merged.some((existing) => {
      if (existing.content === item.content) return true;
      const existingKw = new Set(existing.keywords.map((k) => k.toLowerCase()));
      const newKw = item.keywords.map((k) => k.toLowerCase());
      if (newKw.length === 0) return false;
      const overlap = newKw.filter((k) => existingKw.has(k)).length;
      return overlap / newKw.length > 0.5;
    });

    if (!isDuplicate) {
      merged.push({
        id: generateMemoryId(),
        content: item.content,
        category: item.category,
        keywords: item.keywords.slice(0, 5),
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
        sourcePostId,
      });
    }
  }

  // Evict oldest if over limit
  if (merged.length > MEMORY_MAX_ITEMS) {
    return merged.slice(merged.length - MEMORY_MAX_ITEMS);
  }

  return merged;
}

// ============== PROMPT INJECTION ==============

/**
 * Builds a concise memory context block for injection into the system prompt.
 * Filters items by keyword relevance to the current prompt when possible.
 * Returns null if no relevant memories or memory is disabled.
 */
export function buildMemoryContext(
  items: MemoryItem[],
  currentPrompt: string,
  language: "fr" | "en"
): string | null {
  if (!items || items.length === 0) return null;

  // Score each memory by keyword relevance to the current prompt
  const promptLower = currentPrompt.toLowerCase();
  const scored = items.map((item) => {
    const keywordHits = item.keywords.filter((kw) =>
      promptLower.includes(kw.toLowerCase())
    ).length;
    // Category weight: events and facts are more universally relevant
    const categoryBonus = item.category === "event" || item.category === "fact" ? 1 : 0;
    return { item, score: keywordHits + categoryBonus };
  });

  // Take top 10 most relevant (or all if fewer), prioritizing scored > 0
  scored.sort((a, b) => b.score - a.score);
  const relevant = scored.slice(0, 10).map((s) => s.item);

  if (relevant.length === 0) return null;

  const header =
    language === "fr"
      ? "\n\n[MÉMOIRE CONTEXTUELLE — informations retenues des conversations précédentes]"
      : "\n\n[CONTEXTUAL MEMORY — information retained from previous conversations]";

  const lines = relevant.map((item) => `- ${item.content}`).join("\n");

  const instruction =
    language === "fr"
      ? "\nUtilise ces informations subtilement pour personnaliser le contenu quand c'est pertinent. Ne les mentionne pas explicitement sauf si l'utilisateur y fait référence."
      : "\nUse this information subtly to personalize content when relevant. Don't mention it explicitly unless the user references it.";

  return `${header}\n${lines}${instruction}`;
}

// ============== UTILITIES ==============

function generateMemoryId(): string {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
