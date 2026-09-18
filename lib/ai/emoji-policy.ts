/**
 * Emoji policy — the ONE source of truth for how Posty uses emojis in every
 * piece of generated / improved content.
 *
 * Why centralized: the emoji rules used to live copy-pasted (and contradictory)
 * inside each system prompt in prompt-builder.ts (8 blocks), in openai/service.ts,
 * and in the Strategist brief. They were timid ("1 à 3 max", "sparingly") which
 * pushed the model toward 0–1 emoji. This module replaces all of them with a
 * single, richer, CONTEXTUAL directive: emojis as an editorial tool (like line
 * breaks or bold), calibrated to tone / content-type / the author's own habits,
 * with a real anti-"AI slop" guardrail.
 *
 * Consumed by (all LIVE post-writing paths):
 *   - buildOptimizedPrompt (prompt-builder.ts) → chat post-gen + Strategist +
 *     ready-posts (the single shared engine, post-generator.ts)
 *   - buildAssistantPrompt (prompt-builder.ts) → the conversational assistant /
 *     "améliore ce texte" path (/api/generate → generateAssistance)
 *   - /api/improve (IMPROVE_PROMPT) → the dedicated rewrite route, via
 *     emojiImproveDirective (preserve-the-text variant)
 *
 * Deliberately NOT wired (documented decisions, not omissions):
 *   - /api/adapt (PLATFORM_PROMPTS): cross-platform reformatting to Threads /
 *     Bluesky / … — short microblog posts with their own emoji culture and hard
 *     length caps; the LinkedIn-calibrated density here would be wrong.
 *   - generateSeedComment: a short first-comment algo booster; its deliberate
 *     "at most 1 subtle emoji" already matches the parsimonious philosophy.
 *
 * The directive is written to be position-agnostic ("selon le ton de l'auteur
 * précisé dans ce prompt") so it can be appended anywhere in the system prompt
 * without depending on where the voice profile sits.
 */

export type EmojiLang = "fr" | "en";

/**
 * The canonical emoji directive, injected into the system prompt of every
 * generator. Kept tight on purpose — the surrounding prompt is already large.
 */
export function emojiDirective(language: EmojiLang): string {
  if (language === "fr") {
    return `\n\nEMOJIS — outil éditorial, jamais décoratif :
- Un emoji ne se met que s'il AJOUTE quelque chose (attention, structure, émotion juste), au même titre qu'un retour à la ligne ou du gras. Le post doit rester parfait sans eux — ils accentuent, ils ne remplacent jamais le sens. 0 emoji est un bon choix si aucun ne s'impose ; n'en ajoute JAMAIS pour "faire plus engageant" ni pour atteindre un nombre.
- Dosage indicatif (pas un quota) : post court 1–2 · moyen 2–4 · long 3–6 max.
- Calibre selon le ton et le style de l'auteur précisés dans ce prompt : formel / institutionnel / très technique → très peu ou aucun ; accessible / personnel / storytelling / pédagogique → quelques-uns, naturels. Si la voix de l'auteur en utilise peu, reste sobre — respecte sa signature plutôt que d'imposer la tienne.
- Rôle possible (choisis l'emoji qui colle VRAIMENT au sens, jamais une liste figée) : ouvrir une idée 👉, point clé 💡/⚡, résultat 📈, problème/risque ⚠️, objectif ou conclusion 🎯, étapes 1️⃣ 2️⃣ 3️⃣, question 👀/❓, action/CTA 👇/💬, réflexion 🧠. Varie le vocabulaire (💡 🧠 🎯 ⚡ 👉 📌 🔎 📈 ⚠️ ✅ ❓ 👀 🌱 🏆 ⏱️ 🤝 …) — n'utilise pas toujours 🚀 🔥 💡.
- Placement : en début de ligne pour introduire une idée/une puce, OU en fin d'une phrase forte, OU sur un CTA. Jamais au milieu d'une proposition, jamais un emoji à la fin de chaque phrase.
- INTERDIT (marqueurs "AI slop") : un emoji sur chaque ligne ; empilements (🔥🔥🔥) ; répéter le même emoji dans le post ; mettre 🚀 juste parce que c'est un post business ; 🔥 sur chaque affirmation ; transformer chaque puce en liste d'emojis ; modifier une formulation uniquement pour caser un emoji.`;
  }
  return `\n\nEMOJIS — an editorial tool, never decoration:
- Use an emoji only when it ADDS something (attention, structure, the right emotion), exactly like a line break or bold. The post must read perfectly without them — they accentuate, they never replace meaning. 0 emojis is a good choice when none earns its place; NEVER add them "to feel more engaging" or to hit a count.
- Rough dosage (not a quota): short post 1–2 · medium 2–4 · long 3–6 max.
- Calibrate to the author's tone and style defined in this prompt: formal / institutional / highly technical → very few or none; approachable / personal / storytelling / educational → a few, natural ones. If the author's voice uses few emojis, stay sober — match their signature rather than imposing one.
- Possible roles (pick the emoji that TRULY fits the meaning, never a fixed list): open an idea 👉, key point 💡/⚡, result 📈, problem/risk ⚠️, goal or conclusion 🎯, steps 1️⃣ 2️⃣ 3️⃣, question 👀/❓, action/CTA 👇/💬, reflection 🧠. Vary the vocabulary (💡 🧠 🎯 ⚡ 👉 📌 🔎 📈 ⚠️ ✅ ❓ 👀 🌱 🏆 ⏱️ 🤝 …) — don't always reach for 🚀 🔥 💡.
- Placement: at the start of a line to introduce an idea/bullet, OR at the end of a strong sentence, OR on a CTA. Never mid-clause, never one at the end of every sentence.
- FORBIDDEN ("AI slop" tells): an emoji on every line; stacking (🔥🔥🔥); repeating the same emoji across the post; adding 🚀 just because it's a business post; 🔥 on every claim; turning every bullet into an emoji list; changing wording only to fit an emoji.`;
}

/**
 * Compact variant for the improve / rewrite flow, where the priority is to
 * PRESERVE the user's text and only adjust emojis. Reuses the same policy but
 * frames it as an additive pass. Kept separate so the "don't rewrite" contract
 * is explicit at the call site.
 */
export function emojiImproveDirective(language: EmojiLang): string {
  const base = emojiDirective(language);
  const note =
    language === "fr"
      ? `\n(Contexte amélioration : n'ajoute/retire QUE des emojis pertinents. Préserve le texte, les paragraphes, le hook, le CTA et le ton. Ne réécris pas ce qui est déjà bon.)`
      : `\n(Improvement context: only add/remove RELEVANT emojis. Preserve the text, paragraphs, hook, CTA and tone. Do not rewrite what is already good.)`;
  return base + note;
}
