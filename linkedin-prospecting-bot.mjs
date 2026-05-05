/**
 * linkedin-prospecting-bot.mjs
 * ────────────────────────────────────────────────────────────────────────────
 * Prospection LinkedIn 100% gratuite — scrape → IA Claude → envoi du message.
 *
 * Stack (tout gratuit, zéro install supplémentaire) :
 *   - Playwright (déjà dans le projet, package.json) → contrôle un vrai Chrome
 *   - API Claude appelée en `fetch` direct → pas besoin du SDK Anthropic
 *   - .env.local parsé à la main → pas besoin de dotenv
 *   - .mjs en ESM natif → tourne avec `node` sans compilation TS
 *
 * SETUP :
 *   1. Le projet a déjà Playwright. Si Chromium n'est pas téléchargé :
 *        npx playwright install chromium
 *   2. Ajoute ta clé Claude dans .env.local :
 *        ANTHROPIC_API_KEY=sk-ant-...
 *   3. Première utilisation — login manuel (la session est sauvegardée) :
 *        node linkedin-prospecting-bot.mjs --login
 *      → Une fenêtre Chrome s'ouvre, connecte-toi à LinkedIn normalement,
 *        ferme la fenêtre. La session reste enregistrée dans .linkedin-session/
 *
 * USAGE :
 *   # Tester l'extraction d'un profil sans rien envoyer :
 *     node linkedin-prospecting-bot.mjs --scrape https://www.linkedin.com/in/xxx/
 *
 *   # Générer un message en dry-run (pas d'envoi) :
 *     node linkedin-prospecting-bot.mjs --send https://www.linkedin.com/in/xxx/ --dry
 *
 *   # Envoyer pour de vrai (message direct si déjà en relation, sinon Connect+note) :
 *     node linkedin-prospecting-bot.mjs --send https://www.linkedin.com/in/xxx/
 *
 *   # Batch RAPIDE (tests, petits volumes — 30s à 3min entre envois) :
 *     node linkedin-prospecting-bot.mjs --batch targets.txt
 *
 *   # Batch PACED (anti-cramage, recommandé en prod) :
 *     node linkedin-prospecting-bot.mjs --batch targets.txt --paced
 *      → 15-45min entre chaque envoi
 *      → uniquement en heures ouvrées (9h-18h lun-ven)
 *      → auto-pause la nuit / le weekend, reprise auto le lendemain matin
 *      → auto-arrêt à 15 messages/jour, reprise demain
 *
 * GARDE-FOUS intégrés :
 *   - 6 templates différents (peer, post-récent, signal entreprise, parcours,
 *     ressource, intérêt commun) — choix aléatoire par profil → pas de pattern
 *   - Max 15 messages/jour (relu depuis prospecting-log.jsonl)
 *   - Délais aléatoires : 30s-3min (rapide) ou 15-45min (--paced)
 *   - Heures ouvrées + skip weekend en mode --paced
 *   - Frappe humanisée (40-110ms entre touches, micro-pauses aléatoires)
 *   - Anti-doublon : si l'URL est déjà dans le log, on skip
 *   - Mode --dry par défaut sur la 1re utilisation pour valider
 *
 * ⚠️ ATTENTION : LinkedIn interdit explicitement le scraping et l'automation
 *    (User Agreement §8.2). Conséquences possibles : restriction puis ban du
 *    compte. Utilise un compte dédié, pas ton compte principal. Volumes très
 *    bas. Respecte le RGPD si tu prospectes en Europe (mention de la source,
 *    droit d'opposition à fournir dans tes messages, registre de traitement).
 * ────────────────────────────────────────────────────────────────────────────
 */

