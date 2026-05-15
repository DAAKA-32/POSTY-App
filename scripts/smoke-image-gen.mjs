/**
 * End-to-end smoke test for /api/image/generate.
 *
 * Confirms:
 *   1. POST without Authorization header → 401 (sanity: auth gate works)
 *   2. POST with a freshly minted Firebase ID token → 200 + image URL
 *
 * Token minting flow:
 *   - Admin SDK creates a custom token for the founder UID
 *   - Public Firebase REST API exchanges the custom token for an ID token
 *     (this is the same exchange the browser SDK does internally on sign-in)
 *
 * Usage:
 *   node scripts/smoke-image-gen.mjs http://localhost:3000
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const BASE = process.argv[2] || "http://localhost:3000";
const FOUNDER_EMAIL = "emilien.nepveu@gmail.com";

// ─── Load env from .env.local (no Next.js wrapper in this script) ─────────
const envFile = readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const FIREBASE_API_KEY = env.NEXT_PUBLIC_FIREBASE_API_KEY;
if (!FIREBASE_API_KEY) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY missing");

// ─── Init Firebase Admin ─────────────────────────────────────────────────
const sa = JSON.parse(readFileSync(path.join(process.cwd(), "service-account.json"), "utf-8"));
if (getApps().length === 0) {
  initializeApp({ credential: cert(sa) });
}
const adminAuth = getAuth();
const adminDb = getFirestore();

// ─── Resolve founder UID by email (lazy — they must already exist) ───────
async function resolveFounderUid() {
  try {
    const user = await adminAuth.getUserByEmail(FOUNDER_EMAIL);
    return { uid: user.uid, email: user.email };
  } catch {
    throw new Error(`Founder ${FOUNDER_EMAIL} not found in Firebase Auth`);
  }
}

// ─── Mint a Firebase ID token via the custom-token exchange ──────────────
async function mintIdToken(uid) {
  const customToken = await adminAuth.createCustomToken(uid);
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const data = await r.json();
  if (!r.ok) {
    throw new Error(`Token exchange failed: ${r.status} ${JSON.stringify(data)}`);
  }
  return data.idToken;
}

// ─── Test 1: no auth → 401 ───────────────────────────────────────────────
async function testUnauthenticated() {
  console.log("\n[1] POST without Authorization header");
  const r = await fetch(`${BASE}/api/image/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brief: "smoke test" }),
  });
  const data = await r.json().catch(() => ({}));
  console.log("    status:", r.status, "body:", data);
  if (r.status !== 401) {
    throw new Error(`Expected 401, got ${r.status}`);
  }
  console.log("    OK — gate returns 401 as expected");
}

// ─── Test 2: valid token → 200 ───────────────────────────────────────────
async function testAuthenticated(idToken) {
  console.log("\n[2] POST with valid Firebase ID token");
  const t0 = Date.now();
  const r = await fetch(`${BASE}/api/image/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      brief: "Annonce SaaS Posty, palette midnight, ton premium",
      language: "fr",
    }),
  });
  const ms = Date.now() - t0;
  const data = await r.json().catch(() => ({}));
  console.log("    status:", r.status, "in", ms, "ms");
  if (!r.ok) {
    console.log("    body:", data);
    throw new Error(`Expected 2xx, got ${r.status}`);
  }
  console.log("    url:", data.url);
  console.log("    imageId:", data.imageId);
  console.log("    dsl.template:", data.dsl?.template, "accent:", data.dsl?.accent);
  console.log("    quota:", data.quota);

  // Verify the PNG is reachable + non-empty
  const png = await fetch(data.url);
  if (!png.ok) throw new Error(`PNG fetch failed: ${png.status}`);
  const buf = Buffer.from(await png.arrayBuffer());
  console.log("    PNG size:", buf.length, "bytes (header:", buf.slice(0, 4).toString("hex"), ")");
  if (buf.length < 1000) throw new Error("PNG suspiciously small");
  if (buf[0] !== 0x89 || buf[1] !== 0x50) throw new Error("Not a PNG signature");
  console.log("    OK — image rendered + uploaded + reachable");

  return data;
}

// ─── Optional: reset today's image quota for the test user ───────────────
// The endpoint legitimately rejects when the daily cap is reached. To
// exercise the full render path we rewind `imageGenUsage.dayStart` to a
// distant past — `checkImageQuota` then treats today as a fresh window.
async function rewindImageQuota(uid) {
  const ref = adminDb.collection("users").doc(uid);
  const snap = await ref.get();
  const prev = snap.exists ? snap.data()?.imageGenUsage : null;
  await ref.set(
    {
      imageGenUsage: {
        count: 0,
        dayStart: new Date("2000-01-01T00:00:00Z"),
      },
    },
    { merge: true }
  );
  return prev;
}

// ─── Run ─────────────────────────────────────────────────────────────────
const { uid, email } = await resolveFounderUid();
console.log("Founder UID:", uid, "email:", email);

const idToken = await mintIdToken(uid);
console.log("ID token minted (length:", idToken.length, ")");

await testUnauthenticated();

const prevQuota = await rewindImageQuota(uid);
console.log("Quota rewound (prev:", prevQuota ? `${prevQuota.count} used` : "none", ")");

await testAuthenticated(idToken);

// ─── Optional cleanup: delete the test image from Storage ────────────────
// We leave it in place — it's < 100 KB and lives under the founder's tree
// where the regular UI would also store generations.

console.log("\nAll checks passed.");
process.exit(0);
