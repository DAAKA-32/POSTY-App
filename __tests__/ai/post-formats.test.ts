import { describe, expect, it } from "vitest";
import {
  FORMATS,
  FORMAT_SLUGS,
  closingRule,
  normalizeFormat,
  normalizeGoal,
  normalizeLength,
  pickFormatMix,
} from "@/lib/ai/post-formats";

/** Small deterministic PRNG for reproducible mixes. */
function prng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("normalizeFormat", () => {
  it.each([
    ["storytelling", "storytelling"],
    ["lesson-learned", "lesson"],
    ["how-to", "advice"],
    ["carrousel", "list"],
    ["data-drop", "analysis"],
    ["contrarian-take", "opinion"],
    ["thread-of-thought", "opinion"],
    ["case-study", "case-study"],
    ["Étude de cas", "case-study"],
    ["behind-the-scenes", "behind-the-scenes"],
    ["Coulisses", "behind-the-scenes"],
    ["question", "debate"],
    ["post court", "quick-take"],
    ["", "opinion"],
    ["something unknown", "opinion"],
  ])("%s → %s", (raw, slug) => {
    expect(normalizeFormat(raw)).toBe(slug);
  });

  it("every canonical slug maps to itself", () => {
    for (const slug of FORMAT_SLUGS) expect(normalizeFormat(slug)).toBe(slug);
  });
});

describe("normalizeLength / normalizeGoal", () => {
  it("falls back to the format default and forces quick-take short", () => {
    expect(normalizeLength(undefined, "storytelling")).toBe("long");
    expect(normalizeLength("long", "quick-take")).toBe("short");
    expect(normalizeLength("medium", "list")).toBe("medium");
    expect(normalizeLength("weird", "debate")).toBe("short");
  });
  it("maps goal spellings", () => {
    expect(normalizeGoal("lead-gen")).toBe("lead-gen");
    expect(normalizeGoal("Expertise")).toBe("authority");
    expect(normalizeGoal("notoriété")).toBe("branding");
    expect(normalizeGoal("???")).toBeUndefined();
  });
});

describe("pickFormatMix", () => {
  it("returns distinct formats while the catalogue allows it", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const mix = pickFormatMix(7, {}, prng(seed));
      expect(mix).toHaveLength(7);
      expect(new Set(mix.map((s) => s.format)).size).toBe(7);
    }
  });

  it("never puts two identical formats side by side, even past the catalogue size", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const mix = pickFormatMix(15, {}, prng(seed));
      expect(mix).toHaveLength(15);
      for (let i = 1; i < mix.length; i++) expect(mix[i].format).not.toBe(mix[i - 1].format);
    }
  });

  it("guarantees at least one short and one long post from 3 posts up", () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const n of [3, 5, 7]) {
        const mix = pickFormatMix(n, {}, prng(seed));
        expect(mix.some((s) => s.length === "short")).toBe(true);
        expect(mix.some((s) => s.length === "long")).toBe(true);
      }
    }
  });

  it("leans toward the objective's formats", () => {
    let storyish = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const mix = pickFormatMix(3, { objective: "storytelling" }, prng(seed));
      storyish += mix.filter((s) => ["storytelling", "lesson", "behind-the-scenes"].includes(s.format)).length;
    }
    // 3 of 11 formats → ~27% by chance; the objective weight should push well above.
    expect(storyish / 600).toBeGreaterThan(0.45);
  });
});

describe("closingRule", () => {
  it("drops the closing question when the author wants no CTA", () => {
    const rule = closingRule("storytelling", "none", "fr");
    expect(rule).toMatch(/Pas d'appel à l'action/);
  });
  it("keeps the question for a debate whatever the CTA setting", () => {
    expect(closingRule("debate", "none", "fr")).toBe(FORMATS.debate.closing.fr);
  });
  it("adds an explicit action for an assertive CTA", () => {
    expect(closingRule("advice", "assertive", "en")).toMatch(/ONE clear invitation/);
  });
});