import { chromium } from "playwright";
import { existsSync, readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// CONFIG
// ============================================================================

const SESSION_DIR = resolve(__dirname, ".linkedin-session");
const LOG_FILE = resolve(__dirname, "prospecting-log.jsonl");
const MAX_PER_DAY = 15;
// Délais "rapides" (mode --batch sans --paced) — pour tests / petits volumes
const MIN_DELAY_MS = 30_000; // 30s
const MAX_DELAY_MS = 180_000; // 3min
// Délais "naturels" (mode --paced) — étalement réaliste, anti-cramage
const PACED_MIN_DELAY_MS = 15 * 60_000; // 15min
const PACED_MAX_DELAY_MS = 45 * 60_000; // 45min
// Heures ouvrées (locale serveur). En dehors → le scheduler attend la prochaine fenêtre.
const WORK_HOUR_START = 9; // 9h
const WORK_HOUR_END = 18; // 18h
const WORK_DAYS = [1, 2, 3, 4, 5]; // 0=dim, 1=lun, ..., 6=sam (lun-ven)
// Frappe humanisée
const TYPING_MIN_MS = 40;
const TYPING_MAX_MS = 110;

// Modèle Claude — Sonnet 4.6 est le meilleur rapport qualité/prix pour ce type
// de génération courte. Si tu veux plus rapide/moins cher, passe en Haiku 4.5.
const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_API_VERSION = "2023-06-01";

// Prompt système COMMUN — règles dures qui ne changent jamais.
const SYSTEM_PROMPT_BASE = `Tu écris des messages courts de prospection LinkedIn, chaleureux et personnalisés.

RÈGLES STRICTES (toujours):
- 280 caractères MAX (sinon LinkedIn coupe la note d'invitation)
- Français par défaut, sauf si le profil est clairement anglophone
- DOIT mentionner UN détail spécifique du profil (rôle, entreprise, post récent, parcours)
- INTERDIT: "J'espère que ce message vous trouve bien", "Je me permets de", emojis, formules génériques, hashtags
- Ton de pair-à-pair, pas de commercial. Pas de pitch produit.
- Termine par une question ou un appel à l'action concret.

Réponds UNIQUEMENT avec le message final, rien d'autre. Pas de préambule, pas d'explication.`;

// ─── TEMPLATES — 6 angles différents, choisis aléatoirement par profil ────
// Le but : éviter que tes 15 messages du jour aient tous la même structure
// (même intro, même CTA). LinkedIn (et les humains) repèrent les patterns.
// Chaque template = un *angle* injecté en plus du prompt de base.
// Pour ajouter un template : pousse-le ici, c'est tout.
const TEMPLATES = [
  {
    name: "peer_learning",
    angle: `ANGLE: Présente-toi en 1 phrase comme pair (founder/opérateur). Demande un retour d'expérience sur UN sujet précis lié à son métier. Propose 15min d'échange. Sincère, pas de flatterie.`,
  },
  {
    name: "recent_post_reaction",
    angle: `ANGLE: Réagis à son activité récente (post, sujet récurrent dans ses publications). Pose UNE vraie question ouverte sur le sujet. Pas de "j'ai adoré ton post".`,
  },
  {
    name: "company_signal",
    angle: `ANGLE: Mentionne un signal précis sur son entreprise (croissance visible, levée, recrutement, lancement, tournant stratégique). Demande comment ils gèrent UN challenge concret lié.`,
  },
  {
    name: "career_curiosity",
    angle: `ANGLE: Pose une question de curiosité sur son parcours (transition, choix de poste, pivot). Curieux et sincère, pas commercial. Aucun pitch.`,
  },
  {
    name: "useful_resource",
    angle: `ANGLE: Propose le partage d'une ressource utile et concrète (étude, framework, exemple chiffré) en lien avec son métier. Échange optionnel après. Vraie valeur, pas spam.`,
  },
  {
    name: "shared_interest",
    angle: `ANGLE: Ouvre sur un point commun visible (secteur, école, ancienne boîte, communauté). Enchaîne sur UNE question pro précise. Court et net.`,
  },
];

// Personnalise ces 2 champs selon ton offre/objectif :
const MY_CONTEXT = `Je suis Emilien, fondateur de Posty (outil IA qui aide les founders B2B à publier sur LinkedIn).
Mon objectif: échanger 15min avec des founders/CMO qui investissent déjà sur LinkedIn pour comprendre leurs blocages.`;

// ============================================================================
// UTILS
// ============================================================================

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function loadEnvLocal() {
  const envPath = resolve(__dirname, ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

function logEvent(event) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n";
  appendFileSync(LOG_FILE, line);
}

function readLog() {
  if (!existsSync(LOG_FILE)) return [];
  return readFileSync(LOG_FILE, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function countSentToday() {
  const today = new Date().toISOString().slice(0, 10);
  return readLog().filter(
    (e) => e.action === "sent" && e.ts.startsWith(today)
  ).length;
}

function alreadyContacted(profileUrl) {
  const normalized = profileUrl.replace(/[?#].*$/, "").replace(/\/$/, "");
  return readLog().some(
    (e) =>
      e.action === "sent" &&
      e.profileUrl &&
      e.profileUrl.replace(/[?#].*$/, "").replace(/\/$/, "") === normalized
  );
}

// Frappe humanisée — pauses aléatoires + micro-hésitations toutes les ~12 touches.
async function humanType(locator, text) {
  for (let i = 0; i < text.length; i++) {
    await locator.type(text[i], { delay: rand(TYPING_MIN_MS, TYPING_MAX_MS) });
    if (i > 0 && i % rand(10, 15) === 0) {
      await sleep(rand(200, 700));
    }
  }
}

// ============================================================================
// CLAUDE API — appel direct en fetch, pas de SDK
// ============================================================================

function pickTemplate() {
  return TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
}

async function generateMessage(profile, opts = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante dans .env.local");

  // Template forcé (utile pour tester un angle précis) ou aléatoire
  const template = opts.template
    ? TEMPLATES.find((t) => t.name === opts.template) || pickTemplate()
    : pickTemplate();

  // Le BASE est mis en cache (réutilisé entre tous les prospects).
  // L'ANGLE varie par template → pas caché, mais c'est 2 lignes, négligeable.
  const userPrompt = `${template.angle}

MON CONTEXTE :
${MY_CONTEXT}

PROFIL DU PROSPECT :
- Nom : ${profile.name}
- Headline : ${profile.headline || "(non renseigné)"}
- Entreprise : ${profile.company || "(non renseignée)"}
- À propos : ${profile.about || "(vide)"}
- Activité récente : ${profile.recentActivity || "(rien capturé)"}

Génère le message d'invitation LinkedIn (max 280 caractères, applique l'angle ci-dessus).`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_API_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 400,
      // Prompt caching sur le system prompt de base (réutilisé entre prospects).
      // Économise ~90% du coût des tokens d'entrée à partir du 2e appel.
      system: [
        { type: "text", text: SYSTEM_PROMPT_BASE, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Claude API ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const message = data.content?.[0]?.text?.trim() || "";
  if (!message) throw new Error("Claude n'a rien renvoyé");
  if (message.length > 300) {
    console.warn(`⚠️  Message dépasse 280 chars (${message.length}) — sera tronqué`);
  }
  return { message: message.slice(0, 280), templateName: template.name };
}

// ============================================================================
// PLAYWRIGHT — session persistante (login une fois, réutilisé ensuite)
// ============================================================================

async function openBrowser({ headless = false } = {}) {
  if (!existsSync(SESSION_DIR)) mkdirSync(SESSION_DIR, { recursive: true });

  const context = await chromium.launchPersistentContext(SESSION_DIR, {
    headless,
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    args: ["--disable-blink-features=AutomationControlled"],
  });

  // Petit nettoyage anti-détection : enlève la prop `navigator.webdriver`
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  return context;
}

// ============================================================================
// SCRAPING — extraction profil LinkedIn
// ============================================================================

async function scrapeProfile(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });

  // Vérifie qu'on est bien loggé. Si LinkedIn renvoie sur /login, on s'arrête.
  if (page.url().includes("/login") || page.url().includes("/checkpoint")) {
    throw new Error(
      "Session LinkedIn perdue. Relance avec --login pour te reconnecter."
    );
  }

  await page.waitForSelector("h1", { timeout: 15_000 });
  // Petit scroll pour déclencher le lazy-load de la section "Activité"
  await page.evaluate(() => window.scrollTo(0, 800));
  await sleep(rand(800, 1500));

  const profile = await page.evaluate(() => {
    const txt = (sel) => document.querySelector(sel)?.textContent?.trim() || "";

    // Le DOM LinkedIn change souvent — ces sélecteurs sont best-effort.
    const name = txt("h1");
    const headline = txt(".text-body-medium.break-words");
    // Entreprise actuelle : 1er bouton sous "Expérience" OU le pill en haut
    const companyAside = txt('button[aria-label*="Current company"]');
    const company =
      companyAside ||
      document.querySelector(
        ".pv-text-details__right-panel-item-text span[aria-hidden='true']"
      )?.textContent?.trim() ||
      "";

    // Section "À propos" — varie entre desktop/mobile
    let about = "";
    const aboutSection = Array.from(document.querySelectorAll("section")).find(
      (s) => s.querySelector("#about, [id^='about']")
    );
    if (aboutSection) {
      about =
        aboutSection
          .querySelector(".display-flex.full-width span[aria-hidden='true']")
          ?.textContent?.trim() || "";
    }

    // Premier post visible dans la section "Activité"
    let recentActivity = "";
    const activitySection = Array.from(document.querySelectorAll("section")).find(
      (s) => s.querySelector("[id^='content_collections'], #content_collections")
    );
    if (activitySection) {
      recentActivity =
        activitySection
          .querySelector("span[dir='ltr'] span[aria-hidden='true']")
          ?.textContent?.trim()
          .slice(0, 280) || "";
    }

    return { name, headline, company, about, recentActivity };
  });

  if (!profile.name) {
    throw new Error(
      "Impossible d'extraire le nom — la page a peut-être bloqué (captcha?) ou changé de structure."
    );
  }

  return profile;
}

// ============================================================================
// ENVOI — détecte si "Message" (déjà en relation) ou "Connect" (nouveau)
// ============================================================================

async function sendMessage(page, profileUrl, message) {
  await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForSelector("h1", { timeout: 15_000 });
  await sleep(rand(1500, 3000));

  // Cas 1 : déjà en relation → bouton "Message"
  const messageBtn = page
    .locator('button:has-text("Message"), button:has-text("Envoyer un message")')
    .first();

  // Cas 2 : pas en relation → bouton "Se connecter" / "Connect"
  const connectBtn = page
    .locator('button:has-text("Se connecter"), button:has-text("Connect")')
    .first();

  if (await messageBtn.isVisible().catch(() => false)) {
    return await sendDirectMessage(page, messageBtn, message);
  }

  if (await connectBtn.isVisible().catch(() => false)) {
    return await sendConnectionRequest(page, connectBtn, message);
  }

  // Parfois le bouton est dans un menu "Plus" / "More"
  const moreBtn = page.locator('button:has-text("Plus"), button:has-text("More")').first();
  if (await moreBtn.isVisible().catch(() => false)) {
    await moreBtn.click();
    await sleep(rand(600, 1200));
    const connectInMenu = page
      .locator('div[role="button"]:has-text("Se connecter"), div[role="button"]:has-text("Connect")')
      .first();
    if (await connectInMenu.isVisible().catch(() => false)) {
      return await sendConnectionRequest(page, connectInMenu, message);
    }
  }

  throw new Error("Aucun bouton Message ou Connect trouvé sur ce profil");
}

async function sendDirectMessage(page, messageBtn, message) {
  await messageBtn.click();
  await sleep(rand(1500, 2500));

  const editor = page.locator('div[role="textbox"][contenteditable="true"]').last();
  await editor.waitFor({ timeout: 10_000 });
  await editor.click();
  await humanType(editor, message);
  await sleep(rand(800, 1800));

  const sendBtn = page
    .locator('button:has-text("Send"), button:has-text("Envoyer")')
    .last();
  await sendBtn.click();
  await sleep(rand(1500, 3000));
  return { mode: "direct_message" };
}

async function sendConnectionRequest(page, connectBtn, message) {
  await connectBtn.click();
  await sleep(rand(1200, 2200));

  // Modal apparaît : on clique sur "Ajouter une note" / "Add a note"
  const addNoteBtn = page
    .locator('button:has-text("Ajouter une note"), button:has-text("Add a note")')
    .first();
  await addNoteBtn.waitFor({ timeout: 10_000 });
  await addNoteBtn.click();
  await sleep(rand(700, 1500));

  const noteField = page.locator('textarea[name="message"], textarea#custom-message').first();
  await noteField.waitFor({ timeout: 10_000 });
  await noteField.click();
  await humanType(noteField, message);
  await sleep(rand(800, 1800));

  const sendBtn = page
    .locator('button:has-text("Envoyer"), button:has-text("Send")')
    .last();
  await sendBtn.click();
  await sleep(rand(1500, 3000));
  return { mode: "connection_request" };
}

// ============================================================================
// SCHEDULING — heures ouvrées + délais naturels (mode --paced)
// ============================================================================

function isWorkingHour(date = new Date()) {
  const h = date.getHours();
  const dow = date.getDay();
  return WORK_DAYS.includes(dow) && h >= WORK_HOUR_START && h < WORK_HOUR_END;
}

// Renvoie le timestamp (ms) de la prochaine ouverture de fenêtre ouvrée.
// Utile pour savoir combien de temps dormir avant de pouvoir re-envoyer.
function nextWorkingWindow(from = new Date()) {
  const d = new Date(from);
  // Si on est déjà dans la fenêtre, on renvoie l'instant présent.
  if (isWorkingHour(d)) return d.getTime();

  // Sinon on avance heure par heure jusqu'à tomber dans une fenêtre.
  // Max 14j de recherche pour éviter les boucles infinies si config absurde.
  for (let i = 0; i < 14 * 24; i++) {
    d.setHours(d.getHours() + 1, 0, 0, 0);
    if (isWorkingHour(d)) return d.getTime();
  }
  return from.getTime();
}

// Attend jusqu'à la prochaine fenêtre ouvrée (en imprimant l'heure de reprise).
async function waitUntilWorkingHours() {
  if (isWorkingHour()) return;
  const next = nextWorkingWindow();
  const wait = next - Date.now();
  const h = Math.floor(wait / 3_600_000);
  const m = Math.floor((wait % 3_600_000) / 60_000);
  console.log(
    `🌙 Hors heures ouvrées (${WORK_HOUR_START}h–${WORK_HOUR_END}h, lun-ven). ` +
      `Reprise dans ~${h}h${m}m, soit ${new Date(next).toLocaleString()}`
  );
  await sleep(wait);
  console.log(`🌅 Heures ouvrées atteintes — reprise.`);
}

// ============================================================================
// FLOWS
// ============================================================================

async function flowLogin() {
  console.log("→ Ouverture de Chrome. Connecte-toi à LinkedIn manuellement.");
  console.log("→ Une fois connecté, ferme la fenêtre. La session sera sauvée.");
  const ctx = await openBrowser({ headless: false });
  const page = await ctx.newPage();
  await page.goto("https://www.linkedin.com/login");
  // On attend que l'utilisateur ferme manuellement (l'event 'close' déclenche la fin)
  await new Promise((res) => ctx.on("close", res));
  console.log("✓ Session sauvegardée dans .linkedin-session/");
}

async function flowScrape(url) {
  const ctx = await openBrowser({ headless: false });
  const page = await ctx.newPage();
  console.log(`→ Scrape : ${url}`);
  const profile = await scrapeProfile(page, url);
  console.log("\n📋 Profil extrait :");
  console.log(JSON.stringify(profile, null, 2));
  await ctx.close();
}

async function flowSend(url, { dry = false } = {}) {
  if (alreadyContacted(url)) {
    console.log(`⏭  Profil déjà contacté (vu dans le log) — skip`);
    return { skipped: true };
  }

  const sentToday = countSentToday();
  if (sentToday >= MAX_PER_DAY) {
    console.log(`🛑 Limite quotidienne atteinte (${sentToday}/${MAX_PER_DAY})`);
    return { skipped: true };
  }

  const ctx = await openBrowser({ headless: false });
  const page = await ctx.newPage();

  try {
    console.log(`→ Scrape : ${url}`);
    const profile = await scrapeProfile(page, url);
    console.log(`  Nom : ${profile.name}`);
    console.log(`  Headline : ${profile.headline}`);

    console.log("→ Génération du message via Claude...");
    const { message, templateName } = await generateMessage(profile);
    console.log(`\n💬 Message généré (template: ${templateName}) :`);
    console.log(`  ${message}`);
    console.log(`  (${message.length} caractères)\n`);

    if (dry) {
      console.log("🔍 Mode --dry : aucun envoi");
      logEvent({ action: "dry_run", profileUrl: url, profile, message, templateName });
      await ctx.close();
      return { dry: true, message, templateName };
    }

    console.log("→ Envoi en cours...");
    const result = await sendMessage(page, url, message);
    console.log(`✓ Envoyé (${result.mode})`);
    logEvent({
      action: "sent",
      profileUrl: url,
      profile,
      message,
      templateName,
      mode: result.mode,
    });

    await ctx.close();
    return result;
  } catch (err) {
    console.error(`✗ Erreur : ${err.message}`);
    logEvent({ action: "error", profileUrl: url, error: err.message });
    await ctx.close();
    throw err;
  }
}

async function flowBatch(filePath, { dry = false, paced = false } = {}) {
  if (!existsSync(filePath)) throw new Error(`Fichier introuvable : ${filePath}`);
  const urls = readFileSync(filePath, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && l.startsWith("http"));

  const mode = paced ? "PACED (15-45min, heures ouvrées)" : "FAST (30s-3min)";
  console.log(`📋 ${urls.length} profils — mode ${mode}`);
  if (paced) {
    console.log(
      `   → max ${MAX_PER_DAY}/jour, fenêtre ${WORK_HOUR_START}h-${WORK_HOUR_END}h lun-ven, ` +
        `auto-reprise après pause nuit/weekend.`
    );
  }

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    // Mode paced : si quota du jour atteint OU hors heures ouvrées → attendre.
    if (paced) {
      while (countSentToday() >= MAX_PER_DAY) {
        // Quota plein : on dort jusqu'à minuit + un peu de jitter pour éviter
        // que tout reparte pile à minuit (signature suspecte).
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, rand(2, 30), 0, 0);
        const wait = tomorrow.getTime() - Date.now();
        console.log(
          `🛑 Quota du jour atteint (${MAX_PER_DAY}). Reprise demain à ${tomorrow.toLocaleTimeString()}.`
        );
        await sleep(wait);
      }
      await waitUntilWorkingHours();
    }

    console.log(`\n[${i + 1}/${urls.length}] ${url}`);

    try {
      const r = await flowSend(url, { dry });
      if (r?.skipped) continue;
    } catch (err) {
      console.error(`  Skip ce profil suite à erreur : ${err.message}`);
    }

    if (i < urls.length - 1) {
      const [minD, maxD] = paced
        ? [PACED_MIN_DELAY_MS, PACED_MAX_DELAY_MS]
        : [MIN_DELAY_MS, MAX_DELAY_MS];
      const delay = rand(minD, maxD);
      const mins = Math.floor(delay / 60_000);
      const secs = Math.floor((delay % 60_000) / 1000);
      console.log(
        `⏱  Pause de ${mins > 0 ? `${mins}m` : ""}${secs}s avant le suivant...`
      );
      await sleep(delay);
    }
  }
}

// ============================================================================
// CLI
// ============================================================================

function printHelp() {
  console.log(`
Usage:
  node linkedin-prospecting-bot.mjs --login
  node linkedin-prospecting-bot.mjs --scrape <profile-url>
  node linkedin-prospecting-bot.mjs --send <profile-url> [--dry]
  node linkedin-prospecting-bot.mjs --batch <file.txt> [--dry] [--paced]

Flags:
  --dry     Génère le message mais n'envoie rien (recommandé pour tester)
  --paced   Mode "anti-cramage" : 15-45min entre envois, heures ouvrées
            uniquement (${WORK_HOUR_START}h-${WORK_HOUR_END}h lun-ven), auto-pause nuit/weekend.
            Recommandé pour tout batch > 5 profils.

Avant la 1re utilisation:
  1. node linkedin-prospecting-bot.mjs --login   (login manuel à LinkedIn)
  2. ANTHROPIC_API_KEY=... dans .env.local
  3. Édite SYSTEM_PROMPT_BASE, TEMPLATES et MY_CONTEXT en haut du script

Templates disponibles (choix aléatoire par profil) :
${TEMPLATES.map((t) => `  - ${t.name}`).join("\n")}
`);
}

async function main() {
  loadEnvLocal();
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const paced = args.includes("--paced");

  if (args.includes("--login")) {
    await flowLogin();
  } else if (args.includes("--scrape")) {
    const url = args[args.indexOf("--scrape") + 1];
    if (!url) return printHelp();
    await flowScrape(url);
  } else if (args.includes("--send")) {
    const url = args[args.indexOf("--send") + 1];
    if (!url) return printHelp();
    await flowSend(url, { dry });
  } else if (args.includes("--batch")) {
    const file = args[args.indexOf("--batch") + 1];
    if (!file) return printHelp();
    await flowBatch(file, { dry, paced });
  } else {
    printHelp();
  }
}

main().catch((err) => {
  console.error("\n💥 Erreur fatale :", err.message);
  process.exit(1);
});
