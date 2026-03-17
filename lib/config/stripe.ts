import Stripe from "stripe";
import { loadStripe, Stripe as StripeClient } from "@stripe/stripe-js";

// ============== STRIPE SERVER INSTANCE ==============
// Only use on server-side (API routes)

let stripeInstance: Stripe | null = null;

export function getStripeServer(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    });
  }
  return stripeInstance;
}

// ============== STRIPE CLIENT INSTANCE ==============
// Only use on client-side (React components)

let stripePromise: Promise<StripeClient | null> | null = null;

export function getStripeClient(): Promise<StripeClient | null> {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured");
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

// ============== STRIPE PRICE IDS ==============
// Map plan IDs to Stripe Price IDs

export type BillingInterval = "monthly" | "yearly";

export interface StripePriceConfig {
  priceId: string;
  amount: number;
  interval: BillingInterval;
}

export const STRIPE_PRICES: Record<string, StripePriceConfig> = {
  // PRO plan - 12.90€/month
  pro_monthly: {
    priceId: process.env.STRIPE_PRICE_PRO_MONTHLY || process.env.STRIPE_PRICE_STARTER_MONTHLY || "",
    amount: 1290, // 12.90€ in cents
    interval: "monthly",
  },
  pro_yearly: {
    priceId: process.env.STRIPE_PRICE_PRO_YEARLY || process.env.STRIPE_PRICE_STARTER_YEARLY || "",
    amount: 12900, // 129€ in cents (-17%, soit 10.75€/mois)
    interval: "yearly",
  },
  // MAX plan - 19.90€/month
  max_monthly: {
    priceId: process.env.STRIPE_PRICE_MAX_MONTHLY || process.env.STRIPE_PRICE_PRO_MONTHLY || "",
    amount: 1990, // 19.90€ in cents
    interval: "monthly",
  },
  max_yearly: {
    priceId: process.env.STRIPE_PRICE_MAX_YEARLY || process.env.STRIPE_PRICE_PRO_YEARLY || "",
    amount: 19900, // 199€ in cents (-17%, soit 16.58€/mois)
    interval: "yearly",
  },
};

// ============== HELPER FUNCTIONS ==============

export function getPriceId(
  plan: "pro" | "max",
  interval: BillingInterval
): string {
  const key = `${plan}_${interval}`;
  return STRIPE_PRICES[key]?.priceId || "";
}

export function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai").trim();
}

// ============== WEBHOOK EVENTS ==============

export const STRIPE_WEBHOOK_EVENTS = {
  CHECKOUT_COMPLETED: "checkout.session.completed",
  SUBSCRIPTION_CREATED: "customer.subscription.created",
  SUBSCRIPTION_UPDATED: "customer.subscription.updated",
  SUBSCRIPTION_DELETED: "customer.subscription.deleted",
  SUBSCRIPTION_TRIAL_WILL_END: "customer.subscription.trial_will_end",
  INVOICE_PAID: "invoice.paid",
  INVOICE_PAYMENT_FAILED: "invoice.payment_failed",
} as const;
