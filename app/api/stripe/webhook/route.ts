import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripeServer, STRIPE_WEBHOOK_EVENTS } from "@/lib/stripe";
import { SubscriptionPlan } from "@/types";

// Import Firebase Admin for server-side operations
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Route segment config for Next.js 16+
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Initialize Firebase Admin (only once)
function getFirebaseAdmin() {
  if (getApps().length === 0) {
    // In production, use service account credentials
    // For development, you can use environment variables
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccount) {
      const parsedServiceAccount = JSON.parse(serviceAccount);
      initializeApp({
        credential: cert(parsedServiceAccount),
      });
    } else {
      // Fallback for development - requires GOOGLE_APPLICATION_CREDENTIALS env var
      initializeApp();
    }
  }
  return getFirestore();
}

// Map Stripe price IDs to plan names
function getPlanFromPriceId(priceId: string): SubscriptionPlan {
  const proMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY;
  const proYearly = process.env.STRIPE_PRICE_PRO_YEARLY;
  const maxMonthly = process.env.STRIPE_PRICE_MAX_MONTHLY;
  const maxYearly = process.env.STRIPE_PRICE_MAX_YEARLY;

  if (priceId === proMonthly || priceId === proYearly) {
    return "pro";
  }
  if (priceId === maxMonthly || priceId === maxYearly) {
    return "max";
  }
  return "free";
}

// Update user subscription in Firebase
async function updateUserSubscription(
  userId: string,
  data: {
    plan: SubscriptionPlan;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    status?: string;
    currentPeriodEnd?: Date;
  }
) {
  const db = getFirebaseAdmin();
  const userRef = db.collection("users").doc(userId);

  const updateData: Record<string, unknown> = {
    "subscription.plan": data.plan,
    "subscription.subscribedAt": Timestamp.now(),
  };

  if (data.stripeCustomerId) {
    updateData["subscription.stripeCustomerId"] = data.stripeCustomerId;
  }
  if (data.stripeSubscriptionId) {
    updateData["subscription.stripeSubscriptionId"] = data.stripeSubscriptionId;
  }
  if (data.status) {
    updateData["subscription.status"] = data.status;
  }
  if (data.currentPeriodEnd) {
    updateData["subscription.expiresAt"] = Timestamp.fromDate(data.currentPeriodEnd);
  }

  await userRef.update(updateData);
}

// Save payment history
async function savePaymentHistory(
  userId: string,
  payment: {
    stripePaymentId: string;
    amount: number;
    currency: string;
    status: string;
    description?: string;
    invoiceUrl?: string;
  }
) {
  const db = getFirebaseAdmin();
  const paymentsRef = db.collection("payments");

  await paymentsRef.add({
    userId,
    ...payment,
    createdAt: Timestamp.now(),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripeServer();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const error = err as Error;
    console.error("Webhook signature verification failed:", error.message);
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case STRIPE_WEBHOOK_EVENTS.CHECKOUT_COMPLETED: {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;

        if (!userId) {
          console.error("No userId found in checkout session");
          break;
        }

        const stripe = getStripeServer();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        ) as any;

        const priceId = subscription.items?.data?.[0]?.price?.id;
        const plan = getPlanFromPriceId(priceId || "");

        await updateUserSubscription(userId, {
          plan,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : undefined,
        });

        console.log(`Checkout completed for user ${userId}, plan: ${plan}`);
        break;
      }

      case STRIPE_WEBHOOK_EVENTS.SUBSCRIPTION_UPDATED: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.userId;

        if (!userId) {
          console.error("No userId found in subscription metadata");
          break;
        }

        const priceId = subscription.items?.data?.[0]?.price?.id;
        const plan = getPlanFromPriceId(priceId || "");

        await updateUserSubscription(userId, {
          plan,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : undefined,
        });

        console.log(`Subscription updated for user ${userId}, plan: ${plan}`);
        break;
      }

      case STRIPE_WEBHOOK_EVENTS.SUBSCRIPTION_DELETED: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.userId;

        if (!userId) {
          console.error("No userId found in subscription metadata");
          break;
        }

        // Downgrade to free plan
        await updateUserSubscription(userId, {
          plan: "free",
          status: "canceled",
        });

        console.log(`Subscription canceled for user ${userId}, downgraded to free`);
        break;
      }

      case STRIPE_WEBHOOK_EVENTS.INVOICE_PAID: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const stripe = getStripeServer();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        const userId = subscription.metadata?.userId;

        if (!userId) break;

        await savePaymentHistory(userId, {
          stripePaymentId: invoice.payment_intent || invoice.id,
          amount: invoice.amount_paid || 0,
          currency: invoice.currency || "eur",
          status: "succeeded",
          description: invoice.description || `Subscription payment`,
          invoiceUrl: invoice.hosted_invoice_url || undefined,
        });

        console.log(`Invoice paid for user ${userId}`);
        break;
      }

      case STRIPE_WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const stripe = getStripeServer();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        const userId = subscription.metadata?.userId;

        if (!userId) break;

        await savePaymentHistory(userId, {
          stripePaymentId: invoice.payment_intent || invoice.id,
          amount: invoice.amount_due || 0,
          currency: invoice.currency || "eur",
          status: "failed",
          description: `Payment failed: ${invoice.description || "Subscription payment"}`,
        });

        console.log(`Invoice payment failed for user ${userId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
