import { NextRequest, NextResponse } from "next/server";
import { getStripeServer, getPriceId, getAppUrl, BillingInterval } from "@/lib/stripe";
import { SubscriptionPlan } from "@/types";
import { adminDb, isAdminInitialized } from "@/lib/firebase-admin";
import { TRIAL_PERIOD_DAYS, checkTrialEligibility } from "@/lib/plans";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      userEmail,
      plan,
      interval = "monthly",
      withTrial = false,
    } = body as {
      userId: string;
      userEmail: string;
      plan: SubscriptionPlan;
      interval?: BillingInterval;
      withTrial?: boolean;
    };

    // Validate required fields
    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: "Missing required fields: userId, userEmail" },
        { status: 400 }
      );
    }

    // Only pro and max plans can be purchased
    if (plan !== "pro" && plan !== "max") {
      return NextResponse.json(
        { error: "Invalid plan. Must be 'pro' or 'max'" },
        { status: 400 }
      );
    }

    const priceId = getPriceId(plan, interval);
    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID not configured for this plan" },
        { status: 500 }
      );
    }

    // Check trial eligibility if trial requested
    let trialEligible = false;
    if (withTrial && isAdminInitialized() && adminDb) {
      try {
        const userDoc = await adminDb.collection("users").doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;
        const eligibility = checkTrialEligibility(userData);
        trialEligible = eligibility.eligible;

        if (!trialEligible) {
          return NextResponse.json(
            {
              error: "trial_not_eligible",
              message: eligibility.reason || "Vous n'êtes pas éligible à l'essai gratuit.",
            },
            { status: 403 }
          );
        }
      } catch (dbError) {
        console.error("Error checking trial eligibility:", dbError);
        // In production, don't allow trial if we can't verify eligibility
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json(
            { error: "Unable to verify trial eligibility" },
            { status: 500 }
          );
        }
      }
    }

    const stripe = getStripeServer();
    const appUrl = getAppUrl();

    // Build subscription data with optional trial
    const subscriptionData: {
      metadata: { userId: string; plan: string; withTrial: string };
      trial_period_days?: number;
    } = {
      metadata: {
        userId,
        plan,
        withTrial: String(withTrial && trialEligible),
      },
    };

    // Add trial period if eligible
    if (withTrial && trialEligible) {
      subscriptionData.trial_period_days = TRIAL_PERIOD_DAYS;
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: userEmail,
      client_reference_id: userId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        plan,
        interval,
        withTrial: String(withTrial && trialEligible),
      },
      subscription_data: subscriptionData,
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscription?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      locale: "fr",
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      trialApplied: withTrial && trialEligible,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
