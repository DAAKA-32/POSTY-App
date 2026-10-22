import { describe, it, expect } from "vitest";
import {
  conversationalEmojiDirective,
  emojiDirective,
  emojiImproveDirective,
} from "@/lib/ai/emoji-policy";
import { buildAssistantPrompt, buildOptimizedPrompt } from "@/lib/services/prompt-builder";
import { ASSISTANT_PROMPT } from "@/lib/openai/service";
import { STRATEGIST_SYSTEM_PROMPT } from "@/lib/ai/strategist-prompt";

/**
 * Emoji policy (decided 2026-10-22): Posty's replies must read visibly alive —
 * about 5–10 emojis on a medium reply — on EVERY plan, without turning into
 * decoration. These tests pin the wording that carries that behaviour, since
 * the model's output itself can't be asserted in a unit test.
 */

const LANGS = ["fr", "en"] as const;

describe("conversationalEmojiDirective", () => {
  it.each(LANGS)("asks for visible density and the right places (%s)", (lang) => {
    const d = conversationalEmojiDirective(lang);
    // a hard floor for a medium reply, not a soft range the model can undershoot
    expect(d).toMatch(lang === "fr" ? /AU MINIMUM 5/ : /AT LEAST 5/);
    expect(d).toMatch(/12/); // long replies
    expect(d).toMatch(/1 (à|to) 3/); // very short replies
    // hook, titles, bullets and the closing call to action are named explicitly
    expect(d).toMatch(lang === "fr" ? /accroche/i : /hook/i);
    expect(d).toMatch(lang === "fr" ? /titre/i : /title/i);
    expect(d).toMatch(lang === "fr" ? /puces/i : /bullet/i);
    expect(d).toMatch(lang === "fr" ? /appel à l'action/i : /call-to-action/i);
  });

  it.each(LANGS)("lists the suggested emojis but asks for variety (%s)", (lang) => {
    const d = conversationalEmojiDirective(lang);
    for (const e of ["🚀", "🎯", "💡", "✍️", "📈", "🔥", "✅", "🧠", "⚡", "📣", "🤝", "📊", "💬", "🛠️"]) {
      expect(d, e).toContain(e);
    }
    expect(d).toMatch(lang === "fr" ? /Varie-les/ : /Vary them/);
  });

  it.each(LANGS)("keeps sensitive topics and errors sober, and never stacks (%s)", (lang) => {
    const d = conversationalEmojiDirective(lang);
    expect(d).toMatch(lang === "fr" ? /sobre/i : /sober/i);
    expect(d).toMatch(lang === "fr" ? /juridique/i : /legal/i);
    expect(d).toContain("🔥🔥🔥");
    expect(d).toMatch(lang === "fr" ? /lisible sans les emojis/ : /readable without them/);
  });
});

describe("emojiDirective (posts)", () => {
  it.each(LANGS)("is no longer timid, and keeps the anti-slop guardrails (%s)", (lang) => {
    const d = emojiDirective(lang);
    // The old wording told the model that zero emojis was a good outcome.
    expect(d).not.toMatch(/0 emoji est un bon choix|0 emojis is a good choice/);
    expect(d).not.toMatch(/outil éditorial, jamais décoratif|an editorial tool, never decoration/);
    expect(d).toMatch(/5.8/); // medium post
    expect(d).toMatch(/6.10/); // long post
    // guardrails: no stacking, no reflex 🚀/🔥, readable without emojis
    expect(d).toContain("🔥🔥🔥");
    expect(d).toMatch(lang === "fr" ? /par réflexe/ : /by reflex/);
    expect(d).toMatch(lang === "fr" ? /lisible sans eux/ : /readable without them/);
  });

  it("the improve variant inherits the new density and keeps the don't-rewrite note", () => {
    const d = emojiImproveDirective("en");
    expect(d).toMatch(/5.8/);
    expect(d).toContain("Preserve the text");
  });
});

describe("where the directives are applied", () => {
  it.each(LANGS)("assistant replies get the conversational voice, with or without a profile (%s)", (lang) => {
    const base = ASSISTANT_PROMPT[lang];
    const withoutProfile = buildAssistantPrompt(base, undefined, lang);
    const withProfile = buildAssistantPrompt(base, { role: "Founder", sector: "SaaS" }, lang);
    for (const prompt of [withoutProfile, withProfile]) {
      expect(prompt).toContain(conversationalEmojiDirective(lang));
      // …and not the post voice
      expect(prompt).not.toContain(emojiDirective(lang));
    }
  });

  it.each(LANGS)("the Strategist advisor no longer forbids emojis (%s)", (lang) => {
    const prompt = STRATEGIST_SYSTEM_PROMPT[lang];
    expect(prompt).not.toMatch(/No emojis unless|Pas d'emojis sauf/);
    expect(prompt).toContain(conversationalEmojiDirective(lang));
  });

  it("posts get the same directive on every plan (plans differ in capability, not in liveliness)", () => {
    for (const lang of LANGS) {
      const prompts = (["free", "pro", "max"] as const).map((plan) =>
        buildOptimizedPrompt("business", lang, undefined, plan)
      );
      for (const p of prompts) expect(p).toContain(emojiDirective(lang));
    }
  });
});
