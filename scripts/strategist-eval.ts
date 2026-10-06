/**
 * Strategist quality eval — real generations with the real prompt builders.
 *
 *   npx tsx --env-file=.env.local scripts/strategist-eval.ts <outDir> [onlyCase]
 *
 * Runs the Phase-1 planner (planBatch) and the Phase-2 writer (shared engine in
 * brief mode) for a few personas / requests, then writes a markdown report with
 * every plan, every post and simple metrics (format mix, length vs band, emoji
 * count, closing type, lint issues, opener overlap) to read and judge by hand.
 *
 * No Firestore writes: userId is empty (cost tracking no-ops), grounding off.
 * Cost: ~$0.40 per full run on gpt-4o.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import OpenAI from "openai";
import { planBatch, type UserContext } from "@/lib/strategist/generate-batch";
import { buildBriefGeneration } from "@/lib/ai/materialize-post-prompt";
import { generateLinkedInPost } from "@/lib/services/post-generator";
import { buildOptimizedPrompt, type ProfileFields } from "@/lib/services/prompt-builder";
import { lintPost } from "@/lib/services/post-quality";
import { LENGTH_BANDS, normalizeFormat, normalizeLength } from "@/lib/ai/post-formats";
import { detectStrategistIntent } from "@/lib/strategist/batch-intent";
import { polishStrategistPost } from "@/lib/strategist/post-polish";
import type { PostBrief, StrategistAdvancedParams } from "@/types";

interface Persona {
  key: string;
  language: "fr" | "en";
  profile: ProfileFields;
  ctx: UserContext;
  advanced?: StrategistAdvancedParams;
  bio?: string;
}

const PERSONAS: Record<string, Persona> = {
  // Mirrors the founder's real Firestore profile + saved Strategist settings.
  emilien: {
    key: "emilien",
    language: "fr",
    profile: {
      displayName: "Emilien",
      sector: "RH / Recrutement",
      role: "Ceo",
      objective: "Générer des leads qualifiés",
      targetAudience: "RH / Recruteurs",
      communicationTone: "Direct et percutant",
      linkedinStyle: "Business / Corporate",
    },
    ctx: {
      name: "Emilien",
      sector: "RH / Recrutement",
      role: "Ceo",
      objective: "Générer des leads qualifiés",
      targetAudience: "RH / Recruteurs",
      communicationTone: "Direct et percutant",
    },
    advanced: {
      context:
        "Posty (postyapp.ai) est un SaaS qui génère et programme des posts LinkedIn par IA, à la voix de l'utilisateur. Cible : fondateurs, indépendants et marketeurs B2B francophones qui veulent publier régulièrement sur LinkedIn sans y passer des heures. Le Stratège IA planifie la semaine, rédige les posts, ajoute des visuels libres de droits et programme la publication. Bénéfices : gagner du temps, rester régulier, et convertir des prospects via LinkedIn. Je suis le fondateur, je construis en public.",
      objective: "conversion",
      tone: "direct",
      audience: "Fondateurs, indépendants et marketeurs B2B francophones actifs sur LinkedIn",
      formality: 2,
      ctaIntensity: "soft",
      hookStyle: "auto",
      orientation: "personal",
      emotion: 3,
    },
  },
  camille: {
    key: "camille",
    language: "fr",
    profile: {
      displayName: "Camille",
      profileType: "Entrepreneur / Fondateur",
      sector: "Tech / IT",
      role: "Fondatrice & CEO",
      objective: "Générer des leads qualifiés",
      targetAudience: "Gérants de cliniques vétérinaires",
      communicationTone: "Expert",
      linkedinStyle: "Phrases courtes, concret, un peu d'autodérision",
    },
    ctx: {
      name: "Camille",
      profileType: "Entrepreneur / Fondateur",
      sector: "Tech / IT",
      role: "Fondatrice & CEO",
      objective: "Générer des leads qualifiés",
      targetAudience: "Gérants de cliniques vétérinaires",
      communicationTone: "Expert",
    },
    advanced: {
      context:
        "VetPlan : logiciel de prise de rendez-vous et de planning pour cliniques vétérinaires (40 cliniques clientes en France). Ancienne vétérinaire pendant 6 ans avant de fonder VetPlan. Le problème qu'on règle : les no-shows et les plannings tenus sur papier.",
      objective: "lead-gen",
    },
  },
  thomas: {
    key: "thomas",
    language: "fr",
    profile: {
      displayName: "Thomas",
      profileType: "Freelance / Indépendant",
      sector: "Design / Créatif",
      role: "Product designer freelance",
      objective: "Développer ma visibilité et crédibilité",
      targetAudience: "Fondateurs de startups early-stage",
      communicationTone: "Décontracté",
      linkedinStyle: "Tutoiement, humour, je raconte ce que je vis",
    },
    ctx: {
      name: "Thomas",
      profileType: "Freelance / Indépendant",
      sector: "Design / Créatif",
      role: "Product designer freelance",
      objective: "Développer ma visibilité et crédibilité",
      targetAudience: "Fondateurs de startups early-stage",
      communicationTone: "Décontracté",
    },
    advanced: {
      context:
        "Product designer freelance depuis 2 ans, avant 5 ans en agence. J'aide les startups early-stage à concevoir leur MVP (UX, UI, prototypes testés avec de vrais utilisateurs).",
      orientation: "personal",
      emotion: 4,
      formality: 1,
    },
  },
  sarah: {
    key: "sarah",
    language: "en",
    profile: {
      displayName: "Sarah",
      profileType: "Consultant",
      sector: "Human Resources",
      role: "HR consultant",
      objective: "Build authority",
      targetAudience: "HR directors at 200-1000 employee tech companies",
      communicationTone: "Professional",
    },
    ctx: {
      name: "Sarah",
      profileType: "Consultant",
      sector: "Human Resources",
      role: "HR consultant",
      objective: "Build authority",
      targetAudience: "HR directors at 200-1000 employee tech companies",
      communicationTone: "Professional",
    },
    advanced: {
      context:
        "Independent HR consultant, 12 years as HR director before. I help mid-size tech companies reduce regretted attrition: stay interviews, manager training, career frameworks.",
      formality: 4,
      emotion: 2,
      objective: "authority",
    },
  },
};

const CASES: Array<{ key: string; persona: keyof typeof PERSONAS; prompt: string; covers: string }> = [
  { key: "emilien-week", persona: "emilien", prompt: "Prépare-moi 5 posts pour la semaine prochaine, adaptés à mon activité et à mon audience.", covers: "profil réel du fondateur, plan de la semaine" },
  { key: "emilien-post", persona: "emilien", prompt: "Rédige un post sur le temps que les fondateurs perdent à écrire leurs posts LinkedIn", covers: "profil réel, post unique (le cas qui était plat)" },
  { key: "camille-week", persona: "camille", prompt: "Prépare-moi 5 posts pour cette semaine", covers: "sujet pro, mix de formats, liste, éducatif, long/court" },
  { key: "thomas-story", persona: "thomas", prompt: "Écris un post sur mon parcours : j'ai quitté mon agence il y a 2 ans pour devenir freelance", covers: "personal branding, storytelling, emojis bienvenus" },
  { key: "thomas-plan", persona: "thomas", prompt: "Prépare 4 posts pour me faire connaître auprès des fondateurs de startups", covers: "personal branding, variété, emojis bienvenus" },
  { key: "sarah-week", persona: "sarah", prompt: "Plan 5 posts for this week on reducing employee attrition", covers: "EN, éducatif, opinion, emojis très légers (formel)" },
  { key: "camille-short", persona: "camille", prompt: "Fais un post court et tranché sur les logiciels de planning trop compliqués", covers: "post court, opinion" },
];

const emojiCount = (s: string) => (s.match(/\p{Extended_Pictographic}/gu) ?? []).length;
function bodyOf(s: string): string {
  const lines = s.split("\n");
  while (lines.length && (!lines[lines.length - 1].trim() || /^(#\w[\w-]*\s*)+$/.test(lines[lines.length - 1].trim()))) lines.pop();
  return lines.join("\n").trim();
}
function closingKind(s: string): string {
  const last = bodyOf(s).split("\n").filter((l) => l.trim()).pop() ?? "";
  return /\?\s*$/.test(last) ? "question" : "statement";
}
const firstWords = (s: string, n = 4) => s.trim().split(/\s+/).slice(0, n).join(" ").toLowerCase();

async function pMap<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let c = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (true) {
        const i = c++;
        if (i >= items.length) return;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

async function main() {
  const outDir = process.argv[2] || "./.strategist-eval";
  const only = process.argv[3];
  mkdirSync(outDir, { recursive: true });
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing (use --env-file=.env.local)");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90_000, maxRetries: 6 });

  const report: string[] = [`# Strategist eval — ${new Date().toISOString()}\n`];
  const summary: string[] = ["| case | post | format | length | chars (band) | emojis | close | lint |", "|---|---|---|---|---|---|---|---|"];

  for (const c of CASES) {
    if (only && !c.key.startsWith(only)) continue;
    const persona = PERSONAS[c.persona];
    const intent = detectStrategistIntent(c.prompt);
    const count = intent.kind === "plan" ? intent.count : 1;
    console.log(`\n▶ ${c.key} — intent=${JSON.stringify(intent)}`);

    const plan = await planBatch({
      openai,
      userId: "",
      sourcePrompt: c.prompt,
      count,
      startDate: "2026-10-06",
      timezone: "Europe/Paris",
      language: persona.language,
      period: intent.kind === "plan" ? intent.period : "none",
      ctx: persona.ctx,
      snippets: [],
      advanced: persona.advanced,
      source: "eval",
      skipGrounding: true,
    });

    report.push(`\n## ${c.key}\n\n> Demande : « ${c.prompt} » — couvre : ${c.covers}\n> Intent : \`${JSON.stringify(intent)}\`\n`);
    report.push(`**Thème :** ${plan.theme}\n`);
    if (plan.strategy) report.push(`**Stratégie :** ${JSON.stringify(plan.strategy, null, 0)}\n`);
    report.push("| # | date | format | len | goal | hook | angle |\n|---|---|---|---|---|---|---|");
    plan.posts.forEach((p, i) =>
      report.push(`| ${i + 1} | ${p.suggestedDate} ${p.suggestedTime} | ${p.format} | ${p.length} | ${p.goal ?? ""} | ${p.hook.replace(/\|/g, "/")} | ${p.angle.replace(/\|/g, "/")} |`),
    );

    const posts = await pMap(plan.posts, 1, async (brief: PostBrief) => {
      const gen = buildBriefGeneration({
        language: persona.language,
        brief,
        direction: persona.advanced,
        businessContext: persona.bio,
        series: { theme: plan.theme, strategy: plan.strategy, siblings: plan.posts },
        knownFacts: [c.prompt, persona.advanced?.context ?? "", persona.bio ?? ""].join("\n"),
      });
      const { content: raw } = await generateLinkedInPost({
        client: openai,
        type: gen.postType,
        language: persona.language,
        profile: persona.profile,
        plan: "max",
        userId: "",
        route: "strategist.eval",
        userMessage: gen.userMessage,
        systemBlocks: gen.systemBlocks,
        promptOptions: gen.promptOptions,
        lintOptions: gen.lintOptions,
        maxTokens: 2000,
      });
      return { brief, gen, content: polishStrategistPost(raw) };
    });

    if (c.key === (only ?? CASES[0].key) && posts[0]) {
      const g = posts[0].gen;
      const sys =
        buildOptimizedPrompt(g.postType, persona.language, persona.profile, "max", g.promptOptions) +
        g.systemBlocks.join("");
      writeFileSync(join(outDir, `system-prompt-${c.key}-1.txt`), `${sys}\n\n=== USER ===\n${g.userMessage}`);
    }

    const openers: string[] = [];
    posts.forEach(({ brief, content }, i) => {
      const format = normalizeFormat(brief.format);
      const length = normalizeLength(brief.length, format);
      const band = LENGTH_BANDS[length];
      const body = bodyOf(content);
      const inBand = body.length >= band.min * 0.8 && body.length <= band.max * 1.2 ? "✓" : "✗";
      const lint = lintPost(content, persona.language, { lengthBand: band, endCheckOnBody: true, strict: true }).issues.map((x) => x.code);
      if (/\*\*|^#{1,6}\s/m.test(content)) lint.push("MARKDOWN");
      openers.push(firstWords(content));
      summary.push(
        `| ${c.key} | ${i + 1} | ${format} | ${length} | ${body.length} (${band.min}-${band.max}) ${inBand} | ${emojiCount(content)} | ${closingKind(content)} | ${lint.join(", ")} |`,
      );
      report.push(`\n### ${c.key} · post ${i + 1} — ${format} / ${length} — ${body.length} car. — ${emojiCount(content)} emoji(s) — fin : ${closingKind(content)}\n`);
      report.push("```text\n" + content + "\n```");
    });
    const dupOpeners = openers.filter((o, i) => openers.indexOf(o) !== i);
    report.push(`\n_Ouvertures identiques (4 premiers mots) : ${dupOpeners.length ? dupOpeners.join(" / ") : "aucune"}_\n`);
  }

  const file = join(outDir, `strategist-eval-${Date.now()}.md`);
  writeFileSync(file, `${report[0]}\n## Résumé\n\n${summary.join("\n")}\n${report.slice(1).join("\n")}\n`);
  console.log(`\nReport: ${file}\n`);
  console.log(summary.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
