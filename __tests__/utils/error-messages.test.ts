import { afterEach, describe, expect, it, vi } from "vitest";
import { getFriendlyMessage, localized, uiLanguage } from "@/lib/utils/error-messages";

function stubLanguage(value: string | null) {
  vi.stubGlobal("window", {
    localStorage: { getItem: (k: string) => (k === "posty-language" ? value : null) },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("error messages follow the interface language", () => {
  it("defaults to English when no language was ever chosen", () => {
    stubLanguage(null);
    expect(uiLanguage()).toBe("en");
    expect(getFriendlyMessage(new Error("Failed to fetch"))).toMatch(/Connection lost/);
  });

  it("stays French for users who chose French", () => {
    stubLanguage("fr");
    expect(uiLanguage()).toBe("fr");
    expect(getFriendlyMessage(new Error("Failed to fetch"))).toMatch(/Connexion perdue/);
    expect(localized("bonjour", "hello")).toBe("bonjour");
  });

  it("falls back to English for the other locales (no French leak)", () => {
    stubLanguage("de");
    expect(localized("bonjour", "hello")).toBe("hello");
  });

  it("is safe without a window (SSR) and when storage throws", () => {
    expect(uiLanguage()).toBe("en");
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(uiLanguage()).toBe("en");
  });

  it("every pattern has an English variant", () => {
    stubLanguage("en");
    for (const probe of ["timeout", "quota_exceeded", "openai down", "No response body", "503", "unknown weirdness"]) {
      expect(getFriendlyMessage(new Error(probe))).not.toMatch(/[éèàç]|Reessayez|Verifiez/);
    }
  });
});
