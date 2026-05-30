import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

const sa = JSON.parse(fs.readFileSync(path.join(process.cwd(), "service-account.json"), "utf-8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const TARGETS = [
  "emilien.nepveu@gmail.com",
  "maubertcome27@gmail.com",
  "contact@breque-ue-watches.com",
  "cerisecottier@gmail.com",
  "2jsh.immo@gmail.com",
  "sexotherapiebychris@gmail.com",
  "sandrarobidet@gmail.com",
  "cynthiabordy@gmail.com",
  "marie.sarria77@gmail.com",
  "zoulikha.sophrologie@gmail.com",
  "aurelieanicet@gmail.com",
  "bibi42@gmail.com",
];

console.log("=== A. SCAN COMPLET — tous les docs users ===\n");
const all = await db.collection("users").get();
console.log(`Total docs: ${all.size}\n`);

const byEmail = new Map();
let noCreatedAt = 0;
all.forEach((doc) => {
  const d = doc.data();
  const email = (d.email || "").toLowerCase();
  if (email) byEmail.set(email, { id: doc.id, hasCreatedAt: !!d.createdAt, data: d });
  if (!d.createdAt) noCreatedAt++;
});
console.log(`Docs sans createdAt: ${noCreatedAt} (exclus de orderBy('createdAt'))\n`);

console.log("=== B. PRESENCE DES EMAILS GIFT/FOUNDER ===\n");
for (const email of TARGETS) {
  const found = byEmail.get(email.toLowerCase());
  if (!found) {
    console.log(`  ❌ ${email}  →  AUCUN doc Firestore`);
  } else {
    const tag = found.hasCreatedAt ? "✅ avec createdAt" : "⚠️  SANS createdAt (admin l'exclut)";
    console.log(`  ✓  ${email}  →  ${found.id}  ${tag}`);
  }
}

console.log("\n=== C. QUERY EXACT DE L'ADMIN ROUTE (orderBy createdAt desc, limit 100) ===\n");
const adminSnap = await db.collection("users").orderBy("createdAt", "desc").limit(100).get();
console.log(`Renvoyés par la requête admin: ${adminSnap.size}\n`);

const adminEmails = new Set();
adminSnap.forEach((d) => adminEmails.add((d.data().email || "").toLowerCase()));

for (const email of TARGETS) {
  const found = byEmail.get(email.toLowerCase());
  if (!found) continue;
  const inAdmin = adminEmails.has(email.toLowerCase());
  console.log(`  ${inAdmin ? "✓ visible" : "❌ MANQUANT"}   ${email}`);
}

process.exit(0);
