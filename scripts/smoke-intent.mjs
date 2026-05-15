// Quick smoke test for POST /api/intent.
// Verifies the classifier routes common prompts correctly.

import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const API = process.env.SMOKE_API_BASE || "http://localhost:3000";

function loadEnv() {
  try {
    const raw = readFileSync(path.join(ROOT, ".env.local"), "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let value = m[2];
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
  } catch { /* ignore */ }
}
loadEnv();

const FIREBASE_WEB_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
if (!FIREBASE_WEB_API_KEY) throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY");

const { initializeApp, cert } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");

const serviceAccount = JSON.parse(readFileSync(path.join(ROOT, "service-account.json"), "utf-8"));
const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const adminAuth = getAuth(app);

const TEST_UID = "smoke-image-api-user";
const customToken = await adminAuth.createCustomToken(TEST_UID);
const ex = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_WEB_API_KEY}`,
  { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) }
);
const exJson = await ex.json();
if (!exJson.idToken) { console.error("token exchange failed", exJson); process.exit(1); }
const ID_TOKEN = exJson.idToken;

const cases = [
  { prompt: "Fais une image sur l'entreprenariat", expectIntent: "image", expectPostType: undefined },
  { prompt: "Fais une image moderne sur l'IA", expectIntent: "image", expectPostType: undefined },
  { prompt: "Crée un visuel startup premium", expectIntent: "image", expectPostType: undefined },
  { prompt: "Fais un post LinkedIn sur le growth", expectIntent: "post", expectPostType: "PRODUCTION" },
  { prompt: "Écris un post sur ma transition de carrière", expectIntent: "post", expectPostType: "PRODUCTION" },
  { prompt: "Fais un post avec un visuel sur l'IA", expectIntent: "both", expectPostType: "PRODUCTION" },
  { prompt: "Tu connais le content marketing ?", expectIntent: "conversation", expectPostType: "ASSISTANCE" },
  { prompt: "Comment améliorer mon hook ?", expectIntent: "conversation", expectPostType: "ASSISTANCE" },
  { prompt: "Salut", expectIntent: "conversation", expectPostType: "SOCIAL" },
  { prompt: "Explique-moi le content marketing puis fais-moi un post dessus", expectIntent: "post", expectPostType: "HYBRID" },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  const res = await fetch(`${API}/api/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ID_TOKEN}` },
    body: JSON.stringify({ prompt: c.prompt, hasPriorConversation: false }),
  });
  const data = await res.json().catch(() => ({}));
  const intentOk = res.ok && data.intent === c.expectIntent;
  const postTypeOk = data.postType === c.expectPostType;
  const ok = intentOk && postTypeOk;
  const mark = ok ? "✓" : "✗";
  console.log(`  ${mark} "${c.prompt.slice(0, 50)}"`);
  console.log(`     intent: expected=${c.expectIntent}  got=${data.intent}  ${intentOk ? "OK" : "FAIL"}`);
  console.log(`     postType: expected=${c.expectPostType}  got=${data.postType}  ${postTypeOk ? "OK" : "FAIL"}`);
  console.log(`     source=${data.source}  conf=${data.confidence}`);
  if (ok) pass++; else fail++;
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail === 0 ? 0 : 1);
