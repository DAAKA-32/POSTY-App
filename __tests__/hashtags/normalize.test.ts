import { describe, expect, it } from "vitest";
import {
  POSTY_BRAND_HASHTAG,
  normalizeHashtag,
  normalizeHashtagList,
  normalizeHashtagsInText,
} from "@/lib/hashtags/normalize";

describe("normalizeHashtag — single tag", () => {
  it("lowercases the first letter of single-word hashtags", () => {
    expect(normalizeHashtag("#Engagement")).toBe("#engagement");
    expect(normalizeHashtag("#Marketing")).toBe("#marketing");
  });

  it("converts PascalCase to camelCase for multi-word hashtags", () => {
    expect(normalizeHashtag("#PersonalBranding")).toBe("#personalBranding");
    expect(normalizeHashtag("#LinkedinGrowth")).toBe("#linkedinGrowth");
    expect(normalizeHashtag("#BusinessStrategy")).toBe("#businessStrategy");
    expect(normalizeHashtag("#CultureDeEntreprise")).toBe("#cultureDeEntreprise");
  });

  it("is idempotent on already-correct hashtags", () => {
    expect(normalizeHashtag("#engagement")).toBe("#engagement");
    expect(normalizeHashtag("#personalBranding")).toBe("#personalBranding");
    expect(normalizeHashtag("#posty")).toBe("#posty");
  });

  it("always coerces the brand hashtag to #posty", () => {
    expect(normalizeHashtag("#POSTY")).toBe(POSTY_BRAND_HASHTAG);
    expect(normalizeHashtag("#Posty")).toBe(POSTY_BRAND_HASHTAG);
    expect(normalizeHashtag("#posty")).toBe(POSTY_BRAND_HASHTAG);
    expect(normalizeHashtag("#pOsTy")).toBe(POSTY_BRAND_HASHTAG);
  });

  it("accepts bare tokens without a leading hash", () => {
    expect(normalizeHashtag("PersonalBranding")).toBe("#personalBranding");
    expect(normalizeHashtag("posty")).toBe(POSTY_BRAND_HASHTAG);
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeHashtag("  #Leadership  ")).toBe("#leadership");
  });

  it("returns empty / non-string input unchanged or empty", () => {
    expect(normalizeHashtag("")).toBe("");
    // @ts-expect-error — runtime safety
    expect(normalizeHashtag(null)).toBe(null);
    // @ts-expect-error — runtime safety
    expect(normalizeHashtag(undefined)).toBe(undefined);
  });

  it("handles a lone hash gracefully", () => {
    expect(normalizeHashtag("#")).toBe("#");
  });
});

describe("normalizeHashtagsInText — post body", () => {
  it("normalizes every hashtag occurrence inside free text", () => {
    const input = "Voici mes pensées sur #PersonalBranding et #Leadership.\n\n#POSTY";
    const output = normalizeHashtagsInText(input);
    expect(output).toBe("Voici mes pensées sur #personalBranding et #leadership.\n\n#posty");
  });

  it("preserves non-hashtag content (punctuation, line breaks, emojis)", () => {
    const input = "Une question 🚀\n\nQuel est ton avis ? #BusinessStrategy #Marketing";
    const output = normalizeHashtagsInText(input);
    expect(output).toBe("Une question 🚀\n\nQuel est ton avis ? #businessStrategy #marketing");
  });

  it("does not touch text that contains no hashtags", () => {
    const input = "Just a regular sentence with #1 ordinal and no tags.";
    // "#1" matches \p{L}\p{N} as a tag-like token (just digits); but
    // lowercasing a digit is a no-op so the string is unchanged.
    expect(normalizeHashtagsInText(input)).toBe(input);
  });

  it("returns empty / falsy input unchanged", () => {
    expect(normalizeHashtagsInText("")).toBe("");
  });

  it("is idempotent across multiple passes", () => {
    const input = "First pass #FooBar #POSTY";
    const once = normalizeHashtagsInText(input);
    const twice = normalizeHashtagsInText(once);
    expect(twice).toBe(once);
    expect(twice).toBe("First pass #fooBar #posty");
  });
});

describe("normalizeHashtagList — platform adaptation arrays", () => {
  it("normalizes every entry and preserves order", () => {
    expect(normalizeHashtagList(["#Marketing", "#PersonalBranding", "#POSTY"]))
      .toEqual(["#marketing", "#personalBranding", "#posty"]);
  });

  it("accepts entries without a leading hash", () => {
    expect(normalizeHashtagList(["Marketing", "PersonalBranding", "posty"]))
      .toEqual(["#marketing", "#personalBranding", "#posty"]);
  });

  it("drops empty strings and whitespace-only entries", () => {
    expect(normalizeHashtagList(["", "   ", "#Leadership"])).toEqual(["#leadership"]);
  });

  it("returns an empty array on null / undefined / non-array input", () => {
    expect(normalizeHashtagList(null)).toEqual([]);
    expect(normalizeHashtagList(undefined)).toEqual([]);
    // @ts-expect-error — runtime safety on non-array input
    expect(normalizeHashtagList("not-an-array")).toEqual([]);
  });

  it("silently ignores non-string array entries", () => {
    // @ts-expect-error — runtime safety on heterogeneous arrays
    expect(normalizeHashtagList(["#Foo", 42, null, "#Bar"])).toEqual(["#foo", "#bar"]);
  });
});
