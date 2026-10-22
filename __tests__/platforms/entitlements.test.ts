import { describe, it, expect } from "vitest";
import {
  PLATFORM_INFO,
  SELF_SERVE_PLATFORMS,
  getAllPlatforms,
  getPlanLimits,
  getSelfServePlatforms,
  isPlatformAllowed,
  isSelfServePlatform,
  type Platform,
} from "@/lib/config/plans";
import { PLATFORMS } from "@/components/publish/platforms-config";

/**
 * Commercial packaging (decided 2026-10-22):
 *   - Free: LinkedIn only.
 *   - Pro / Max: LinkedIn + Bluesky, Mastodon, Discord (self-serve).
 *   - Threads, Facebook, Reddit (+ Zernio X / Instagram / Threads): never
 *     self-serve — the Settings screen shows "activated on request" with a
 *     contact CTA for every user, whatever their plan.
 */

const ON_REQUEST: Platform[] = ["threads", "facebook", "reddit", "threadsz", "x", "instagram"];

describe("plan → platform entitlements", () => {
  it("Free gets LinkedIn and nothing else", () => {
    expect(getPlanLimits("free").allowedPlatforms).toEqual(["linkedin"]);
    for (const p of ["bluesky", "mastodon", "discord", ...ON_REQUEST] as Platform[]) {
      expect(isPlatformAllowed("free", p), p).toBe(false);
    }
  });

  it("Pro adds Bluesky, Mastodon and Discord", () => {
    expect(getPlanLimits("pro").allowedPlatforms).toEqual(["linkedin", "bluesky", "mastodon", "discord"]);
    for (const p of ON_REQUEST) {
      expect(isPlatformAllowed("pro", p), p).toBe(false);
    }
  });

  it("Max keeps every platform (on-request ones are activated by the team)", () => {
    for (const p of getAllPlatforms()) {
      expect(isPlatformAllowed("max", p), p).toBe(true);
    }
  });

  it("maxPlatformConnections matches the allowed list", () => {
    for (const plan of ["free", "pro"] as const) {
      const limits = getPlanLimits(plan);
      expect(limits.maxPlatformConnections, plan).toBe(limits.allowedPlatforms.length);
    }
  });
});

describe("self-serve vs on-request", () => {
  it("only LinkedIn, Bluesky, Mastodon and Discord are self-serve", () => {
    expect([...SELF_SERVE_PLATFORMS].sort()).toEqual(["bluesky", "discord", "linkedin", "mastodon"]);
    for (const p of ON_REQUEST) {
      expect(isSelfServePlatform(p), p).toBe(false);
    }
  });

  it("plan copy never advertises an on-request network", () => {
    for (const plan of ["free", "pro", "max"] as const) {
      for (const p of getSelfServePlatforms(plan)) {
        expect(ON_REQUEST, `${plan}/${p}`).not.toContain(p);
      }
    }
  });

  it("Free sees LinkedIn alone, Pro and Max see the four self-serve networks", () => {
    expect(getSelfServePlatforms("free")).toEqual(["linkedin"]);
    expect(getSelfServePlatforms("pro")).toEqual(["linkedin", "bluesky", "mastodon", "discord"]);
    expect(getSelfServePlatforms("max")).toEqual(["linkedin", "bluesky", "mastodon", "discord"]);
  });
});

describe("minimum plan badges stay consistent", () => {
  it("PLATFORM_INFO.minPlan matches the plan that first allows the platform", () => {
    for (const p of getAllPlatforms()) {
      const firstAllowing = (["free", "pro", "max"] as const).find((plan) => isPlatformAllowed(plan, p));
      expect(PLATFORM_INFO[p].minPlan, p).toBe(firstAllowing);
    }
  });

  it("the publish selector shows the same minimum plan as PLATFORM_INFO", () => {
    for (const option of PLATFORMS) {
      expect(option.minPlan, option.id).toBe(PLATFORM_INFO[option.id].minPlan);
    }
  });
});
