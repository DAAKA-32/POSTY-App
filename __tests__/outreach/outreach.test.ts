import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseCsv, rowToInput } from "@/lib/outreach/csv";
import {
  buildUnsubscribeUrl,
  getOutreachConfig,
  isPublicHttpsUrl,
  listUnsubscribeHeaders,
} from "@/lib/outreach/send";
import { findPlaceholder, renderEmail } from "@/lib/outreach/templates";

const sender = { name: "Emilien", role: "Cofondateur", email: "postygroup@gmail.com" };
const base = {
  id: "p1",
  email: "florentine@florentinecollette.fr",
  firstName: "Florentine",
  lastName: "Collette",
  company: "",
  sector: "Conseil RP & communication",
  role: "",
};

describe("outreach config — opt-out mode and link base URL", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.SMTP_USER = "postygroup@gmail.com";
    process.env.SMTP_PASSWORD = "app-password-16ch";
    delete process.env.OUTREACH_PUBLIC_URL;
    delete process.env.OUTREACH_UNSUBSCRIBE_MODE;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("defaults to reply mode, which needs no deployed page", () => {
    process.env.OUTREACH_PUBLIC_URL = "http://localhost:3000";
    const config = getOutreachConfig();
    expect(config.ok).toBe(true);
    expect(config.ok && config.config.unsubscribeMode).toBe("reply");
  });

  it("never inherits a localhost NEXT_PUBLIC_BASE_URL", async () => {
    process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
    process.env.OUTREACH_UNSUBSCRIBE_MODE = "link";
    const config = getOutreachConfig();
    expect(config.ok).toBe(true);
    if (!config.ok) return;
    expect(config.config.baseUrl).toBe("https://postyapp.ai");
    const url = await buildUnsubscribeUrl(config.config.baseUrl, base.email);
    expect(url.startsWith("https://postyapp.ai/desabonnement?")).toBe(true);
    expect(url).not.toContain("localhost");
  });

  it("in link mode, fails closed when OUTREACH_PUBLIC_URL is not public https", () => {
    process.env.OUTREACH_UNSUBSCRIBE_MODE = "link";
    for (const bad of ["http://localhost:3000", "https://localhost:3000", "http://postyapp.ai", "https://192.168.1.20"]) {
      process.env.OUTREACH_PUBLIC_URL = bad;
      expect(getOutreachConfig().ok, bad).toBe(false);
    }
  });

  it("accepts a public https URL and strips the trailing slash", () => {
    process.env.OUTREACH_UNSUBSCRIBE_MODE = "link";
    process.env.OUTREACH_PUBLIC_URL = "https://postyapp.ai/";
    const config = getOutreachConfig();
    expect(config.ok && config.config.baseUrl).toBe("https://postyapp.ai");
  });

  it("classifies hosts correctly", () => {
    expect(isPublicHttpsUrl("https://postyapp.ai")).toBe(true);
    expect(isPublicHttpsUrl("https://127.0.0.1")).toBe(false);
    expect(isPublicHttpsUrl("https://[::1]")).toBe(false);
    expect(isPublicHttpsUrl("not a url")).toBe(false);
  });
});

describe("outreach headers — List-Unsubscribe", () => {
  it("reply mode offers mailto only, without the one-click header", () => {
    const headers = listUnsubscribeHeaders("postygroup@gmail.com", null);
    expect(headers["List-Unsubscribe"]).toBe("<mailto:postygroup@gmail.com?subject=stop>");
    expect(headers["List-Unsubscribe-Post"]).toBeUndefined();
  });

  it("link mode offers the https link, mailto fallback and one-click", () => {
    const headers = listUnsubscribeHeaders("Emilien <postygroup@gmail.com>", "https://postyapp.ai/desabonnement?e=x&t=y");
    expect(headers["List-Unsubscribe"]).toBe(
      "<https://postyapp.ai/desabonnement?e=x&t=y>, <mailto:postygroup@gmail.com?subject=stop>"
    );
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });
});

describe("outreach templates — personalisation and footer", () => {
  const link = "https://postyapp.ai/desabonnement?e=x&t=y";

  it("cites the prospect's own site, as a bare domain", () => {
    const out = renderEmail({ ...base, website: "https://www.florentinecollette.fr/" }, sender, null);
    expect(out.text).toContain("après être passé sur florentinecollette.fr.");
    expect(out.text.startsWith("Bonjour Florentine,")).toBe(true);
  });

  it("keeps sector acronyms instead of flattening them", () => {
    const out = renderEmail({ ...base, website: "florentinecollette.fr" }, sender, null);
    expect(out.text).toContain("secteur conseil RP & communication");
    expect(out.text).not.toContain("conseil rp");
  });

  it("falls back to a neutral opener without inventing a site", () => {
    expect(renderEmail({ ...base, website: "" }, sender, null).text).not.toContain("passé sur");
    expect(renderEmail({ ...base, website: "voir LinkedIn" }, sender, null).text).not.toContain("passé sur");
  });

  it("reply mode prints no link and asks for a stop reply", () => {
    const out = renderEmail({ ...base, website: "florentinecollette.fr" }, sender, null);
    expect(out.text).toContain("répondez simplement « stop » à cet email.");
    expect(out.text).not.toContain("http://localhost");
    expect(out.text).not.toContain("desabonnement");
  });

  it("link mode prints the link", () => {
    const out = renderEmail({ ...base, website: "florentinecollette.fr" }, sender, link);
    expect(out.text).toContain(`cliquez ici : ${link}`);
  });

  it("never leaves a placeholder in subject or body", () => {
    const out = renderEmail({ ...base, website: "florentinecollette.fr" }, sender, null);
    expect(findPlaceholder(`${out.subject}\n${out.text}`)).toBeNull();
    expect(findPlaceholder("Bonjour {{firstName}}")).not.toBeNull();
    expect(findPlaceholder("Chez [COMPANY]")).not.toBeNull();
  });
});

describe("outreach csv — import parsing", () => {
  it("only splits on the header's separator, so commas in text keep columns aligned", () => {
    const raw = "\uFEFFemail;prenom;secteur;site web\nanne@exemple.fr;Anne;Formation, coaching;exemple.fr\n";
    const [row] = parseCsv(raw);
    expect(row.secteur).toBe("Formation, coaching");
    expect(row["site web"]).toBe("exemple.fr");
    const input = rowToInput(row);
    expect(input?.website).toBe("exemple.fr");
    expect(input?.firstName).toBe("Anne");
  });

  it("still reads comma-separated files and quoted fields", () => {
    const [row] = parseCsv('email,prenom,secteur\nanne@exemple.fr,Anne,"Conseil; RP"\n');
    expect(row.secteur).toBe("Conseil; RP");
  });
});
