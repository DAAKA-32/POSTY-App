import { describe, expect, it } from "vitest";
import {
  answersToParams,
  buildSourcePrompt,
  clampCount,
  ctaFromBusiness,
  firstIncompleteStep,
  parseDraft,
  prefillAnswers,
  serializeDraft,
  stepIssue,
  toneFromProfile,
  type JourneyAnswers,
} from "@/lib/strategist/journey";

const base = (over: Partial<JourneyAnswers> = {}): JourneyAnswers => ({ count: 5, period: "week", ...over });

describe("prefillAnswers", () => {
  it("never overwrites a saved setting with an inferred one", () => {
    const a = prefillAnswers({
      params: { context: "Saved business description", audience: "Saved audience", tone: "bold", objective: "branding" },
      profile: {
        objective: "Générer des leads qualifiés",
        targetAudience: ["Entrepreneurs / Fondateurs"],
        communicationTone: "Inspirant et motivant",
        business: { offer: "Other offer", idealCustomer: "Other customer" },
      },
    });
    expect(a.context).toBe("Saved business description");
    expect(a.audience).toBe("Saved audience");
    expect(a.tone).toBe("bold");
    expect(a.objective).toBe("branding");
  });

  it("fills empty fields from the business profile, then onboarding", () => {
    const a = prefillAnswers({
      profile: {
        objective: ["Générer des leads qualifiés"],
        targetAudience: ["Entrepreneurs / Fondateurs", "Managers"],
        communicationTone: ["Direct et percutant"],
        business: { offer: "Studio de design produit.", differentiator: "MVP testé en 6 semaines.", preferredCta: "Réserver une démo" },
      },
      autonomousCount: 7,
    });
    expect(a.context).toBe("Studio de design produit. MVP testé en 6 semaines.");
    expect(a.audience).toBe("Entrepreneurs / Fondateurs");
    expect(a.objective).toBe("lead-gen");
    expect(a.tone).toBe("direct");
    expect(a.ctaIntensity).toBe("assertive");
    expect(a.count).toBe(7);
    expect(a.period).toBe("week");
  });

  it("prefers the business ideal customer over the onboarding audience, and falls back to the bio", () => {
    const a = prefillAnswers({
      profile: { targetAudience: "Managers", business: { idealCustomer: "CTO de scale-ups" } },
      bio: "Consultante data indépendante",
    });
    expect(a.audience).toBe("CTO de scale-ups");
    expect(a.context).toBe("Consultante data indépendante");
  });

  it("works with nothing at all", () => {
    const a = prefillAnswers({});
    expect(a).toEqual({ count: 5, period: "week" });
  });
});

describe("label mapping", () => {
  it.each([
    ["Professionnel et formel", "expert"],
    ["Accessible et conversationnel", "warm"],
    ["Inspiring and motivating", "inspiring"],
    ["Direct et percutant", "direct"],
    ["Éducatif et pédagogue", "expert"],
    ["Authentique et personnel", "warm"],
    ["", undefined],
  ])("tone %s → %s", (label, slug) => {
    expect(toneFromProfile(label)).toBe(slug);
  });

  it.each([
    ["Book a demo", "assertive"],
    ["Poser une question en commentaire", "soft"],
    ["Aucun", "none"],
    ["", undefined],
  ])("cta %s → %s", (label, slug) => {
    expect(ctaFromBusiness(label)).toBe(slug);
  });
});

describe("steps", () => {
  it("only the activity and the audience are required", () => {
    expect(stepIssue("activity", base({ context: "trop court" }))).toBe("contextShort");
    expect(stepIssue("activity", base({ context: "Je conseille des PME sur leur data." }))).toBeNull();
    expect(stepIssue("audience", base({ audience: "" }))).toBe("audienceShort");
    expect(stepIssue("goal", base())).toBeNull();
    expect(stepIssue("style", base())).toBeNull();
    expect(stepIssue("content", base())).toBeNull();
  });

  it("review is blocked by whichever required step is missing", () => {
    expect(stepIssue("review", base({ audience: "PME" }))).toBe("contextShort");
    expect(stepIssue("review", base({ context: "Je conseille des PME sur leur data." }))).toBe("audienceShort");
  });

  it("a complete profile lands on the review, an incomplete one on its first gap", () => {
    expect(firstIncompleteStep(base())).toBe("activity");
    expect(firstIncompleteStep(base({ context: "Je conseille des PME sur leur data." }))).toBe("audience");
    expect(firstIncompleteStep(base({ context: "Je conseille des PME sur leur data.", audience: "Dirigeants de PME" }))).toBe("review");
  });
});

describe("request building", () => {
  it("keeps the editorial line out of the journey-only fields", () => {
    const p = answersToParams(base({ context: "  Activité  ", audience: "Audience", tone: "warm", focus: "Lancement", count: 8 }));
    expect(p).toEqual({ context: "Activité", audience: "Audience", tone: "warm" });
  });

  it("states the count and period, and the focus when there is one", () => {
    const fr = buildSourcePrompt(base({ count: 7, period: "month", focus: "le lancement de la V2" }), "fr");
    expect(fr).toContain("7 posts");
    expect(fr).toContain("le mois");
    expect(fr).toContain("le lancement de la V2");
    const en = buildSourcePrompt(base({ count: 4 }), "en");
    expect(en).toContain("4 LinkedIn posts");
    expect(en).toContain("week");
    expect(en.length).toBeGreaterThanOrEqual(3);
  });

  it("stays within the server limits", () => {
    expect(clampCount(1, "week")).toBe(3);
    expect(clampCount(40, "week")).toBe(10);
    expect(clampCount(40, "month")).toBe(15);
    expect(clampCount(Number.NaN, "week")).toBe(5);
    const long = buildSourcePrompt(base({ focus: "x".repeat(5000) }), "fr");
    expect(long.length).toBeLessThanOrEqual(2000);
  });
});

describe("draft", () => {
  it("round-trips", () => {
    const draft = {
      step: "style" as const,
      reached: "content" as const,
      answers: base({ context: "Je conseille des PME.", audience: "PME", objective: "authority" as const, formality: 3 as const, focus: "Cas clients" }),
    };
    expect(parseDraft(serializeDraft(draft))).toEqual(draft);
  });

  it("rejects garbage and drops invalid fields", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("not json")).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 99, step: "activity", answers: {} }))).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 1, step: "nope", answers: {} }))).toBeNull();
    const d = parseDraft(
      JSON.stringify({ v: 1, step: "goal", reached: "activity", answers: { objective: "world-domination", tone: "bold", formality: 9, count: 99, period: "year" } }),
    );
    expect(d).not.toBeNull();
    expect(d!.answers.objective).toBeUndefined();
    expect(d!.answers.tone).toBe("bold");
    expect(d!.answers.formality).toBeUndefined();
    expect(d!.answers.period).toBe("week");
    expect(d!.answers.count).toBe(10);
    // "reached" can never be behind the current step
    expect(d!.reached).toBe("goal");
  });
});
