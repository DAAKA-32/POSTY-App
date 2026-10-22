/**
 * POST /api/admin/outreach/test — check the mailbox before trusting it.
 *
 * Two modes, both admin-only:
 *   { }                  → opens an SMTP connection and authenticates, nothing sent
 *   { to: "me@..." }     → sends one real message to that address
 *
 * The second one exists because the only honest way to know how a prospection
 * email looks and where it lands is to receive it yourself.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  buildUnsubscribeUrl,
  getOutreachConfig,
  isSendableEmail,
  normalizeEmail,
  sendRawEmail,
  verifyConnection,
} from "@/lib/outreach/send";
import { renderEmail } from "@/lib/outreach/templates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const config = getOutreachConfig();
  if (!config.ok) {
    return NextResponse.json(
      { error: `Configuration incomplète : ${config.missing.join(", ")}.` },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { to?: string };
  const to = normalizeEmail(body.to || "");

  // No address: connection check only.
  if (!to) {
    const result = await verifyConnection(config.config);
    return result.ok
      ? NextResponse.json({ ok: true, message: "Connexion SMTP établie et authentifiée." })
      : NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (!isSendableEmail(to)) {
    return NextResponse.json({ error: "Adresse de test invalide." }, { status: 400 });
  }

  // A real message, rendered by the real template, so the test is meaningful.
  const unsubscribeUrl =
    config.config.unsubscribeMode === "link"
      ? await buildUnsubscribeUrl(config.config.baseUrl, to)
      : null;
  const rendered = renderEmail(
    {
      id: "test",
      email: to,
      firstName: "",
      lastName: "",
      company: "",
      sector: "",
      role: "",
    },
    {
      name: config.config.senderName,
      role: config.config.senderRole,
      email: config.config.replyTo,
    },
    unsubscribeUrl
  );

  const outcome = await sendRawEmail(
    config.config,
    to,
    rendered.subject,
    rendered.text,
    unsubscribeUrl
  );

  // Deliberately NOT recorded in emailSends and it does not mark anyone as
  // contacted: a test must never pollute campaign statistics.
  return outcome.ok
    ? NextResponse.json({
        ok: true,
        message: `Message de test envoyé à ${to}. Vérifiez aussi le dossier spam.`,
      })
    : NextResponse.json({ error: outcome.error }, { status: 400 });
}
