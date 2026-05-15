// Smoke test for the image render pipeline. Run with `node scripts/smoke-render.mjs`.
// Confirms: wasm boot, satori, font fetch, PNG output > 0 bytes.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const satori = (await import("satori")).default;
const { Resvg, initWasm } = await import("@resvg/resvg-wasm");

await initWasm(readFileSync(path.join(process.cwd(), "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm")));
console.log("wasm OK");

const fontBuf = readFileSync(path.join(process.cwd(), "public", "fonts", "inter", "Inter-SemiBold.otf"));
console.log("font loaded:", fontBuf.length, "bytes");

const t0 = Date.now();
const svg = await satori(
  {
    type: "div",
    props: {
      style: {
        width: 1080, height: 1080, display: "flex",
        flexDirection: "column", justifyContent: "center", alignItems: "center",
        backgroundImage: "linear-gradient(135deg, #FFF7F3 0%, #FFE8DE 100%)",
        fontFamily: "Inter",
      },
      children: [
        { type: "span", props: { style: { fontSize: 280, fontWeight: 800, color: "#F76B54" }, children: "+312%" } },
        { type: "span", props: { style: { fontSize: 48, color: "#1A1D21", marginTop: 32 }, children: "leads B2B en 6 mois" } },
      ],
    },
  },
  { width: 1080, height: 1080, fonts: [{ name: "Inter", data: fontBuf, weight: 600, style: "normal" }] }
);
console.log("satori →", svg.length, "chars in", Date.now() - t0, "ms");

const t1 = Date.now();
const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1080 }, font: { loadSystemFonts: false } });
const png = resvg.render().asPng();
console.log("resvg →", png.length, "bytes in", Date.now() - t1, "ms");

writeFileSync("c:/tmp/test-render.png", png);
console.log("written to c:/tmp/test-render.png  | total:", Date.now() - t0, "ms");
