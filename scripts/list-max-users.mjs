import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

const sa = JSON.parse(fs.readFileSync(path.join(process.cwd(), "service-account.json"), "utf-8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const all = await db.collection("users").get();
console.log(`Scan complet: ${all.size} utilisateurs au total\n`);

const planCounts = {};
const maxUsers = [];

all.forEach((doc) => {
  const d = doc.data();
  const plan = d.subscription?.plan || d.plan || "(none)";
  planCounts[plan] = (planCounts[plan] || 0) + 1;

  if (plan === "max") {
    maxUsers.push({
      id: doc.id,
      email: d.email || "—",
      displayName: d.displayName || "—",
      status: d.subscription?.status || "—",
      stripeCustomerId: d.subscription?.stripeCustomerId || "—",
      subscribedAt:
        d.subscription?.subscribedAt?.toDate?.()?.toISOString?.()?.slice(0, 10) || "—",
      firstPayment:
        d.subscription?.firstPaymentDate?.toDate?.()?.toISOString?.()?.slice(0, 10) || "—",
      trialEndsAt:
        d.subscription?.trialEndsAt?.toDate?.()?.toISOString?.()?.slice(0, 10) || "—",
    });
  }
});

console.log("Répartition globale des plans:");
for (const [plan, n] of Object.entries(planCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${plan.padEnd(12)} ${n}`);
}

console.log(`\n=== ${maxUsers.length} utilisateurs avec le plan MAX ===\n`);
maxUsers.sort((a, b) => (b.subscribedAt || "").localeCompare(a.subscribedAt || ""));
console.table(maxUsers);

process.exit(0);
