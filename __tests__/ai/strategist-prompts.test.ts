import { describe, expect, it } from "vitest";
import { buildOptimizedPrompt, buildCraftRules, type ProfileFields } from "@/lib/services/prompt-builder";
import { buildBriefGeneration } from "@/lib/ai/materialize-post-prompt";
import { buildBatchPlanPrompt } from "@/lib/ai/batch-plan-prompt";
import { lintPost } from "@/lib/services/post-quality";
import { planNeedsNews } from "@/lib/strategist/news-gate";
import type { PostBrief } from "@/types";

const PROFILE: ProfileFields = {
  displayName: "Julien",
  profileType: "Entrepreneur / Fondateur",
  sector: "Tech / IT",
  role: "Fondateur",
  objective: "Générer des leads qualifiés",
  targetAudience: "CTO de scale-ups SaaS",
  communicationTone: "Expert",
};

const BRIEF: PostBrief = {
  id: "p1",
  hook: "J'ai refusé un client la semaine dernière. Le meilleur choix du trimestre.",
  angle: "Dire non aux mauvais clients protège la qualité pour les bons.",
  format: "storytelling",
  length: "short",
  goal: "branding",
  suggestedDate: "2026-10-06",
  suggestedTime: "08:30",
  rationale: "Montre les valeurs de l'auteur.",
};

