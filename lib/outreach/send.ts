/**
 * Cold outreach — the transport (SMTP).
 *
 * Plain SMTP from a real mailbox, on purpose. At the volume this system is
 * built for — a couple of dozen genuinely personalised messages a day — a real
 * mailbox is both the most deliverable and the most honest channel: the message
 * arrives from an address a human actually reads, replies land in a real inbox,
 * and there is no ESP in the middle stamping the headers of a marketing send.
 *
 * The provider is isolated behind `sendRawEmail`. Swapping Gmail for Infomaniak,
 * OVH, Fastmail or an ESP means changing environment variables, not code.
 */

import nodemailer, { type Transporter } from "nodemailer";

export interface SendResult {
  ok: boolean;
  providerId: string | null;
  error: string | null;
}

/**
 * How a recipient opts out.
 *
 *   reply — "répondez stop", plus a mailto List-Unsubscribe header. Needs no page,
 *           so it works from day one. The default.
 *   link  — a signed link to /desabonnement. Only once that page is deployed on
 *           OUTREACH_PUBLIC_URL; a link to a page that does not exist is worse
 *           than no link, because the recipient believes they are unsubscribed.
 */
export type UnsubscribeMode = "reply" | "link";

export function readUnsubscribeMode(): UnsubscribeMode {
  return process.env.OUTREACH_UNSUBSCRIBE_MODE?.trim().toLowerCase() === "link" ? "link" : "reply";
}

export interface OutreachConfig {
  unsubscribeMode: UnsubscribeMode;
  host: string;
  port: number;
  /** Implicit TLS on 465; STARTTLS on 587. */
  secure: boolean;
  user: string;
  password: string;
  /** Header sender, e.g. `Emilien de Posty <postygroup@gmail.com>`. */
  from: string;
  /** Where replies land. */
  replyTo: string;
  senderName: string;
  senderRole: string;
  baseUrl: string;
}

/** Reads the environment once and reports precisely what is missing. */
export function getOutreachConfig():
  | { ok: true; config: OutreachConfig }
  | { ok: false; missing: string[] } {
  const missing: string[] = [];

  const user = process.env.SMTP_USER?.trim();
  if (!user) missing.push("SMTP_USER");

  const password = process.env.SMTP_PASSWORD?.trim();
  if (!password) missing.push("SMTP_PASSWORD");

  if (missing.length > 0) return { ok: false, missing };

  // Gmail is the default because it is what Posty already uses publicly, but
  // nothing here is Gmail-specific.
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const senderName = process.env.OUTREACH_SENDER_NAME?.trim() || "Emilien";
  const senderRole = process.env.OUTREACH_SENDER_ROLE?.trim() || "Cofondateur";
  const from = process.env.OUTREACH_FROM_EMAIL?.trim() || `${senderName} <${user}>`;
  const replyTo = process.env.OUTREACH_REPLY_TO?.trim() || user!;

  // The unsubscribe link is opened by the recipient, on their own machine, so it
  // must never inherit NEXT_PUBLIC_BASE_URL: in local dev — which is where
  // campaigns are run from — that is http://localhost:3000, and every message
  // would carry an opt-out link that cannot work for anyone.
  const baseUrl = (process.env.OUTREACH_PUBLIC_URL?.trim() || "https://postyapp.ai").replace(
    /\/+$/,
    ""
  );
  const unsubscribeMode = readUnsubscribeMode();
  if (unsubscribeMode === "link" && !isPublicHttpsUrl(baseUrl)) {
    return {
      ok: false,
      missing: [
        `OUTREACH_PUBLIC_URL doit être une URL https publique (actuellement « ${baseUrl} »)`,
      ],
    };
  }

  return {
    ok: true,
    config: {
      unsubscribeMode,
      host,
      port,
      secure: port === 465,
      user: user!,
      password: password!,
      from,
      replyTo,
      senderName,
      senderRole,
      baseUrl,
    },
  };
}

/** True only for an https URL that a stranger's browser could actually reach. */
export function isPublicHttpsUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return !(
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

/**
 * One pooled connection for a whole campaign run. Without the pool, nodemailer
 * opens and tears down a TLS session per message — slower, and a burst of
 * connections is exactly the pattern providers throttle.
 */
let cachedTransporter: Transporter | null = null;
let cachedKey = "";

function getTransporter(config: OutreachConfig): Transporter {
  const key = `${config.host}:${config.port}:${config.user}`;
  if (cachedTransporter && cachedKey === key) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
    pool: true,
    maxConnections: 1,
    // One message at a time: this is prospection, not a newsletter blast.
    maxMessages: 50,
  });
  cachedKey = key;
  return cachedTransporter;
}

