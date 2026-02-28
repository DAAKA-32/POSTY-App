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
// Note: Old env vars (STARTER) map to new "pro" plan, old PRO maps to new "max"
// Returns null if the price ID doesn't match any known plan
function getPlanFromPriceId(priceId: string): SubscriptionPlan | null {
  // PRO plan price IDs (new naming or legacy STARTER naming)
  const proMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY || process.env.STRIPE_PRICE_STARTER_MONTHLY;
  const proYearly = process.env.STRIPE_PRICE_PRO_YEARLY || process.env.STRIPE_PRICE_STARTER_YEARLY;
  // MAX plan price IDs (new naming or legacy PRO naming)
  const maxMonthly = process.env.STRIPE_PRICE_MAX_MONTHLY;
  const maxYearly = process.env.STRIPE_PRICE_MAX_YEARLY;
  // Legacy PRO env vars (now MAX) - fallback
  const legacyProMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY;
  const legacyProYearly = process.env.STRIPE_PRICE_PRO_YEARLY;

  // Check for MAX plan first (highest tier)
  if (priceId === maxMonthly || priceId === maxYearly) {
    return "max";
  }
  // Legacy check: if STRIPE_PRICE_PRO was used for the old "pro" (now "max")
  if ((priceId === legacyProMonthly || priceId === legacyProYearly) &&
      priceId !== proMonthly && priceId !== proYearly) {
    return "max";
  }
  // Check for PRO plan (was "starter")
  if (priceId === proMonthly || priceId === proYearly) {
    return "pro";
  }
  return null;
}

// Update user subscription in Firebase
async function updateUserSubscription(
  userId: string,
  data: {
    plan?: SubscriptionPlan | null;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    status?: string;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    // Trial-specific fields
    trialStart?: Date;
    trialEnd?: Date;
    isTrialStart?: boolean;
  }
) {
  const db = getFirebaseAdmin();
  const userRef = db.collection("users").doc(userId);

  const updateData: Record<string, unknown> = {};

  // Only update plan if explicitly provided (not undefined)
  if (data.plan !== undefined) {
    updateData["subscription.plan"] = data.plan;
  }

  // Only set subscribedAt if not in trial (set when trial ends or direct subscription)
  if (data.status !== "trialing") {
    updateData["subscription.subscribedAt"] = Timestamp.now();
  }

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
  if (data.cancelAtPeriodEnd !== undefined) {
    updateData["subscription.cancelAtPeriodEnd"] = data.cancelAtPeriodEnd;
  }

  // Set welcome modal flag for post-payment display
  updateData["showWelcomeModal"] = true;

  // Handle trial tracking - mark trial as used on first trial start
  if (data.isTrialStart && data.status === "trialing") {
    updateData["subscription.trialUsed"] = true;
    updateData["subscription.trialPlan"] = data.plan;
    if (data.trialStart) {
      updateData["subscription.trialStartedAt"] = Timestamp.fromDate(data.trialStart);
    }
    if (data.trialEnd) {
      updateData["subscription.trialEndsAt"] = Timestamp.fromDate(data.trialEnd);
    }
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

        // Check if this is a trial subscription
        const isTrialing = subscription.status === "trialing";
        const trialStart = subscription.trial_start
          ? new Date(subscription.trial_start * 1000)
          : undefined;
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : undefined;

        await updateUserSubscription(userId, {
          plan,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : undefined,
          // Trial tracking
          isTrialStart: isTrialing,
          trialStart,
          trialEnd,
        });

        console.log(`Checkout completed: plan=${plan}${isTrialing ? " (TRIAL)" : ""}`);
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
          cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
        });

        console.log(`Subscription updated: plan=${plan}, cancelAtPeriodEnd=${!!subscription.cancel_at_period_end}`);
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

        // Downgrade to free plan: subscription is permanently canceled
        await updateUserSubscription(userId, {
          plan: "free" as SubscriptionPlan,
          status: "canceled",
        });

        console.log("Subscription deleted — downgraded to free plan");
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

        const amountPaid = invoice.amount_paid || 0;

        // Only save real payments to history (skip $0 trial invoices)
        if (amountPaid > 0) {
          await savePaymentHistory(userId, {
            stripePaymentId: invoice.payment_intent || invoice.id,
            amount: amountPaid,
            currency: invoice.currency || "eur",
            status: "succeeded",
            description: invoice.description || `Subscription payment`,
            invoiceUrl: invoice.hosted_invoice_url || undefined,
          });

          // Track first real payment date for money-back guarantee eligibility
          const db = getFirebaseAdmin();
          const userRef = db.collection("users").doc(userId);
          const userDoc = await userRef.get();
          const userData = userDoc.data();

          if (!userData?.subscription?.firstPaymentDate) {
            await userRef.update({
              "subscription.firstPaymentDate": Timestamp.now(),
            });
            console.log("First payment tracked - guarantee period started");
          }

          // Update status to active (trial → active transition)
          await updateUserSubscription(userId, {
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : undefined,
          });
        }

        console.log(`Invoice paid (amount: ${amountPaid}${amountPaid === 0 ? " - trial invoice, skipped" : ""})`);
        break;
      }

      case STRIPE_WEBHOOK_EVENTS.SUBSCRIPTION_TRIAL_WILL_END: {
        // Trial ending in 3 days - log for future email notification system
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.userId;

        if (userId) {
          console.log("Trial ending soon (3 days remaining)");
          // TODO: Send trial ending email notification here
          // For now, Stripe's built-in trial ending email handles this
        }
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

        console.log("Invoice payment failed");
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
