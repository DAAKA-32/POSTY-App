// Quick sanity check on the stock-photo provider keys.
// Loads .env.local, hits both Unsplash and Pexels search endpoints with
// a single concrete query, and prints what comes back. No app code involved
// — pure HTTP — so we can isolate "are the keys good?" from any Next/build
// caching weirdness.

import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
try {
  const raw = readFileSync(path.join(ROOT, ".env.local"), "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
} catch { /* ignore */ }

const QUERY = "modern startup office laptop";

console.log("\n── Unsplash ─────────────────────────────────────────────────");
const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
if (!unsplashKey) {
  console.log("  ✗ UNSPLASH_ACCESS_KEY missing");
} else {
  const u = new URLSearchParams({ query: QUERY, per_page: "3", orientation: "squarish", content_filter: "high" });
  const t0 = Date.now();
  const res = await fetch(`https://api.unsplash.com/search/photos?${u.toString()}`, {
    headers: { Authorization: `Client-ID ${unsplashKey}`, "Accept-Version": "v1" },
  });
  const elapsed = Date.now() - t0;
  console.log(`  HTTP ${res.status} in ${elapsed}ms`);
  if (res.ok) {
    const data = await res.json();
    const hits = data.results?.length ?? 0;
    console.log(`  ${hits > 0 ? "✓" : "✗"} ${hits} results`);
    if (hits > 0) {
      const first = data.results[0];
      console.log(`     photo: "${first.alt_description ?? first.description ?? "(no description)"}"`);
      console.log(`     by:    ${first.user.name} (@${first.user.username})`);
      console.log(`     url:   ${first.urls.regular.slice(0, 90)}…`);
    }
  } else {
    const body = await res.text();
    console.log(`  body: ${body.slice(0, 200)}`);
  }
}

console.log("\n── Pexels ──────────────────────────────────────────────────");
const pexelsKey = process.env.PEXELS_API_KEY;
if (!pexelsKey) {
  console.log("  ✗ PEXELS_API_KEY missing");
} else {
  const p = new URLSearchParams({ query: QUERY, per_page: "3", orientation: "square" });
  const t0 = Date.now();
  const res = await fetch(`https://api.pexels.com/v1/search?${p.toString()}`, {
    headers: { Authorization: pexelsKey },
  });
  const elapsed = Date.now() - t0;
  console.log(`  HTTP ${res.status} in ${elapsed}ms`);
  if (res.ok) {
    const data = await res.json();
    const hits = data.photos?.length ?? 0;
    console.log(`  ${hits > 0 ? "✓" : "✗"} ${hits} results`);
    if (hits > 0) {
      const first = data.photos[0];
      console.log(`     photo: "${first.alt ?? "(no alt)"}"`);
      console.log(`     by:    ${first.photographer}`);
      console.log(`     url:   ${first.src.large.slice(0, 90)}…`);
    }
  } else {
    const body = await res.text();
    console.log(`  body: ${body.slice(0, 200)}`);
  }
}

console.log();
