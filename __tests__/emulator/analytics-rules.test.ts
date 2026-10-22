// firestore.rules — analytics_* collections are server-only.
// Executed by the Firestore emulator:
//   firebase emulators:exec --only firestore --project demo-posty "npx vitest run __tests__/emulator --no-file-parallelism"
// Skipped when no emulator is available (plain `npm test`).
//
// Nobody on the client — anonymous, an ordinary signed-in user, or even the
// admin account — may read or write the analytics store directly. The admin
// reads it through /api/admin/analytics/*, which enforces the allowlist.

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { getApps, initializeApp as initAdmin } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";

const HOST = process.env.FIRESTORE_EMULATOR_HOST;
const PROJECT = process.env.GCLOUD_PROJECT || "demo-posty";
const ADMIN_EMAIL = "emilien.nepveu@gmail.com";
const COLLECTIONS = [
  "analytics_events",
  "analytics_visitors",
  "analytics_sessions",
  "analytics_users",
  "analytics_daily",
  "analytics_dims",
  "analytics_admin_audit",
];

vi.setConfig({ testTimeout: 30_000 });

const apps: FirebaseApp[] = [];
function client(uid: string | null, email?: string): Firestore {
  const app = initializeApp({ projectId: PROJECT, apiKey: "demo-key" }, `analytics-${uid ?? "anon"}-${apps.length}`);
  apps.push(app);
  const db = getFirestore(app);
  const [host, port] = HOST!.split(":");
  connectFirestoreEmulator(db, host, Number(port), uid
    ? { mockUserToken: { sub: uid, user_id: uid, ...(email ? { email, email_verified: true } : {}) } as never }
    : undefined);
  return db;
}

describe.skipIf(!HOST)("analytics_* rules", () => {
  beforeAll(async () => {
    if (getApps().length === 0) initAdmin({ projectId: PROJECT });
    const admin = getAdminFirestore();
    for (const c of COLLECTIONS) await admin.collection(c).doc("seed").set({ day: "2026-10-22", n: 1 });
  });

  afterAll(async () => {
    await Promise.all(apps.map((a) => deleteApp(a)));
  });

  const actors: Array<[string, () => Firestore]> = [
    ["anonymous", () => client(null)],
    ["an ordinary signed-in user", () => client("user_1", "someone@example.com")],
    ["the admin account itself", () => client("admin_1", ADMIN_EMAIL)],
  ];

  for (const [who, make] of actors) {
    for (const c of COLLECTIONS) {
      it(`${who} cannot read or write ${c}`, async () => {
        const db = make();
        await expect(getDoc(doc(db, c, "seed"))).rejects.toMatchObject({ code: "permission-denied" });
        await expect(getDocs(collection(db, c))).rejects.toMatchObject({ code: "permission-denied" });
        await expect(setDoc(doc(db, c, "x"), { a: 1 })).rejects.toMatchObject({ code: "permission-denied" });
        await expect(setDoc(doc(db, c, "seed"), { a: 1 })).rejects.toMatchObject({ code: "permission-denied" });
      });
    }
  }

  it("the Admin SDK (server) can still read and write", async () => {
    const admin = getAdminFirestore();
    await admin.collection("analytics_daily").doc("2026-10-23").set({ day: "2026-10-23", pageviews: 1 });
    const snap = await admin.collection("analytics_daily").doc("2026-10-23").get();
    expect(snap.exists).toBe(true);
  });
});
