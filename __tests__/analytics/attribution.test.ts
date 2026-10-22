import { describe, expect, it } from "vitest";
import { classifyTouch, isAttributable, parseHost, sanitizeTag } from "@/lib/analytics/attribution";

const ref = (referrer: string) => classifyTouch({ referrer });

describe("referrer classification", () => {
  it.each([
    ["https://www.google.com", "google/organic", "search"],
    ["https://www.google.fr", "google/organic", "search"],
    ["https://google.co.uk", "google/organic", "search"],
    ["https://www.bing.com", "bing/organic", "search"],
    ["https://chatgpt.com", "chatgpt/referral", "ai"],
    ["https://chat.openai.com", "chatgpt/referral", "ai"],
    ["https://www.perplexity.ai", "perplexity/referral", "ai"],
    ["https://claude.ai", "claude/referral", "ai"],
    ["https://gemini.google.com", "gemini/referral", "ai"],
    ["https://copilot.microsoft.com", "copilot/referral", "ai"],
    ["https://www.tiktok.com", "tiktok/social", "social"],
    ["https://l.instagram.com", "instagram/social", "social"],
    ["https://www.linkedin.com", "linkedin/social", "social"],
    ["https://lnkd.in", "linkedin/social", "social"],
    ["https://m.youtube.com", "youtube/social", "social"],
    ["https://out.reddit.com", "reddit/social", "social"],
    ["https://l.facebook.com", "facebook/social", "social"],
    ["https://t.co", "x/social", "social"],
    ["https://mail.google.com", "gmail/email", "email"],
  ])("%s → %s", (url, key, channel) => {
    const c = ref(url);
    expect(c.key).toBe(key);
    expect(c.channel).toBe(channel);
    expect(c.method).toBe("referrer");
  });

  it("does not mistake lookalike domains for a known platform", () => {
    expect(ref("https://example-chatgpt.com").key).toBe("example-chatgpt.com/referral");
    expect(ref("https://chatgpt.com.evil.io").key).toBe("chatgpt.com.evil.io/referral");
    expect(ref("https://notlinkedin.com").channel).toBe("referral");
    expect(ref("https://google.evil.com").source).toBe("google.evil.com");
    expect(ref("https://tiktok.com.attacker.dev").source).not.toBe("tiktok");
  });

  it("treats an unknown external site as a referral keyed by its domain", () => {
    const c = ref("https://www.some-blog.fr/post/42?x=1");
    expect(c).toMatchObject({ source: "some-blog.fr", medium: "referral", channel: "referral" });
    expect(c.referrerDomain).toBe("some-blog.fr");
  });

  it("maps Android in-app referrers", () => {
    expect(ref("android-app://com.linkedin.android").key).toBe("linkedin/social");
    expect(ref("android-app://com.unknown.app").key).toBe("unknown/none");
  });
});

describe("direct and unknown", () => {
  it("no referrer and no params is direct / none", () => {
    expect(classifyTouch({}).key).toBe("direct/none");
    expect(classifyTouch(undefined).key).toBe("direct/none");
    expect(classifyTouch({ referrer: "" }).key).toBe("direct/none");
  });

  it("our own domain and payment/auth hops are not acquisition", () => {
    expect(ref("https://postyapp.ai/subscription").key).toBe("direct/none");
    expect(ref("https://checkout.stripe.com/c/pay").key).toBe("direct/none");
    expect(ref("https://accounts.google.com/o/oauth2").key).toBe("direct/none");
  });

  it("an unreadable referrer is unknown, not direct", () => {
    expect(ref("javascript:alert(1)").key).toBe("unknown/none");
    expect(ref("not a url").key).toBe("unknown/none");
  });

  it("direct and unknown never count as attributable", () => {
    expect(isAttributable(classifyTouch({}))).toBe(false);
    expect(isAttributable(ref("not a url"))).toBe(false);
    expect(isAttributable(ref("https://www.google.com"))).toBe(true);
  });
});

describe("UTM parameters", () => {
  it("UTM source beats the referrer", () => {
    const c = classifyTouch({
      referrer: "https://www.google.com",
      utm_source: "newsletter",
      utm_medium: "email",
      utm_campaign: "Launch Oct",
    });
    expect(c).toMatchObject({ key: "newsletter/email", method: "utm", campaign: "launch-oct" });
  });

  it("normalises aliases and infers the medium", () => {
    expect(classifyTouch({ utm_source: "ig" }).key).toBe("instagram/social");
    expect(classifyTouch({ utm_source: "chatgpt.com" }).key).toBe("chatgpt/referral");
    expect(classifyTouch({ utm_source: "LinkedIn", utm_medium: "paid_social" }).key).toBe("linkedin/cpc");
    expect(classifyTouch({ utm_source: "linkedin", utm_medium: "paid_social" }).channel).toBe("paid");
    expect(classifyTouch({ utm_source: "partner-acme", utm_medium: "partner" }).channel).toBe("affiliate");
  });

  it("keeps campaign/content/term alongside a referrer-derived source", () => {
    const c = classifyTouch({ referrer: "https://www.tiktok.com", utm_campaign: "spring", utm_content: "v2" });
    expect(c).toMatchObject({ key: "tiktok/social", campaign: "spring", content: "v2" });
  });

  it("sanitises hostile or malformed values", () => {
    expect(sanitizeTag("<script>alert(1)</script>")).toBe("scriptalert1script");
    expect(sanitizeTag("  A  B  ")).toBe("a-b");
    expect(sanitizeTag("x".repeat(500))?.length).toBe(40);
    expect(sanitizeTag(42)).toBeUndefined();
    // Edge underscores are stripped, so reserved-looking keys can't survive.
    expect(sanitizeTag("__proto__")).toBe("proto");
    expect(sanitizeTag("__name__")).toBe("name");
    expect(sanitizeTag("   ")).toBeUndefined();
    const c = classifyTouch({ utm_source: "'; DROP TABLE--", utm_medium: "../../etc" });
    expect(c.key).toMatch(/^[a-z0-9._-]+\/[a-z0-9._-]+$/);
  });

  it("a non-string / empty UTM source falls through to the next rung", () => {
    expect(classifyTouch({ utm_source: "   ", referrer: "https://www.bing.com" }).key).toBe("bing/organic");
  });
});

describe("click ids", () => {
  it("gclid marks paid Google traffic", () => {
    const c = classifyTouch({ gclid: true });
    expect(c).toMatchObject({ key: "google/cpc", channel: "paid", method: "click_id" });
  });
  it("an explicit UTM source still wins over a click id", () => {
    expect(classifyTouch({ gclid: true, utm_source: "newsletter", utm_medium: "email" }).key).toBe("newsletter/email");
  });
  it("fbclid alone does not claim a paid channel", () => {
    expect(classifyTouch({ fbclid: true, referrer: "https://l.facebook.com" }).key).toBe("facebook/social");
  });
});

describe("parseHost", () => {
  it("strips www and lowercases", () => {
    expect(parseHost("HTTPS://WWW.Example.COM/path")).toBe("example.com");
  });
  it("rejects non-http(s) and garbage", () => {
    expect(parseHost("ftp://example.com")).toBeNull();
    expect(parseHost("")).toBeNull();
    expect(parseHost(undefined)).toBeNull();
  });
});
