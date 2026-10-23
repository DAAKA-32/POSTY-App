import { afterEach, describe, expect, it, vi } from "vitest";
import { getPlanLimits } from "@/lib/config/plans";

/**
 * The Strategist is included in Pro and Max (plan feature
 * `hasMarketingStrategist`); an email allowlist grants it on top of the plan.
 * lib/strategist/access.ts holds the one rule, used by the browser hooks, the
 * five API routes and the autonomous cron.
 */

// The allowlist is read from the env once per module load: set it BEFORE a
// fresh import.
async function loadAccess(allowlist = "") {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_STRATEGIST_ALLOWED_EMAILS", allowlist);
  return import("@/lib/strategist/access");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("plan feature", () => {
  it("is on for Pro and Max, off for Free", () => {
    expect(getPlanLimits("pro").hasMarketingStrategist).toBe(true);
    expect(getPlanLimits("max").hasMarketingStrategist).toBe(true);
    expect(getPlanLimits("free").hasMarketingStrategist).toBe(false);
  });
});

describe("canUseStrategist", () => {
  it("grants Pro and Max by plan, with no allowlist", async () => {
    const { canUseStrategist } = await loadAccess();
    expect(canUseStrategist("anyone@example.com", "pro")).toBe(true);
    expect(canUseStrategist("anyone@example.com", "max")).toBe(true);
  });

  it("refuses Free and an unknown plan", async () => {
    const { canUseStrategist } = await loadAccess();
    expect(canUseStrategist("anyone@example.com", "free")).toBe(false);
    expect(canUseStrategist("anyone@example.com", null)).toBe(false);
    expect(canUseStrategist("anyone@example.com", undefined)).toBe(false);
  });

  it("lets an allowlisted email in whatever the plan (case and spaces ignored)", async () => {
    const { canUseStrategist } = await loadAccess("Vip@Example.com, other@example.com");
    expect(canUseStrategist("vip@example.com", "free")).toBe(true);
    expect(canUseStrategist("  OTHER@example.com ", null)).toBe(true);
    expect(canUseStrategist("stranger@example.com", "free")).toBe(false);
  });

  it("never grants access to a missing or blank email on the allowlist path", async () => {
    const { canUseStrategist } = await loadAccess("vip@example.com");
    expect(canUseStrategist(null, "free")).toBe(false);
    expect(canUseStrategist(undefined, "free")).toBe(false);
    expect(canUseStrategist("   ", "free")).toBe(false);
    // …while a paying user without an email is still a paying user.
    expect(canUseStrategist(null, "pro")).toBe(true);
  });
});

describe("strategistPlanFromStored", () => {
  it("normalises casing and the legacy 'starter' (= pro)", async () => {
    const { strategistPlanFromStored } = await loadAccess();
    expect(strategistPlanFromStored("pro")).toBe("pro");
    expect(strategistPlanFromStored(" MAX ")).toBe("max");
    expect(strategistPlanFromStored("Free")).toBe("free");
    expect(strategistPlanFromStored("starter")).toBe("pro");
  });

  it("returns null for anything else", async () => {
    const { strategistPlanFromStored } = await loadAccess();
    expect(strategistPlanFromStored("enterprise")).toBeNull();
    expect(strategistPlanFromStored("")).toBeNull();
    expect(strategistPlanFromStored(undefined)).toBeNull();
    expect(strategistPlanFromStored(42)).toBeNull();
  });
});

describe("strategistAccessFromUserDoc (what the routes and the cron apply)", () => {
  it("accepts a Pro, a Max and a legacy starter document", async () => {
    const { strategistAccessFromUserDoc } = await loadAccess();
    expect(strategistAccessFromUserDoc({ email: "a@example.com", subscription: { plan: "pro" } })).toBe(true);
    expect(strategistAccessFromUserDoc({ email: "a@example.com", subscription: { plan: "max" } })).toBe(true);
    expect(strategistAccessFromUserDoc({ email: "a@example.com", subscription: { plan: "starter" } })).toBe(true);
  });

  it("refuses a Free document and one with no subscription at all", async () => {
    const { strategistAccessFromUserDoc } = await loadAccess();
    expect(strategistAccessFromUserDoc({ email: "a@example.com", subscription: { plan: "free" } })).toBe(false);
    expect(strategistAccessFromUserDoc({ email: "a@example.com" })).toBe(false);
    expect(strategistAccessFromUserDoc({ email: "a@example.com", subscription: null })).toBe(false);
    expect(strategistAccessFromUserDoc(null)).toBe(false);
    expect(strategistAccessFromUserDoc(undefined)).toBe(false);
  });

  it("falls back to the verified auth email when the document has none (allowlist)", async () => {
    const { strategistAccessFromUserDoc } = await loadAccess("vip@example.com");
    expect(strategistAccessFromUserDoc({ subscription: { plan: "free" } }, "vip@example.com")).toBe(true);
    expect(strategistAccessFromUserDoc({ subscription: { plan: "free" } }, "stranger@example.com")).toBe(false);
  });

  it("a downgrade closes the door: a Free document is refused even if it once was Pro", async () => {
    const { strategistAccessFromUserDoc } = await loadAccess();
    expect(strategistAccessFromUserDoc({ email: "a@example.com", subscription: { plan: "pro" } })).toBe(true);
    expect(strategistAccessFromUserDoc({ email: "a@example.com", subscription: { plan: "free" } })).toBe(false);
  });
});

describe("strategistDeniedMessage", () => {
  it("speaks about Pro and Max in both languages, never about enterprises", async () => {
    const { strategistDeniedMessage } = await loadAccess();
    expect(strategistDeniedMessage("fr")).toMatch(/Pro et Max/);
    expect(strategistDeniedMessage("en")).toMatch(/Pro and Max/);
    expect(strategistDeniedMessage("fr")).not.toMatch(/entreprise/i);
    expect(strategistDeniedMessage(undefined)).toMatch(/Pro and Max/);
  });
});
