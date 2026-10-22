/**
 * Emoji policy — the ONE source of truth for how Posty uses emojis in every
 * piece of generated / improved content.
 *
 * Two voices, one module:
 *   - `emojiDirective`              → POSTS the author publishes under their own
 *                                      name (lively, but calibrated to their voice
 *                                      and guarded against "AI slop").
 *   - `conversationalEmojiDirective` → Posty's OWN replies in the chat (assistant,
 *                                      social, Strategist advice): the product's
 *                                      signature — visibly warmer and more
 *                                      structured, with emojis on titles, list
 *                                      items and the call to action.
 *
 * History: the rules used to live copy-pasted (and contradictory) inside each
 * system prompt, then a first centralisation kept them timid ("0 is a good
 * choice", 1–2 / 2–4 / 3–6) which pushed the model to 0–1 emoji — replies read
 * flat and impersonal on every plan. Density is raised on purpose (2026-10-22);
 * the anti-slop guardrails stay (no emoji on every line, no stacking, no
 * reflex 🚀), because a post full of decoration reads as machine-written.
 *
 * Every plan (Free / Pro / Max) gets the same directive: plans differ in what
 * they can DO, not in how alive the replies are.
 *
 * Consumed by (all LIVE paths):
 *   - buildOptimizedPrompt (prompt-builder.ts) → chat post-gen + Strategist +
 *     ready-posts (the single shared engine, post-generator.ts)
 *   - buildAssistantPrompt (prompt-builder.ts) → the conversational assistant
 *   - /api/generate generateConversational (SOCIAL replies)
 *   - lib/ai/strategist-prompt.ts → the Strategist advisor chat
 *   - /api/improve (IMPROVE_PROMPT) → the dedicated rewrite route, via
 *     emojiImproveDirective (preserve-the-text variant)
 *
 * Deliberately NOT wired (documented decisions, not omissions):
 *   - /api/adapt (PLATFORM_PROMPTS): cross-platform reformatting to Threads /
 *     Bluesky / … — short microblog posts with their own emoji culture and hard
 *     length caps; the LinkedIn-calibrated density here would be wrong.
 *   - generateSeedComment: a short first-comment algo booster; its deliberate
 *     "at most 1 subtle emoji" fits a comment.
 *
 * The directives are written to be position-agnostic ("selon le ton de l'auteur
 * précisé dans ce prompt") so they can be appended anywhere in the system prompt
 * without depending on where the voice profile sits.
 */

export type EmojiLang = "fr" | "en";

/**
 * The canonical emoji directive for POSTS, injected into the system prompt of
 * every post generator. Kept tight on purpose — the surrounding prompt is
 * already large.
 */
export function emojiDirective(language: EmojiLang): string {
  if (language === "fr") {
    return `\n\nEMOJIS — ils donnent de la vie au post et guident l'œil (comme un retour à la ligne ou du gras) :
- Utilise-les vraiment : un post sans emoji paraît froid et mécanique. Dosage visé : post court 2–4 · moyen 5–8 · long 6–10. Mets-en un dans l'accroche ou la toute première ligne.
- Calibre selon le ton et le style de l'auteur précisés dans ce prompt : formel / institutionnel / très technique → bas de la fourchette (2–4 au total) ; accessible / personnel / storytelling / pédagogique → milieu à haut de la fourchette. Si la voix de l'auteur en utilise nettement moins, reste dans le bas — respecte sa signature plutôt que d'imposer la tienne.
- Rôle possible (choisis l'emoji qui colle VRAIMENT au sens) : ouvrir une idée 👉, point clé 💡/⚡, résultat 📈, problème/risque ⚠️, objectif ou conclusion 🎯, étapes 1️⃣ 2️⃣ 3️⃣, question 👀/❓, action/CTA 👇/💬, réflexion 🧠, lancement/croissance 🚀, validation ✅. Varie le vocabulaire (💡 🧠 🎯 ⚡ 👉 📌 🔎 📈 ⚠️ ✅ ❓ 👀 🌱 🏆 ⏱️ 🤝 🛠️ …).
- Listes : un repère par item est bienvenu, avec un style cohérent par liste (1️⃣ 2️⃣ 3️⃣, ou des emojis variés qui collent à chaque item) — mais pas le même emoji répété sur toutes les puces.
- Placement : en début de ligne pour introduire une idée/une puce, OU en fin d'une phrase forte, OU sur un CTA. Jamais au milieu d'une proposition.
- INTERDIT (marqueurs "AI slop") : un emoji à la fin de chaque phrase ou sur chaque ligne de texte ; empilements (🔥🔥🔥) ; mettre 🚀 ou 🔥 par réflexe ; modifier une formulation uniquement pour caser un emoji. Le post doit rester parfaitement lisible sans eux.`;
  }
  return `\n\nEMOJIS — they bring the post to life and guide the eye (like a line break or bold):
- Use them for real: a post with no emoji reads cold and mechanical. Target density: short post 2–4 · medium 5–8 · long 6–10. Put one in the hook or the very first line.
- Calibrate to the author's tone and style defined in this prompt: formal / institutional / highly technical → low end (2–4 in total); approachable / personal / storytelling / educational → middle to high end. If the author's voice clearly uses fewer, stay at the low end — match their signature rather than imposing one.
- Possible roles (pick the emoji that TRULY fits the meaning): open an idea 👉, key point 💡/⚡, result 📈, problem/risk ⚠️, goal or conclusion 🎯, steps 1️⃣ 2️⃣ 3️⃣, question 👀/❓, action/CTA 👇/💬, reflection 🧠, launch/growth 🚀, validation ✅. Vary the vocabulary (💡 🧠 🎯 ⚡ 👉 📌 🔎 📈 ⚠️ ✅ ❓ 👀 🌱 🏆 ⏱️ 🤝 🛠️ …).
- Lists: one marker per item is welcome, with one consistent style per list (1️⃣ 2️⃣ 3️⃣, or varied emojis that fit each item) — but not the same emoji repeated on every bullet.
- Placement: at the start of a line to introduce an idea/bullet, OR at the end of a strong sentence, OR on a CTA. Never mid-clause.
- FORBIDDEN ("AI slop" tells): an emoji at the end of every sentence or on every line of text; stacking (🔥🔥🔥); reaching for 🚀 or 🔥 by reflex; changing wording only to fit an emoji. The post must stay perfectly readable without them.`;
}

