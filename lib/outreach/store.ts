/**
 * Cold outreach — Firestore access (server only).
 *
 * Three collections, none of them client-readable: `firestore.rules` ends in a
 * `match /{document=**} { allow read, write: if false }`, so anything not
 * explicitly listed there is denied to every SDK client. These are reached
 * exclusively through `/api/admin/*` routes behind `requireAdmin()`, which is
 * why no rules change was needed to add them.
 *
 *   prospects/{id}          — the base, keyed by a slug of the email
 *   emailSends/{autoId}     — one row per attempt, including skips and failures
 *   emailSuppressions/{id}  — opt-outs and hard bounces, keyed by email slug
 */

import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import { normalizeEmail } from "./send";
import type { EmailSend, Prospect, ProspectStatus, SuppressionReason } from "./types";

export const PROSPECTS = "prospects";
export const EMAIL_SENDS = "emailSends";
export const SUPPRESSIONS = "emailSuppressions";

/**
 * Firestore document ids cannot contain "/" and are awkward with "@" and ".".
 * Deriving the id from the address makes the address itself the uniqueness
 * constraint — a duplicate import overwrites rather than creating a twin.
 */
export function emailToId(email: string): string {
  return normalizeEmail(email).replace(/[^a-z0-9]+/g, "_").slice(0, 480);
}

function db() {
  if (!isAdminInitialized() || !adminDb) {
    throw new Error(
      "Firebase Admin n'est pas initialisé — vérifiez service-account.json ou les variables FIREBASE_*."
    );
  }
  return adminDb;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toMillis" in value) {
    try {
      return (value as { toMillis: () => number }).toMillis();
    } catch {
      return null;
    }
  }
  return null;
}

function rowToProspect(id: string, data: Record<string, unknown>): Prospect {
  const str = (key: string) => (typeof data[key] === "string" ? (data[key] as string) : "");
  return {
    id,
    email: str("email"),
    firstName: str("firstName"),
    lastName: str("lastName"),
    company: str("company"),
    role: str("role"),
    sector: str("sector"),
    website: str("website"),
    linkedin: str("linkedin"),
    location: str("location"),
    companySize: str("companySize"),
    notes: str("notes"),
    source: str("source"),
    status: (str("status") || "a_contacter") as ProspectStatus,
    createdAt: toNumber(data.createdAt) ?? 0,
    lastContactedAt: toNumber(data.lastContactedAt),
    emailsSentCount:
      typeof data.emailsSentCount === "number" ? (data.emailsSentCount as number) : 0,
    unsubscribedAt: toNumber(data.unsubscribedAt),
    bouncedAt: toNumber(data.bouncedAt),
    lastError: typeof data.lastError === "string" ? (data.lastError as string) : null,
  };
}

