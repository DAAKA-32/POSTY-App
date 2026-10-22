/**
 * Cold outreach — shared types.
 *
 * The whole surface is admin-only: prospects live in Firestore collections that
 * the security rules deny to every client (default-deny at the bottom of
 * firestore.rules), so they are reachable exclusively through `/api/admin/*`
 * routes behind `requireAdmin()`.
 */

/** Where a prospect stands in the pipeline. Mirrors the CSV `Statut` column. */
export type ProspectStatus =
  | "a_contacter"
  | "contacte"
  | "en_conversation"
  | "rdv"
  | "qualifie"
  | "gagne"
  | "perdu";

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  a_contacter: "À contacter",
  contacte: "Contacté",
  en_conversation: "En conversation",
  rdv: "RDV planifié",
  qualifie: "Qualifié",
  gagne: "Closed Won",
  perdu: "Closed Lost",
};

export interface Prospect {
  id: string;
  /** Always stored lowercased and trimmed — it is the deduplication key. */
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  role: string;
  sector: string;
  website: string;
  linkedin: string;
  location: string;
  companySize: string;
  notes: string;
  source: string;
  status: ProspectStatus;
  createdAt: number;
  /** Set the first time an email actually leaves for this prospect. */
  lastContactedAt: number | null;
  emailsSentCount: number;
  /** Set when the prospect opts out. Suppression is also mirrored in its own
   *  collection so a re-import can never resurrect an unsubscribed address. */
  unsubscribedAt: number | null;
  bouncedAt: number | null;
  lastError: string | null;
}

export type SendStatus = "sent" | "failed" | "skipped";

export interface EmailSend {
  id: string;
  prospectId: string;
  email: string;
  campaignId: string;
  subject: string;
  body: string;
  variantId: string;
  status: SendStatus;
  /** Provider-side message id, when the send succeeded. */
  providerId: string | null;
  error: string | null;
  /** Why the prospect was skipped, when status === "skipped". */
  skipReason: string | null;
  createdAt: number;
}

/** Reasons an address is permanently excluded from every future campaign. */
export type SuppressionReason = "unsubscribed" | "bounced" | "manual";

export interface Suppression {
  email: string;
  reason: SuppressionReason;
  createdAt: number;
}

/** A rendered, ready-to-send email plus everything needed to audit it. */
export interface RenderedEmail {
  subject: string;
  /** Plain text. The whole point is that it should not look like a newsletter. */
  text: string;
  variantId: string;
  /** Non-blocking observations (e.g. "no first name, generic opener used"). */
  warnings: string[];
}