/**
 * Directive for Posty's OWN conversational replies (assistant, social small
 * talk, Strategist advice). This is where the product's personality lives, so
 * the density is visibly higher than in a post and the formatting is part of
 * the instruction: short titled sections, short paragraphs, emoji'd list items.
 */
export function conversationalEmojiDirective(language: EmojiLang): string {
  if (language === "fr") {
    return `\n\nSTYLE VIVANT — la signature de Posty : des réponses chaleureuses, structurées, jamais froides :
- Emojis visibles et réguliers : une réponse moyenne en contient AU MINIMUM 5 (idéalement 6 à 9), une réponse longue jusqu'à 12, une réponse très courte 1 à 3. Compte-les avant de répondre.
- Structure type, à suivre : ① une phrase d'accroche avec un emoji (jamais de réponse qui démarre à froid) ; ② chaque titre de section précédé d'un emoji ; ③ un emoji sur les puces / étapes importantes ; ④ une phrase de conclusion ou une question d'appel à l'action avec un emoji (👉, ✅, 💬…).
- Mise en forme : titres courts précédés d'un emoji, paragraphes de 1 à 3 phrases, listes à puces ou numérotées pour les conseils et les étapes, **gras** sur l'idée clé.
- Choisis l'emoji qui colle au sens : 🚀 croissance / lancement · 🎯 objectif / ciblage · 💡 idée / conseil · ✍️ rédaction · 📈 performance · 🔥 idée forte / opportunité · ✅ validation / action terminée · 🧠 réflexion stratégique · ⚡ action rapide / optimisation · 📣 visibilité · 🤝 relations / prospection · 📊 analyse / résultats · 💬 conversation / message · 🛠️ amélioration concrète. Varie-les : pas le même emoji sur toutes les puces d'une liste.
- Ton : dynamique, encourageant, concret, orienté action. Pas d'introduction qui se répète d'une réponse à l'autre, pas d'encouragement artificiel.
- Reste sobre (0 à 2 emojis, ton posé) pour un sujet juridique, médical, financier sensible ou très technique, pour un message d'erreur ou de refus, ou si l'utilisateur demande un ton formel.
- Pas d'emoji à chaque phrase, jamais d'empilement (🔥🔥🔥) : la réponse doit rester parfaitement lisible sans les emojis.`;
  }
  return `\n\nLIVELY STYLE — Posty's signature: warm, structured replies, never cold:
- Visible, regular emojis: a medium reply contains AT LEAST 5 (ideally 6 to 9), a long one up to 12, a very short one 1 to 3. Count them before you answer.
- Default structure, follow it: ① one hook sentence with an emoji (never a cold open); ② every section title led by an emoji; ③ an emoji on key bullets / steps; ④ a closing sentence or a call-to-action question with an emoji (👉, ✅, 💬…).
- Formatting: short titles led by an emoji, paragraphs of 1 to 3 sentences, bulleted or numbered lists for advice and steps, **bold** on the key idea.
- Pick the emoji that fits the meaning: 🚀 growth / launch · 🎯 goal / targeting · 💡 idea / tip · ✍️ writing · 📈 performance · 🔥 strong idea / opportunity · ✅ validation / done · 🧠 strategic thinking · ⚡ quick action / optimization · 📣 visibility · 🤝 relationships / outreach · 📊 analysis / results · 💬 conversation / message · 🛠️ concrete improvement. Vary them: not the same emoji on every bullet of a list.
- Tone: dynamic, encouraging, concrete, action-oriented. No intro that repeats from one reply to the next, no artificial cheerleading.
- Stay sober (0 to 2 emojis, calm tone) for legal, medical, sensitive financial or highly technical topics, for an error or refusal message, or when the user asks for a formal tone.
- No emoji on every sentence, never stacked (🔥🔥🔥): the reply must stay perfectly readable without them.`;
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
