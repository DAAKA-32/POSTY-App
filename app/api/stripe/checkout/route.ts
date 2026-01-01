import { NextRequest, NextResponse } from "next/server";
import { getStripeServer, getPriceId, getAppUrl, BillingInterval } from "@/lib/stripe";
import { SubscriptionPlan } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userEmail, plan, interval = "monthly" } = body as {
      userId: string;
      userEmail: string;
      plan: SubscriptionPlan;
      interval?: BillingInterval;
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

    const stripe = getStripeServer();
    const appUrl = getAppUrl();

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
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      locale: "fr",
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