describe("brief mode prompt (Strategist)", () => {
  const gen = buildBriefGeneration({
    language: "fr",
    brief: BRIEF,
    direction: { ctaIntensity: "none", tone: "warm", context: "Studio de design produit pour SaaS B2B." },
    series: {
      theme: "Choisir ses clients",
      strategy: { summary: "Montrer un studio exigeant et humain." },
      siblings: [BRIEF, { id: "p2", hook: "La checklist que j'envoie avant tout devis.", format: "list" }],
    },
  });
  const prompt =
    buildOptimizedPrompt(gen.postType, "fr", PROFILE, "max", gen.promptOptions) + gen.systemBlocks.join("");

  it("leaves out the layers that fought the brief", () => {
    expect(prompt).not.toContain("DIRECTIVE DE VARIATION");
    expect(prompt).not.toContain("POSTURE D'AUTORITÉ");
    expect(prompt).not.toContain("EXEMPLE DE CALIBRATION");
    expect(prompt).not.toContain("SIGNATURE PERSONNALISÉE");
    expect(prompt).not.toContain("FINALITÉ:");
  });

  it("swaps LENGTH and ENGAGEMENT for the format-aware versions", () => {
    expect(prompt).not.toContain("vise 1300-2000 caractères");
    expect(prompt).not.toContain("Termine par UNE question précise");
    expect(prompt).toContain("post COURT, 300 à 750 caractères");
    expect(prompt).toContain("Pas d'appel à l'action ni de question de fin imposée");
  });

  it("carries the format, the direction, the series and the brief contract", () => {
    expect(prompt).toContain("FORMAT DE CE POST : Récit");
    expect(prompt).toContain("chaleureux et accessible");
    expect(prompt).toContain("Studio de design produit");
    expect(prompt).toContain("Montrer un studio exigeant et humain.");
    expect(prompt).toContain("La checklist que j'envoie avant tout devis.");
    // the post being written is not listed as its own sibling
    expect(prompt.match(/J'ai refusé un client/g)?.length ?? 0).toBe(0);
    expect(prompt).toContain("MODE BRIEF");
    expect(gen.userMessage).toContain("J'ai refusé un client");
  });

  it("keeps the anti-AI craft rules, with the Strategist house style and emoji rule", () => {
    expect(prompt).toContain("RÈGLES DE CRAFT LINKEDIN 2026");
    expect(prompt).toContain("GARDE-FOU ANTI-FABRICATION");
    expect(prompt).toContain("STYLE MAISON");
    expect(prompt).toContain("EMOJIS — ils rendent le post vivant");
    expect(prompt).not.toContain("EMOJIS — outil éditorial"); // the chat's policy is replaced here
    expect(prompt).not.toContain("Bullet points automatiques"); // the shared base prompt is replaced
    expect(prompt).toContain("Bloc visuel OBLIGATOIRE");
    expect(gen.lintOptions.minEmojis).toBe(1); // short post, lively register
    expect(gen.lintOptions.requireVisualBlock).toBe(true);
  });

  it("switches to the sober emoji rule when the author asks for it", () => {
    const sober = buildBriefGeneration({ language: "fr", brief: BRIEF, direction: { formality: 5 } });
    const p = buildOptimizedPrompt(sober.postType, "fr", PROFILE, "max", sober.promptOptions);
    expect(p).toContain("registre sobre demandé");
    expect(sober.lintOptions.minEmojis).toBe(0);
  });

  it("sets format-aware lint options", () => {
    expect(gen.lintOptions.lengthBand).toEqual({ min: 300, max: 750 });
    expect(gen.lintOptions.endCheckOnBody).toBe(false); // no CTA → no closing-question check
  });

  it("buildCraftRules without overrides is the untouched rule set", () => {
    expect(buildCraftRules("en")).toContain("LENGTH: target 1300-2000 characters");
  });
});

describe("batch plan prompt", () => {
  for (const language of ["fr", "en"] as const) {
    it(`${language}: no unresolved placeholders, has the mix and the window`, () => {
      const p = buildBatchPlanPrompt({
        language,
        count: 5,
        startDate: "2026-10-06",
        timezone: "Europe/Paris",
        userContext: { sector: "Tech / IT" },
        formatMix: [
          { format: "opinion", length: "medium" },
          { format: "storytelling", length: "long" },
        ],
      });
      expect(p).not.toContain("<N>");
      expect(p).not.toContain("<LANG>");
      expect(p).toContain("2026-10-06 → 2026-10-12");
      expect(p).toMatch(/opinion \(Opinion\)/);
    });
  }

  it("widens the window for a monthly plan", () => {
    const p = buildBatchPlanPrompt({
      language: "fr",
      count: 12,
      startDate: "2026-10-06",
      timezone: "Europe/Paris",
      windowDays: 28,
      userContext: {},
    });
    expect(p).toContain("2026-10-06 → 2026-11-02");
  });
});

describe("planNeedsNews (stricter than the chat's gate)", () => {
  it.each([
    ["Prépare-moi 5 posts LinkedIn pour cette semaine", false],
    ["Prépare 5 posts sur mon SaaS de marketing B2B", false],
    ["Fais 3 posts sur les dernières annonces de l'IA générative", true],
    ["5 posts sur les tendances RH en 2026", true],
    ["Write 3 posts about the latest news in fintech", true],
  ])("%s → %s", (text, expected) => {
    expect(planNeedsNews(text)).toBe(expected);
  });
});

describe("lintPost with a length band", () => {
  const short = [
    "Un client m'a demandé une remise de dernière minute mardi, juste avant de signer.",
    "J'ai dit non, poliment, en lui rappelant ce que le prix couvrait vraiment.",
    "Silence au téléphone. Puis il a signé quand même, au prix juste.",
    "Une remise accordée par peur, c'est un message envoyé à tous les clients suivants.",
    "#vente #posty",
  ].join("\n\n");
  it("does not ask a deliberately short post to grow to 1300 chars", () => {
    const report = lintPost(short, "fr", { lengthBand: { min: 300, max: 750 } });
    expect(report.issues.find((i) => i.code === "too-short")).toBeUndefined();
  });
  it("catches a vague closer hidden above the hashtags (opt-in)", () => {
    const vague = "Mardi, un client m'a dit non.\n\nJ'ai changé d'approche.\n\nQu'en pensez-vous ?\n\n#vente #posty";
    expect(lintPost(vague, "fr").issues.some((i) => i.code === "vague-close")).toBe(false); // chat: unchanged
    expect(lintPost(vague, "fr", { endCheckOnBody: true }).issues.some((i) => i.code === "vague-close")).toBe(true);
  });
});

describe("lintPost — invented statistics (Strategist)", () => {
  const post = "Le 15 mars, un vétérinaire a réduit ses retards de 30 % grâce à ces ajustements.\n\nCe qui compte, c'est la méthode.\n\n#veterinaire #posty";
  it("flags a figure the author never provided", () => {
    const r = lintPost(post, "fr", { knownFacts: "VetPlan : 40 cliniques clientes." });
    expect(r.issues.find((i) => i.code === "unverified-figure")?.severity).toBe("hard");
    expect(r.needsRepair).toBe(true);
  });
  it("accepts figures that come from the author", () => {
    const r = lintPost(post, "fr", { knownFacts: "Nos clients réduisent leurs retards de 30 %." });
    expect(r.issues.some((i) => i.code === "unverified-figure")).toBe(false);
  });
  it("is off for the chat (no knownFacts)", () => {
    expect(lintPost(post, "fr").issues.some((i) => i.code === "unverified-figure")).toBe(false);
  });
});

describe("lintPost — Strategist house style", () => {
  const flat = [
    "J'ai récemment parlé à un fondateur qui passait des heures sur LinkedIn.",
    "Il m'a confié que cette gestion devenait ingérable. Entre les posts à rédiger, les interactions à maintenir et les stratégies à peaufiner, il se sentait submergé. Et ce n'était pas un cas isolé. Beaucoup d'entrepreneurs que je rencontre font face à la même problématique.",
    "Comment optimisez-vous votre temps sur LinkedIn ?",
    "#linkedin #posty",
  ].join("\n\n");
  const lively = [
    "Un fondateur m'a dit mardi : « LinkedIn me mange mes soirées. »",
    "Je lui ai demandé ce qu'il y faisait vraiment 👇",
    "👉 réécrire trois fois la même accroche\n👉 chercher une idée à 22h\n👉 publier, puis tout effacer",
    "💡 Le problème n'était pas le temps. C'était l'absence de plan.",
    "#linkedin #posty",
  ].join("\n\n");
  const opts = { minEmojis: 2, requireVisualBlock: true, strict: true } as const;

  it("flags the flat, emoji-less, list-less post the user complained about", () => {
    const codes = lintPost(flat, "fr", opts).issues.map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(["too-few-emojis", "no-visual-block", "dense-paragraph", "filler"]));
  });
  it("accepts a lively, scannable post", () => {
    const codes = lintPost(lively, "fr", opts).issues.map((i) => i.code);
    expect(codes).not.toContain("too-few-emojis");
    expect(codes).not.toContain("no-visual-block");
    expect(codes).not.toContain("dense-paragraph");
  });
});
