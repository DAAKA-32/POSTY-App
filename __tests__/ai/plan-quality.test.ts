import { describe, expect, it } from "vitest";
import { findUnverifiedFigures, flagBriefs, hookIssues } from "@/lib/ai/plan-quality";
import type { PostBrief } from "@/types";

const brief = (hook: string, angle = "Une idée défendue par l'auteur."): PostBrief => ({
  id: "p",
  hook,
  angle,
  format: "case-study",
  suggestedDate: "2026-10-06",
  suggestedTime: "08:30",
  rationale: "Parce que.",
});

describe("findUnverifiedFigures", () => {
  const facts = "VetPlan : 40 cliniques clientes. Ancienne vétérinaire pendant 6 ans. Abonnement à 49 €.";
  it("flags percentages / amounts / multiples absent from the author's data", () => {
    expect(findUnverifiedFigures(brief("Une clinique a réduit ses no-shows de 30% en 3 mois."), facts)).toEqual(["30%"]);
    expect(findUnverifiedFigures(brief("On a multiplié par x3 les rendez-vous"), facts)).toEqual(["x3"]);
  });
  it("accepts figures the author provided and plain counts", () => {
    expect(findUnverifiedFigures(brief("À 49 €, personne ne discute le prix."), facts)).toEqual([]);
    expect(findUnverifiedFigures(brief("3 erreurs que j'ai vues en 6 ans"), facts)).toEqual([]);
  });
});

describe("hookIssues", () => {
  it.each([
    "Voici comment nous améliorons VetPlan chaque semaine.",
    "Pourquoi la rigidité des agences ne marche pas.",
    "Comment une clinique a réduit ses no-shows.",
    "3 conseils pour optimiser votre planning.",
    "Les no-shows sont-ils inévitables dans les cliniques ?",
  ])("FR title-style hook flagged: %s", (h) => {
    expect(hookIssues(h, "fr").length).toBeGreaterThan(0);
  });
  it.each([
    "Mardi, une cliente m'a demandé de retirer la moitié de son appli. Elle avait raison.",
    "J'ai arrêté d'envoyer mes devis en PDF.",
    "Chaque no-show coûte plus qu'un créneau vide.",
  ])("FR spoken hook passes: %s", (h) => {
    expect(hookIssues(h, "fr")).toEqual([]);
  });
  it("EN checks", () => {
    expect(hookIssues("Why tech companies struggle with retention.", "en").length).toBeGreaterThan(0);
    expect(hookIssues("Five retention tactics every company should consider.", "en")).toEqual([]);
    expect(hookIssues("5 tips to keep your best people", "en").length).toBeGreaterThan(0);
    expect(hookIssues("My worst hire had the best résumé in the pile.", "en")).toEqual([]);
  });
});

describe("flagBriefs", () => {
  it("returns only the briefs that need a fix", () => {
    const posts = [
      { ...brief("J'ai arrêté d'envoyer mes devis en PDF."), id: "ok" },
      { ...brief("Voici mon secret pour signer plus."), id: "title" },
      { ...brief("Mardi une clinique a gagné 25% de créneaux."), id: "figure" },
    ];
    const flags = flagBriefs(posts, "", "fr");
    expect(flags.map((f) => f.id)).toEqual(["title", "figure"]);
    expect(flags[1].unverified).toEqual(["25%"]);
  });
});

describe("hookIssues — round-3 regressions", () => {
  it("flags colon titles and stock phrases", () => {
    expect(hookIssues("La digitalisation des cliniques vétérinaires : un changement de paradigme en marche.", "fr").length).toBeGreaterThan(0);
    expect(hookIssues("Looking to reduce attrition? Start with these three strategies.", "en").length).toBeGreaterThan(0);
    expect(hookIssues("Tech turnover is rising. Let's analyze why and how to counter it.", "en").length).toBeGreaterThan(0);
  });
  it("keeps spoken hooks", () => {
    expect(hookIssues("J'ai passé une nuit blanche pour sauver un MVP.", "fr")).toEqual([]);
    expect(hookIssues("Un fondateur m'a demandé de tout changer la veille du lancement.", "fr")).toEqual([]);
  });
});

describe("hookIssues — hooks from the user's real plan", () => {
  it.each([
    "Gagner 10 heures par semaine sur LinkedIn ? C'est possible avec ces 3 étapes.",
    "J'ai perdu un client en voulant automatiser trop vite. Voici ce que j'ai appris.",
    "La clé d'une présence LinkedIn impactante ? La régularité sans y passer des heures.",
    "Un mardi matin, j'ai décidé de laisser l'IA écrire mon post LinkedIn. Une décision risquée ?",
  ])("flagged: %s", (h) => {
    expect(hookIssues(h, "fr").length).toBeGreaterThan(0);
  });
  it("treats an unproven 'doublé' result as an invented figure", () => {
    expect(findUnverifiedFigures(brief("Un client a doublé ses interactions LinkedIn en un mois."), "")).toEqual(["doublé"]);
  });
});
