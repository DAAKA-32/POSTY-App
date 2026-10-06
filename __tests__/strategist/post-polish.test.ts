import { describe, expect, it } from "vitest";
import { polishStrategistPost } from "@/lib/strategist/post-polish";

describe("polishStrategistPost", () => {
  it("strips markdown emphasis and headings LinkedIn would show literally", () => {
    const out = polishStrategistPost("## Titre\n👉 **Situation de départ :**\nUn *vrai* problème.\n\n#vente #posty");
    expect(out).toBe("Titre\n👉 Situation de départ :\nUn vrai problème.\n\n#vente #posty");
  });

  it("moves hashtags glued to the last sentence onto their own line", () => {
    const out = polishStrategistPost("Première ligne.\n\nEt toi, lequel appliques-tu ? #mvp #startup #posty");
    expect(out).toBe("Première ligne.\n\nEt toi, lequel appliques-tu ?\n\n#mvp #startup #posty");
  });

  it("fixes acronym hashtags mangled by the normalizer", () => {
    expect(polishStrategistPost("Texte.\n\n#hR #sEO #hRStrategy #personalBranding #posty")).toBe(
      "Texte.\n\n#hr #seo #hrStrategy #personalBranding #posty",
    );
  });

  it("removes indentation and collapses extra blank lines", () => {
    const out = polishStrategistPost("1️⃣ Un problème\n   Avant de plonger…\n\n\n\nFin.\n#a #posty");
    expect(out).toBe("1️⃣ Un problème\nAvant de plonger…\n\nFin.\n\n#a #posty");
  });

  it("is idempotent and keeps plain posts intact", () => {
    const post = "Mardi, un client m'a dit non.\n\nJ'ai changé d'approche.\n\n#vente #posty";
    expect(polishStrategistPost(post)).toBe(post);
    expect(polishStrategistPost(polishStrategistPost(post))).toBe(post);
  });
});

describe("polishStrategistPost — hashtag hygiene", () => {
  it("removes diacritics and fixes single-letter acronym splits", () => {
    expect(polishStrategistPost("Texte.\n\n#gestionSimplifiée #hRstrategy #posty")).toBe(
      "Texte.\n\n#gestionSimplifiee #hrstrategy #posty",
    );
  });
});
