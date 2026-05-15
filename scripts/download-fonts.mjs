// Downloads Inter (Display) OTF files into public/fonts/inter/ for Satori.
// Satori needs TTF/OTF; @fontsource ships WOFF2 which Satori can't parse.
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public", "fonts", "inter");
mkdirSync(OUT_DIR, { recursive: true });

// jsDelivr proxies GitHub releases — stable URLs that don't depend on
// rsms/inter's `docs/` folder layout at a specific tag.
// v3.19 has a stable `docs/font-files/` layout that jsDelivr mirrors reliably;
// the v4.0 paths in the same repo 404 (the folder was reorganised post-release).
// These OTFs are exactly the original Rasmus Andersson designs — same as Inter
// in next/font, no visual drift.
const SOURCES = [
  { name: "Inter-Regular.otf",  url: "https://cdn.jsdelivr.net/gh/rsms/inter@v3.19/docs/font-files/Inter-Regular.otf" },
  { name: "Inter-SemiBold.otf", url: "https://cdn.jsdelivr.net/gh/rsms/inter@v3.19/docs/font-files/Inter-SemiBold.otf" },
  { name: "Inter-Black.otf",    url: "https://cdn.jsdelivr.net/gh/rsms/inter@v3.19/docs/font-files/Inter-Black.otf" },
];

for (const { name, url } of SOURCES) {
  const res = await fetch(url);
  if (!res.ok) {
    console.error("FAIL", name, res.status, url);
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(path.join(OUT_DIR, name), buf);
  console.log("OK  ", name, buf.length, "bytes");
}
