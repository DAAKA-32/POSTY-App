/**
 * Chat-parity guard for the shared generation engine.
 *
 * The Strategist gets its own "brief mode" options in buildOptimizedPrompt /
 * lintPost, but the main chat calls them WITHOUT options and must stay
 * byte-identical. These snapshots were recorded before the brief-mode refactor;
 * if one breaks, the chat's prompt (or its quality gate) has drifted.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildOptimizedPrompt,
  type PlanTier,
  type PostType,
  type ProfileFields,
} from "@/lib/services/prompt-builder";
import { lintPost } from "@/lib/services/post-quality";

/** Deterministic Math.random so the variation seed is stable. */
function seedRandom(seed: number) {
  let s = seed;
  vi.spyOn(Math, "random").mockImplementation(() => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

const PROFILE: ProfileFields = {
  displayName: "Julien",
  profileType: "Entrepreneur / Fondateur",
  sector: "Tech / IT",
  role: "Fondateur",
  objective: "Générer des leads qualifiés",
  linkedinStyle: "Phrases courtes, direct, un peu d'humour",
  targetAudience: "CTO de scale-ups SaaS",
  communicationTone: "Expert",
};

const TYPES: PostType[] = ["storytelling", "business"];
const LANGS = ["fr", "en"] as const;
const PLANS: PlanTier[] = ["pro", "max"];

describe("buildOptimizedPrompt — chat path is unchanged", () => {
  for (const type of TYPES) {
    for (const lang of LANGS) {
      for (const plan of PLANS) {
        it(`${type} · ${lang} · ${plan} · with profile`, () => {
          seedRandom(42);
          expect(buildOptimizedPrompt(type, lang, PROFILE, plan)).toMatchSnapshot();
        });
      }
      it(`${type} · ${lang} · no profile`, () => {
        seedRandom(7);
        expect(buildOptimizedPrompt(type, lang, undefined, "max")).toMatchSnapshot();
      });
    }
  }
});

describe("lintPost — default behaviour is unchanged", () => {
  const samples: Array<[string, "fr" | "en", string]> = [
    [
      "fr-clean",
      "fr",
      "Mardi dernier, un client m'a dit \"trop cher\".\n\nJ'ai posé une question.\n\nIl a signé lundi.\n\nQuelle objection avez-vous mal lue ?\n\n#vente #posty",
    ],
    [
      "fr-dirty",
      "fr",
      "Voici comment j'ai doublé mes ventes — sans effort — et sans stress — vraiment.\n\nCe n'est pas une question de prix, c'est une question de confiance.\n\nLe résultat ? Incroyable.\n\nQu'en pensez-vous ?",
    ],
    [
      "en-vague",
      "en",
      "Here's how I changed my pipeline.\n\nIt depends on your context, honestly.\n\nWhat do you think?\n\n#sales #posty",
    ],
  ];
  for (const [name, lang, text] of samples) {
    it(name, () => {
      expect(lintPost(text, lang)).toMatchSnapshot();
    });
  }
});
