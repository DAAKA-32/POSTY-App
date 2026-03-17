import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getStripeServer, getPriceId, getAppUrl, BillingInterval } from "@/lib/config/stripe";
import { SubscriptionPlan } from "@/types";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import { PLAN_CONFIGS, TRIAL_PERIOD_DAYS, checkTrialEligibility, isPlanTrialEligible } from "@/lib/config/plans";

export async function POST(request: NextRequest) {
  try {
    // Verify Firebase auth token
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const {
      userId: bodyUserId,
      userEmail,
      plan,
      interval = "monthly",
      withTrial = false,
      redirectAfterSuccess,
    } = body as {
      userId: string;
      userEmail: string;
      plan: SubscriptionPlan;
      interval?: BillingInterval;
      withTrial?: boolean;
      redirectAfterSuccess?: string;
    };

    // Use authenticated uid (fallback to body userId in dev bypass mode)
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    // Validate required fields
    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: "Missing required fields: userId, userEmail" },
        { status: 400 }
      );
    }

    // Verify the user exists in Firebase (prevent unauthorized checkout)
    if (isAdminInitialized() && adminDb) {
      try {
        const userDoc = await adminDb.collection("users").doc(userId).get();
        if (!userDoc.exists) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 401 }
          );
        }
      } catch {
        // If Firebase check fails in production, reject the request
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json(
            { error: "Unable to verify user" },
            { status: 500 }
          );
        }
      }
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

    // Reject trial requests for non-trial-eligible plans (e.g., Max)
    if (withTrial && !isPlanTrialEligible(plan)) {
      return NextResponse.json(
        {
          error: "trial_not_available",
          message: "L'essai gratuit n'est pas disponible pour ce plan.",
        },
        { status: 400 }
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

    // Add trial period if eligible (use per-plan trialDays: Pro=7, Max=3)
    if (withTrial && trialEligible) {
      const planTrialDays = PLAN_CONFIGS[plan as keyof typeof PLAN_CONFIGS]?.trialDays || TRIAL_PERIOD_DAYS;
      subscriptionData.trial_period_days = planTrialDays;
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
        ...(redirectAfterSuccess && { redirectAfterSuccess }),
      },
      subscription_data: subscriptionData,
      success_url: `${appUrl}/subscription?success=true${redirectAfterSuccess ? `&redirect=${encodeURIComponent(redirectAfterSuccess)}` : ''}`,
      cancel_url: `${appUrl}/subscription?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      consent_collection: {
        terms_of_service: "required",
      },
      custom_text: {
        terms_of_service_acceptance: {
          message: `J'accepte les [Conditions Générales d'Utilisation](${appUrl}/legal/terms) et je consens à l'accès immédiat au service, renonçant à mon droit de rétractation de 14 jours (art. L.221-28).`,
        },
      },
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