export async function listProspects(limit = 500): Promise<Prospect[]> {
  const snapshot = await db().collection(PROSPECTS).limit(limit).get();
  const rows = snapshot.docs.map((doc) => rowToProspect(doc.id, doc.data()));
  // Sorted in memory rather than with orderBy: the collection is small, and a
  // composite index would be one more thing to deploy for no benefit.
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getProspect(id: string): Promise<Prospect | null> {
  const doc = await db().collection(PROSPECTS).doc(id).get();
  if (!doc.exists) return null;
  return rowToProspect(doc.id, doc.data() as Record<string, unknown>);
}

export interface ProspectInput {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  role?: string;
  sector?: string;
  website?: string;
  linkedin?: string;
  location?: string;
  companySize?: string;
  notes?: string;
  source?: string;
}

export interface ImportReport {
  created: number;
  updated: number;
  skippedInvalid: number;
  skippedSuppressed: number;
  errors: string[];
}

/**
 * Upserts a batch. Existing prospects keep their pipeline state — an import can
 * enrich a record but must never reset `status`, `lastContactedAt` or the
 * unsubscribe flag, otherwise re-importing a CSV would re-open contacts that
 * were already handled or opted out.
 */
export async function upsertProspects(inputs: ProspectInput[]): Promise<ImportReport> {
  const report: ImportReport = {
    created: 0,
    updated: 0,
    skippedInvalid: 0,
    skippedSuppressed: 0,
    errors: [],
  };

  const suppressed = await listSuppressedEmails();
  const seen = new Set<string>();

  for (const input of inputs) {
    const email = normalizeEmail(input.email);
    if (!email) {
      report.skippedInvalid++;
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);

    if (suppressed.has(email)) {
      report.skippedSuppressed++;
      continue;
    }

    const id = emailToId(email);
    try {
      const ref = db().collection(PROSPECTS).doc(id);
      const existing = await ref.get();

      const enrichment: Record<string, unknown> = {
        email,
        firstName: input.firstName?.trim() ?? "",
        lastName: input.lastName?.trim() ?? "",
        company: input.company?.trim() ?? "",
        role: input.role?.trim() ?? "",
        sector: input.sector?.trim() ?? "",
        website: input.website?.trim() ?? "",
        linkedin: input.linkedin?.trim() ?? "",
        location: input.location?.trim() ?? "",
        companySize: input.companySize?.trim() ?? "",
        notes: input.notes?.trim() ?? "",
        source: input.source?.trim() ?? "import",
      };

      if (existing.exists) {
        // Only fill in blanks; never clobber data already on the record.
        const current = existing.data() as Record<string, unknown>;
        const patch: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(enrichment)) {
          if (typeof value === "string" && value && !current[key]) patch[key] = value;
        }
        if (Object.keys(patch).length > 0) await ref.update(patch);
        report.updated++;
      } else {
        await ref.set({
          ...enrichment,
          status: "a_contacter" as ProspectStatus,
          createdAt: Date.now(),
          lastContactedAt: null,
          emailsSentCount: 0,
          unsubscribedAt: null,
          bouncedAt: null,
          lastError: null,
        });
        report.created++;
      }
    } catch (error) {
      report.errors.push(
        `${email}: ${error instanceof Error ? error.message : "erreur inconnue"}`
      );
    }
  }

  return report;
}

export async function listSuppressedEmails(): Promise<Set<string>> {
  const snapshot = await db().collection(SUPPRESSIONS).get();
  const out = new Set<string>();
  for (const doc of snapshot.docs) {
    const email = doc.get("email");
    if (typeof email === "string") out.add(normalizeEmail(email));
  }
  return out;
}

export async function suppressEmail(
  email: string,
  reason: SuppressionReason
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  const id = emailToId(normalized);

  await db()
    .collection(SUPPRESSIONS)
    .doc(id)
    .set({ email: normalized, reason, createdAt: Date.now() }, { merge: true });

  // Mirror it onto the prospect so the list UI shows the state without a join.
  const prospectRef = db().collection(PROSPECTS).doc(id);
  const prospect = await prospectRef.get();
  if (prospect.exists) {
    await prospectRef.update({
      unsubscribedAt: reason === "unsubscribed" ? Date.now() : prospect.get("unsubscribedAt") ?? null,
      bouncedAt: reason === "bounced" ? Date.now() : prospect.get("bouncedAt") ?? null,
    });
  }
}

export async function recordSend(entry: Omit<EmailSend, "id">): Promise<void> {
  await db().collection(EMAIL_SENDS).add(entry);
}

export async function markProspectContacted(
  prospectId: string,
  previousCount: number
): Promise<void> {
  await db()
    .collection(PROSPECTS)
    .doc(prospectId)
    .update({
      status: "contacte" as ProspectStatus,
      lastContactedAt: Date.now(),
      emailsSentCount: previousCount + 1,
      lastError: null,
    });
}

export async function markProspectFailed(
  prospectId: string,
  error: string
): Promise<void> {
  await db().collection(PROSPECTS).doc(prospectId).update({ lastError: error.slice(0, 500) });
}

export async function listRecentSends(limit = 200): Promise<EmailSend[]> {
  const snapshot = await db().collection(EMAIL_SENDS).limit(limit).get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<EmailSend, "id">) }))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

/** How many messages already left today — the daily cap is enforced on this. */
export async function countSentToday(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const snapshot = await db()
    .collection(EMAIL_SENDS)
    .where("createdAt", ">=", startOfDay.getTime())
    .get();
  return snapshot.docs.filter((doc) => doc.get("status") === "sent").length;
}
