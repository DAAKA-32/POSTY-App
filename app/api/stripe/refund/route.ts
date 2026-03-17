import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getStripeServer } from "@/lib/config/stripe";
import { GUARANTEE_PERIOD_DAYS } from "@/lib/config/plans";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    // Verify Firebase auth token
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { userId: bodyUserId } = body as { userId: string };
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    if (!isAdminInitialized() || !adminDb) {
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }

    // Get user data
    const userDoc = await adminDb.collection("users").doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    if (!userData?.subscription) {
      return NextResponse.json(
        { error: "Aucun abonnement trouvé." },
        { status: 404 }
      );
    }

    const { subscription } = userData;

    // Check if already refunded
    if (subscription.refundRequested) {
      return NextResponse.json(
        { error: "Une demande de remboursement a déjà été effectuée." },
        { status: 400 }
      );
    }

    // Check if user has a Stripe subscription
    if (!subscription.stripeSubscriptionId || !subscription.stripeCustomerId) {
      return NextResponse.json(
        { error: "Aucun abonnement Stripe trouvé." },
        { status: 400 }
      );
    }

    // Check guarantee eligibility: must have firstPaymentDate within GUARANTEE_PERIOD_DAYS
    const firstPaymentDate = subscription.firstPaymentDate?.toDate?.();
    if (!firstPaymentDate) {
      return NextResponse.json(
        { error: "Aucun paiement trouvé. Vous êtes peut-être encore en période d'essai." },
        { status: 400 }
      );
    }

    const guaranteeEndDate = new Date(
      firstPaymentDate.getTime() + GUARANTEE_PERIOD_DAYS * 24 * 60 * 60 * 1000
    );
    const now = new Date();

    if (now > guaranteeEndDate) {
      return NextResponse.json(
        {
          error: "refund_period_expired",
          message: `La période de garantie de ${GUARANTEE_PERIOD_DAYS} jours est expirée. Vous pouvez annuler votre abonnement depuis les paramètres.`,
        },
        { status: 400 }
      );
    }

    const stripe = getStripeServer();

    // Find the latest paid invoice for this subscription
    const invoices = await stripe.invoices.list({
      subscription: subscription.stripeSubscriptionId,
      status: "paid",
      limit: 1,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const latestInvoice = invoices.data[0] as any;

    if (!latestInvoice || !latestInvoice.payment_intent) {
      return NextResponse.json(
        { error: "Aucun paiement remboursable trouvé." },
        { status: 400 }
      );
    }

    // Create Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: latestInvoice.payment_intent as string,
      reason: "requested_by_customer",
    });

    // Cancel the subscription immediately
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

    // Update user in Firestore: downgrade to free plan immediately
    await adminDb.collection("users").doc(userId).update({
      "subscription.plan": "free",
      "subscription.refundRequested": true,
      "subscription.refundRequestedAt": Timestamp.now(),
      "subscription.status": "canceled",
    });

    // Save refund in payments collection
    await adminDb.collection("payments").add({
      userId,
      type: "refund",
      stripeRefundId: refund.id,
      stripePaymentId: latestInvoice.payment_intent,
      amount: -(refund.amount || 0),
      currency: refund.currency || "eur",
      status: refund.status,
      reason: "guarantee_refund",
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      message: "Remboursement effectué avec succès. Votre abonnement a été annulé.",
      refundId: refund.id,
      amount: refund.amount,
      currency: refund.currency,
    });
  } catch (error) {
    console.error("Refund error:", error);
    return NextResponse.json(
      { error: "Erreur lors du remboursement. Veuillez contacter le support." },
      { status: 500 }
    );
  }
}
