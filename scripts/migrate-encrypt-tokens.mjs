#!/usr/bin/env node
// One-shot migration: encrypt plaintext OAuth tokens stored in Firestore
// connection collections to the same AES-256-GCM "enc:v1:" format used at
// runtime by lib/crypto/token-cipher.ts.
//
// Usage:
//   node scripts/migrate-encrypt-tokens.mjs            # DRY RUN (default)
//   node scripts/migrate-encrypt-tokens.mjs --apply    # actually write back
//
// Requires:
//   - service-account.json at repo root (Firebase Admin credentials)
//   - TOKEN_ENCRYPTION_KEY env var (same key used in Vercel + Cloud Functions)
//
// Safe to re-run: docs already in "enc:v1:" format are skipped.

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";
import path from "node:path";
import { randomBytes, createCipheriv } from "node:crypto";

// ─── Inline cipher — keep in sync with lib/crypto/token-cipher.ts ──────────
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const MARKER = "enc:v1:";

function getKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY env var is missing. Set it to the same base64 key used in Vercel + Cloud Functions before running this migration."
    );
  }
  const buf = Buffer.from(raw.trim(), "base64");
  if (buf.length !== KEY_LENGTH) {
    throw new Error(`TOKEN_ENCRYPTION_KEY must decode to exactly ${KEY_LENGTH} bytes (got ${buf.length})`);
  }
  return buf;
}

function isEncrypted(value) {
  return typeof value === "string" && value.startsWith(MARKER);
}

function encryptToken(plaintext, key) {
  if (isEncrypted(plaintext)) return plaintext;
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    MARKER.replace(/:$/, ""),
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

// ─── Collections & sensitive fields ───────────────────────────────────────
// Each entry: collection name + top-level fields to encrypt + optional
// nested array field with per-element encryption (used by Facebook pages).
const COLLECTIONS = [
  { name: "linkedinConnections", fields: ["accessToken"] },
  { name: "blueskyConnections", fields: ["accessJwt", "refreshJwt"] },
  {
    name: "facebookConnections",
    fields: ["accessToken"],
    nestedArray: { field: "pages", elementField: "accessToken" },
  },
  { name: "threadsConnections", fields: ["accessToken"] },
  { name: "mastodonConnections", fields: ["accessToken"] },
  { name: "mastodonApps", fields: ["clientSecret"] },
  { name: "discordConnections", fields: ["webhookUrl"] },
];

// ─── Main ─────────────────────────────────────────────────────────────────
const APPLY = process.argv.includes("--apply");
const MODE = APPLY ? "APPLY (writes will happen)" : "DRY RUN (no writes)";

const key = getKey();

const saPath = path.join(process.cwd(), "service-account.json");
if (!fs.existsSync(saPath)) {
  console.error(`✗ Missing ${saPath}. Place your Firebase service account JSON at repo root.`);
  process.exit(1);
}
const sa = JSON.parse(fs.readFileSync(saPath, "utf-8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

console.log(`\n=== Token Migration — ${MODE} ===\n`);

const totals = {
  scanned: 0,
  alreadyEncrypted: 0,
  encryptedNow: 0,
  emptyOrMissing: 0,
  perCollection: {},
};

for (const col of COLLECTIONS) {
  console.log(`→ Scanning ${col.name}...`);
  const snap = await db.collection(col.name).get();
  const stats = { scanned: 0, alreadyEncrypted: 0, encryptedNow: 0, emptyOrMissing: 0 };

  for (const doc of snap.docs) {
    stats.scanned++;
    totals.scanned++;
    const data = doc.data();
    const patch = {};
    let touched = false;

    for (const field of col.fields) {
      const value = data?.[field];
      if (!value) {
        stats.emptyOrMissing++;
        totals.emptyOrMissing++;
        continue;
      }
      if (isEncrypted(value)) {
        stats.alreadyEncrypted++;
        totals.alreadyEncrypted++;
        continue;
      }
      patch[field] = encryptToken(value, key);
      touched = true;
      stats.encryptedNow++;
      totals.encryptedNow++;
    }

    if (col.nestedArray) {
      const { field, elementField } = col.nestedArray;
      const arr = data?.[field];
      if (Array.isArray(arr) && arr.length > 0) {
        let arrTouched = false;
        const newArr = arr.map((elem) => {
          const v = elem?.[elementField];
          if (!v) return elem;
          if (isEncrypted(v)) return elem;
          arrTouched = true;
          stats.encryptedNow++;
          totals.encryptedNow++;
          return { ...elem, [elementField]: encryptToken(v, key) };
        });
        if (arrTouched) {
          patch[field] = newArr;
          touched = true;
        }
      }
    }

    if (touched) {
      console.log(`  ${doc.id}: encrypting ${Object.keys(patch).join(", ")}`);
      if (APPLY) {
        await doc.ref.update(patch);
      }
    }
  }

  totals.perCollection[col.name] = stats;
  console.log(
    `  → ${col.name}: ${stats.scanned} docs scanned, ${stats.encryptedNow} encrypted, ${stats.alreadyEncrypted} already encrypted, ${stats.emptyOrMissing} empty\n`
  );
}

console.log("=== Summary ===");
console.log(`Mode:               ${MODE}`);
console.log(`Total docs scanned: ${totals.scanned}`);
console.log(`Newly encrypted:    ${totals.encryptedNow}`);
console.log(`Already encrypted:  ${totals.alreadyEncrypted}`);
console.log(`Empty/missing:      ${totals.emptyOrMissing}`);
if (!APPLY) {
  console.log("\nDry run only — no writes performed. Re-run with --apply to commit changes.");
}

process.exit(0);
