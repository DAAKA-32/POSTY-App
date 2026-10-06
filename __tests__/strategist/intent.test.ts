import { describe, expect, it } from "vitest";
import { detectStrategistIntent } from "@/lib/strategist/batch-intent";

const kind = (s: string) => detectStrategistIntent(s).kind;

describe("detectStrategistIntent — plans", () => {
  it.each([
    ["Prépare-moi 5 posts pour cette semaine", 5, "week"],
    ["Prépare-moi un plan de 5 posts LinkedIn pour cette semaine, adapté à mon secteur.", 5, "week"],
    ["Génère 3 posts sur le recrutement", 3, "none"],
    ["fais-moi trois posts sur mon lancement", 3, "none"],
    ["Peux-tu me préparer 4 publications sur la cybersécurité ?", 4, "none"],
    ["Prepare 5 LinkedIn posts for this week", 5, "week"],
    ["Write me two posts about pricing", 2, "none"],
    ["Planifie mon calendrier de publication du mois", 12, "month"],
  ])("%s → plan(%i, %s)", (text, count, period) => {
    expect(detectStrategistIntent(text)).toEqual({ kind: "plan", count, period });
  });

  it("clamps big counts to 15", () => {
    expect(detectStrategistIntent("Génère 40 posts")).toEqual({ kind: "plan", count: 15, period: "none" });
  });

  it("a post a day this week → 5 posts", () => {
    expect(detectStrategistIntent("Fais-moi un post par jour cette semaine")).toEqual({
      kind: "plan",
      count: 5,
      period: "week",
    });
  });
});

describe("detectStrategistIntent — single post", () => {
  it.each([
    "Écris un post sur mon parcours de fondateur",
    "Rédige un post sur la semaine de 4 jours",
    "Fais-moi un post pour demain sur notre levée",
    "Write a post about our new hire",
    "Peux-tu écrire un post sur l'onboarding client ?",
  ])("%s → post", (text) => {
    expect(kind(text)).toBe("post");
  });
});

describe("detectStrategistIntent — advisor (regressions)", () => {
  it.each([
    // past / reporting
    "J'ai fait 3 posts cette semaine, tu en penses quoi ?",
    "I posted 4 times this week, is that enough?",
    // questions
    "Quel plan de contenu pour le mois ?",
    "Comment faire 3 posts par semaine sans y passer des heures ?",
    "Should I post every day?",
    // ideation
    "Génère 10 angles d'accroche puissants pour mes prochains posts LinkedIn",
    "Donne-moi des idées de thèmes à incarner",
    // reviews
    "Analyse mes 5 derniers posts",
    "Audite ma présence LinkedIn à partir de mon profil",
    // plain advice
    "Aide-moi à affiner mon positionnement",
    "ok merci",
  ])("%s → chat", (text) => {
    expect(kind(text)).toBe("chat");
  });
});
