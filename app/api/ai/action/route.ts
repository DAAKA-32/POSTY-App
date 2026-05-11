import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/db/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/auth";

/**
 * Schema-validated body for /api/ai/action.
 *
 * Discriminated union on `actionType` so each branch only accepts the fields
 * it actually needs. Adding new actions = add a new variant here, the route
 * handler narrows automatically via the discriminant.
 *
 * Caps (content 10k, title 200) bound prompt-injection / DoS-by-payload
 * regardless of plan.
 */
const RequestSchema = z.discriminatedUnion("actionType", [
  z.object({
    actionType: z.literal("schedule_post"),
    params: z.object({
      content: z.string().min(1).max(10_000),
      scheduledAt: z.string().min(1),
      platform: z.string().min(1).max(40),
      postId: z.string().max(128).optional(),
      timezone: z.string().max(64).optional(),
      title: z.string().max(200).optional(),
    }),
  }),
  z.object({
    actionType: z.literal("delete_conversation"),
    params: z.object({
      postId: z.string().min(1).max(128),
    }),
  }),
]);

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth.error) return auth.error;
  const { uid } = auth;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { actionType, params } = parsed.data;

  if (!adminDb) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  try {
    switch (actionType) {

      case "schedule_post": {
        const { content, postId, scheduledAt, platform, timezone, title } = params;

        if (!content?.trim()) {
          return NextResponse.json({ error: "Aucun contenu à programmer" }, { status: 400 });
        }
        if (!scheduledAt) {
          return NextResponse.json({ error: "Date de programmation manquante" }, { status: 400 });
        }
        if (!platform) {
          return NextResponse.json({ error: "Plateforme manquante" }, { status: 400 });
        }

        const scheduledDate = new Date(scheduledAt);
        if (isNaN(scheduledDate.getTime())) {
          return NextResponse.json({ error: "Date invalide" }, { status: 400 });
        }
        if (scheduledDate <= new Date()) {
          return NextResponse.json({ error: "La date doit être dans le futur" }, { status: 400 });
        }

        const docRef = await adminDb.collection("scheduledPosts").add({
          userId: uid,
          content: content.trim(),
          postId: postId || null,
          title: title || null,
          scheduledAt: Timestamp.fromDate(scheduledDate),
          timezone: timezone || "Europe/Paris",
          status: "pending",
          platform,
          postType: "feed",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          attemptCount: 0,
          publishedAt: null,
          publishedUrl: null,
          lastAttemptAt: null,
          failureReason: null,
        });

        return NextResponse.json({
          success: true,
          message: "Post programmé avec succès",
          data: { scheduledPostId: docRef.id },
        });
      }

      case "delete_conversation": {
        const { postId } = params;
        if (!postId) {
          return NextResponse.json({ error: "ID de conversation manquant" }, { status: 400 });
        }

        const postRef = adminDb.collection("posts").doc(postId);
        const snap = await postRef.get();

        if (!snap.exists) {
          return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
        }
        if (snap.data()?.userId !== uid) {
          return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }

        await postRef.delete();

        return NextResponse.json({ success: true, message: "Conversation supprimée" });
      }

      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }
  } catch (err) {
    console.error("[api/ai/action]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
