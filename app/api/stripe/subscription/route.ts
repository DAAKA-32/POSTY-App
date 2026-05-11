import { NextRequest, NextResponse } from "next/server";
import { getStripeServer } from "@/lib/config/stripe";
import Stripe from "stripe";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/db/firebase-admin";

/**
 * Returns the authenticated user's Stripe customer/subscription IDs from
 * Firestore. Used to guard against IDOR: a logged-in attacker must not be
 * able to retrieve another user's subscription by passing an arbitrary ID.
 */
async function getOwnedStripeIds(uid: string): Promise<{ customerId: string | null; subscriptionId: string | null }> {
  if (!adminDb) return { customerId: null, subscriptionId: null };
  const snap = await adminDb.collection("users").doc(uid).get();
  const sub = snap.data()?.subscription as
    | { stripeCustomerId?: string; stripeSubscriptionId?: string }
    | undefined;
  return {
    customerId: sub?.stripeCustomerId ?? null,
    subscriptionId: sub?.stripeSubscriptionId ?? null,
  };
}

// Helper to extract subscription data
function extractSubscriptionData(subscription: Stripe.Subscription) {
  return {
    id: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelAt: subscription.cancel_at,
    canceledAt: subscription.canceled_at,
    currentPeriodStart: (subscription as unknown as { current_period_start?: number }).current_period_start,
    currentPeriodEnd: (subscription as unknown as { current_period_end?: number }).current_period_end,
    startDate: subscription.start_date,
    interval: subscription.items.data[0]?.price?.recurring?.interval || "month",
    priceId: subscription.items.data[0]?.price?.id,
    productId: subscription.items.data[0]?.price?.product,
  };
}

// GET - Fetch subscription details from Stripe
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get("subscriptionId");
    const customerId = searchParams.get("customerId");

    if (!subscriptionId && !customerId) {
      return NextResponse.json(
        { error: "Missing subscriptionId or customerId" },
        { status: 400 }
      );
    }

    // IDOR guard: the IDs in the query string must match what we have stored
    // for THIS user. Without this check, any logged-in user could pass another
    // user's customerId and read their Stripe subscription.
    const owned = await getOwnedStripeIds(auth.uid);
    if (customerId && owned.customerId !== customerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (subscriptionId && owned.subscriptionId !== subscriptionId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stripe = getStripeServer();

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return NextResponse.json(extractSubscriptionData(subscription));
    }

    if (customerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        return NextResponse.json({ subscription: null });
      }

      const subscription = subscriptions.data[0];
      return NextResponse.json(extractSubscriptionData(subscription));
    }

    return NextResponse.json({ subscription: null });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription details" },
      { status: 500 }
    );
  }
}

// POST - Cancel subscription (at period end)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { subscriptionId, action } = body as {
      subscriptionId: string;
      action: "cancel" | "reactivate";
    };

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Missing subscriptionId" },
        { status: 400 }
      );
    }

    // IDOR guard for mutations: ensure the subscription belongs to the caller.
    const owned = await getOwnedStripeIds(auth.uid);
    if (owned.subscriptionId !== subscriptionId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stripe = getStripeServer();

    if (action === "cancel") {
      // Cancel at period end (user keeps access until subscription expires)
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      return NextResponse.json({
        success: true,
        message: "Abonnement annulé. Vous conservez l'accès jusqu'à la fin de la période.",
        cancelAt: (subscription as unknown as { current_period_end?: number }).current_period_end,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    }

    if (action === "reactivate") {
      // Reactivate a canceled subscription (if still within period)
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      return NextResponse.json({
        success: true,
        message: "Abonnement réactivé avec succès.",
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'cancel' or 'reactivate'." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error managing subscription:", error);
    return NextResponse.json(
      { error: "Failed to manage subscription" },
      { status: 500 }
    );
  }
}
