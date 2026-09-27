#!/usr/bin/env node
/**
 * Predeploy guard for Cloud Functions (wired in firebase.json).
 *
 * firebase-tools builds the functions' runtime environment from
 * functions/.env, functions/.env.<projectId> and functions/.env.<alias>.
 * A deploy missing TOKEN_ENCRYPTION_KEY ships a scheduler that cannot
 * decrypt any OAuth token — every scheduled post then fails (incident
 * 2026-09). This script aborts such a deploy before anything is uploaded.
 *
 * Values are never printed. Exit code 2 = deploy aborted (not 1: on Windows,
 * firebase-tools' cross-spawn reports any exit code 1 of a shell hook as a
 * misleading "spawn … ENOENT").
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const FUNCTIONS_DIR = path.resolve(path.dirname(SCRIPT_PATH), "..");
const projectId = process.env.GCLOUD_PROJECT || process.argv[2] || "";

/** Minimal dotenv parser (KEY=value, # comments, optional surrounding quotes). */
export function parseDotenv(text) {
  const out = {};
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).replace(/^﻿/, "").trim();
    let value = line.slice(eq + 1);
    const unquoted = value.trim();
    if (
      unquoted.length >= 2 &&
      ((unquoted.startsWith('"') && unquoted.endsWith('"')) || (unquoted.startsWith("'") && unquoted.endsWith("'")))
    ) {
      value = unquoted.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadEnv() {
  const candidates = [".env", projectId ? `.env.${projectId}` : null, ".env.default"].filter(Boolean);
  const env = {};
  const loaded = [];
  for (const name of candidates) {
    const file = path.join(FUNCTIONS_DIR, name);
    if (!fs.existsSync(file)) continue;
    Object.assign(env, parseDotenv(fs.readFileSync(file, "utf8")));
    loaded.push(name);
  }
  return { env, loaded };
}

/** Pure validation — exported for tests. */
export function checkEnv(env) {
  const errors = [];
  const warnings = [];

  const key = env.TOKEN_ENCRYPTION_KEY;
  if (key === undefined || key.trim() === "") {
    errors.push(
      "TOKEN_ENCRYPTION_KEY is missing. Copy the EXACT value used by the Next.js app (Vercel env) — " +
        "without it the scheduler cannot decrypt any OAuth token and every scheduled post fails.",
    );
  } else {
    if (/^﻿/.test(key) || key !== key.trim()) {
      errors.push("TOKEN_ENCRYPTION_KEY contains a BOM or surrounding whitespace — rewrite the file as UTF-8 without BOM.");
    }
    const bytes = Buffer.from(key.trim(), "base64");
    if (bytes.length !== 32 || !/^[A-Za-z0-9+/]+={0,2}$/.test(key.trim())) {
      errors.push("TOKEN_ENCRYPTION_KEY must be the base64 encoding of exactly 32 bytes (openssl rand -base64 32).");
    }
  }

  for (const [name, value] of Object.entries(env)) {
    if (typeof value === "string" && /^﻿/.test(value)) {
      errors.push(`${name} starts with a BOM (U+FEFF) — it would corrupt HTTP headers. Rewrite the file without BOM.`);
    }
  }

  if (!env.ZERNIO_API_KEY || !env.ZERNIO_API_KEY.trim()) {
    warnings.push("ZERNIO_API_KEY is missing — scheduled X / Instagram / Reddit / Threads (Zernio) posts will fail.");
  }
  if (env.SEED_COMMENT_AUTOPOST === undefined) {
    warnings.push('SEED_COMMENT_AUTOPOST is not set — queued seed comments will NOT be posted (set "true" to enable).');
  }
  if (!env.POSTY_APP_URL || !env.CRON_SECRET) {
    warnings.push("POSTY_APP_URL / CRON_SECRET missing — the daily autonomous Strategist run will be skipped.");
  }
  return { errors, warnings };
}

function main() {
  const { env, loaded } = loadEnv();
  const { errors, warnings } = checkEnv(env);
  const where = loaded.length ? loaded.map((f) => `functions/${f}`).join(", ") : "(no functions/.env* file found)";

  for (const w of warnings) console.warn(`⚠  [functions env] ${w}`);
  if (errors.length > 0) {
    console.error(`\n✖ Cloud Functions deploy aborted — invalid runtime environment (${where}):`);
    for (const e of errors) console.error(`   - ${e}`);
    console.error(
      `\n  Fix: add the variables to functions/.env.${projectId || "<projectId>"} (see functions/.env.example), then redeploy.\n`,
    );
    process.exit(2);
  }
  console.log(`✔ [functions env] runtime environment OK (${where})`);
}

// Run only when executed directly (the tests import the pure functions).
if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) main();