/** Opens a connection and authenticates without sending — the "test" button. */
export async function verifyConnection(config: OutreachConfig): Promise<SendResult> {
  try {
    await getTransporter(config).verify();
    return { ok: true, providerId: null, error: null };
  } catch (error) {
    return { ok: false, providerId: null, error: describeSmtpError(error) };
  }
}

/**
 * Turns nodemailer's terse errors into something actionable, because the two
 * failures you will actually hit both look cryptic by default.
 */
function describeSmtpError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid login|username and password not accepted|535/i.test(message)) {
    return "Authentification refusée. Avec Gmail, il faut un mot de passe d'application (16 caractères), pas le mot de passe du compte — et la validation en deux étapes doit être active.";
  }
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(message)) {
    return `Connexion au serveur SMTP impossible (${message}). Vérifiez SMTP_HOST et SMTP_PORT.`;
  }
  if (/limit|quota|rate/i.test(message)) {
    return `Quota d'envoi atteint chez le fournisseur : ${message}`;
  }
  return message.slice(0, 300);
}

/**
 * RFC 5322 is far looser than this, but for outbound prospection a strict,
 * boring check is the right trade: a malformed address costs a bounce, and
 * bounces cost sender reputation.
 */
const EMAIL_PATTERN = /^[^\s@,;<>()[\]]+@[^\s@,;<>()[\]]+\.[a-zA-Z]{2,}$/;

export function isSendableEmail(email: string): boolean {
  const value = (email || "").trim();
  if (!value || value.length > 254) return false;
  if (!EMAIL_PATTERN.test(value)) return false;
  // Role addresses are a deliverability trap and rarely reach a decision maker.
  const local = value.split("@")[0].toLowerCase();
  return !["noreply", "no-reply", "donotreply", "postmaster", "abuse"].includes(local);
}

/** Normalised form used everywhere as the deduplication and suppression key. */
export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

/**
 * Gives Gmail and Outlook their native "unsubscribe" button. Honouring it is
 * what keeps complaints — the metric that actually kills a sender — near zero.
 *
 * The mailto form is always offered: it lands in the mailbox as a "stop" and
 * needs no page. `List-Unsubscribe-Post` (RFC 8058 one-click) is added only
 * alongside an https link, because that RFC forbids it without one.
 */
export function listUnsubscribeHeaders(
  replyTo: string,
  unsubscribeUrl: string | null
): Record<string, string> {
  const address = replyTo.match(/<([^>]+)>/)?.[1] ?? replyTo;
  const mailto = `<mailto:${address.trim()}?subject=stop>`;
  if (!unsubscribeUrl) return { "List-Unsubscribe": mailto };
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>, ${mailto}`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export async function sendRawEmail(
  config: OutreachConfig,
  to: string,
  subject: string,
  text: string,
  /** null in "reply" mode — see UnsubscribeMode. */
  unsubscribeUrl: string | null = null
): Promise<SendResult> {
  try {
    const info = await getTransporter(config).sendMail({
      from: config.from,
      to,
      replyTo: config.replyTo,
      subject,
      // Text only, deliberately. An HTML twin is one of the clearest signals
      // that a message came from a campaign tool rather than a person.
      text,
      headers: listUnsubscribeHeaders(config.replyTo, unsubscribeUrl),
    });

    return { ok: true, providerId: info.messageId ?? null, error: null };
  } catch (error) {
    return { ok: false, providerId: null, error: describeSmtpError(error) };
  }
}

/**
 * Signed opt-out link. The token is an HMAC of the address, so the endpoint can
 * honour an unsubscribe without a database lookup and nobody can opt a third
 * party out by guessing a URL.
 */
export async function buildUnsubscribeUrl(
  baseUrl: string,
  email: string
): Promise<string> {
  const token = await signEmail(email);
  const query = new URLSearchParams({ e: normalizeEmail(email), t: token });
  return `${baseUrl}/desabonnement?${query.toString()}`;
}

export async function signEmail(email: string): Promise<string> {
  const secret =
    process.env.OUTREACH_UNSUBSCRIBE_SECRET?.trim() ||
    process.env.TOKEN_ENCRYPTION_KEY?.trim() ||
    "";
  const data = new TextEncoder().encode(normalizeEmail(email));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret || "posty-outreach-fallback"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, data);
  return Array.from(new Uint8Array(signature))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyEmailToken(email: string, token: string): Promise<boolean> {
  const expected = await signEmail(email);
  if (expected.length !== token.length) return false;
  // Constant-time comparison — a timing oracle here would leak the secret.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}
