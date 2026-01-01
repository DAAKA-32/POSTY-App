import { NextRequest, NextResponse } from "next/server";
import { getStripeServer, getAppUrl } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId } = body as { customerId: string };

    if (!customerId) {
      return NextResponse.json(
        { error: "Missing required field: customerId" },
        { status: 400 }
      );
    }

    const stripe = getStripeServer();
    const appUrl = getAppUrl();

    // Create Stripe Customer Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/profile`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
