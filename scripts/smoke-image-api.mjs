// E2E smoke test for POST /api/image/generate.
//
// Verifies, against a running dev server:
//   1. No auth header   → 401 with `error: "unauthorized"` (sanity)
//   2. Bogus bearer     → 401 with `error: "unauthorized"`
//   3. Real ID token    → 200 with `{ url, imageId, dsl }` (full pipeline)
//
// Run:  node scripts/smoke-image-api.mjs
// Requires: dev server running on http://localhost:3000, service-account.json
// at repo root, NEXT_PUBLIC_FIREBASE_* and OPENAI_API_KEY in .env.local.

import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const API = process.env.SMOKE_API_BASE || "http://localhost:3000";

// ── Load .env.local manually (we don't want to require dotenv as a dep) ──────
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
  } catch {
    /* .env.local missing — ignore, the script will surface missing vars below */
  }
}
loadEnv();

const FIREBASE_WEB_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!FIREBASE_WEB_API_KEY) throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY in .env.local");
if (!FIREBASE_PROJECT_ID)  throw new Error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local");

// ── Init Admin SDK ───────────────────────────────────────────────────────────
const { initializeApp, cert } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");
const { getFirestore, FieldValue } = await import("firebase-admin/firestore");

const serviceAccount = JSON.parse(
  readFileSync(path.join(ROOT, "service-account.json"), "utf-8")
);
const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const adminAuth = getAuth(app);
const adminDb = getFirestore(app);

// Test UID — stable across runs so we don't pollute the prod users collection.
// The corresponding Firestore doc is upserted below with a Max plan so the
// quota check passes. After the run, we leave it in place; running the test
// repeatedly just increments the same user's daily count.
const TEST_UID = "smoke-image-api-user";
const TEST_EMAIL = "smoke-image-api@posty.test";

console.log("\n── 1. Seed test user in Firestore ───────────────────────────");
await adminDb.collection("users").doc(TEST_UID).set(
  {
    email: TEST_EMAIL,
    displayName: "Smoke Test User",
    subscription: { plan: "max", status: "active" },
    createdAt: FieldValue.serverTimestamp(),
  },
  { merge: true }
);
console.log("   ✓ user", TEST_UID, "→ plan=max");

console.log("\n── 2. Mint Firebase ID token via custom-token exchange ──────");
const customToken = await adminAuth.createCustomToken(TEST_UID, { email: TEST_EMAIL });
const exchangeRes = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_WEB_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  }
);
const exchangeJson = await exchangeRes.json();
if (!exchangeJson.idToken) {
  console.error("   ✗ token exchange failed", exchangeJson);
  process.exit(1);
}
const ID_TOKEN = exchangeJson.idToken;
console.log("   ✓ idToken length:", ID_TOKEN.length, "chars");

// ── Helper ───────────────────────────────────────────────────────────────────
async function callApi(label, headers, body) {
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(`${API}/api/image/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(`   ✗ ${label}: network error`, err.message);
    return null;
  }
  const elapsed = Date.now() - t0;
  let json;
  try { json = await res.json(); } catch { json = null; }
  console.log(`   ${res.ok ? "✓" : "·"} ${label} → ${res.status} in ${elapsed}ms`);
  if (json) {
    const preview = { ...json };
    if (preview.url && preview.url.length > 80) preview.url = preview.url.slice(0, 80) + "…";
    if (preview.dsl) preview.dsl = `[${preview.dsl.template}]`;
    console.log(`     body:`, JSON.stringify(preview));
  }
  return { status: res.status, json, elapsed };
}

const brief = "Lance d'un produit SaaS pour automatiser les posts LinkedIn — ton premium, sobre";

console.log("\n── 3. No-auth request (expect 401) ──────────────────────────");
const r1 = await callApi("no auth", {}, { brief });
const pass1 = r1?.status === 401 && r1.json?.error === "unauthorized";
console.log(`   ${pass1 ? "✓ PASS" : "✗ FAIL"} expected 401 unauthorized`);

console.log("\n── 4. Bogus bearer (expect 401) ─────────────────────────────");
const r2 = await callApi("bogus bearer", { Authorization: "Bearer not-a-real-token" }, { brief });
const pass2 = r2?.status === 401 && r2.json?.error === "unauthorized";
console.log(`   ${pass2 ? "✓ PASS" : "✗ FAIL"} expected 401 unauthorized`);

console.log("\n── 5. Valid bearer (expect 200 + image) ─────────────────────");
const r3 = await callApi("valid bearer", { Authorization: `Bearer ${ID_TOKEN}` }, { brief });
const pass3 = r3?.status === 200 && typeof r3.json?.url === "string" && typeof r3.json?.imageId === "string";
console.log(`   ${pass3 ? "✓ PASS" : "✗ FAIL"} expected 200 with url + imageId`);

if (pass3 && r3.json?.url) {
  console.log("\n── 6. Fetch PNG and verify bytes ─────────────────────────────");
  const pngRes = await fetch(r3.json.url);
  const buf = Buffer.from(await pngRes.arrayBuffer());
  const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  console.log(`   ${isPng ? "✓ PASS" : "✗ FAIL"} ${buf.length} bytes, magic=${isPng ? "PNG" : "INVALID"}`);
}

const allPass = pass1 && pass2 && pass3;
console.log("\n──────────────────────────────────────────────────────────────");
console.log(allPass ? "✓ All checks passed" : "✗ One or more checks failed");
process.exit(allPass ? 0 : 1);
