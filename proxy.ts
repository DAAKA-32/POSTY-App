/**
 * Next.js Middleware - Server-side Route Protection
 *
 * Security Level: PRODUCTION
 *
 * This middleware runs on EVERY request BEFORE rendering pages.
 * It checks:
 * 1. User authentication (Firebase session)
 * 2. Subscription status (active/trialing/inactive)
 * 3. Redirects to /pricing if subscription is not active
 *
 * Protected Routes:
 * - /app/*
 * - /dashboard
 * - /history
 * - /schedule
 * - /analytics
 * - /profile (partially - can view without sub, but features limited)
 * - /settings
 *
 * Public Routes (bypass protection):
 * - /
 * - /login
 * - /signup
 * - /pricing
 * - /onboarding
 * - /legal/*
 * - /api/*
 * - /_next/*
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require ACTIVE subscription (or trial)
const SUBSCRIPTION_REQUIRED_ROUTES = [
  "/app",
  "/dashboard",
  "/history",
  "/schedule",
  "/analytics",
  "/settings",
];

// Routes that are publicly accessible (no subscription needed)
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/pricing",
  "/subscription",
  "/onboarding",
  "/checkout",
  "/chat", // Guest mode
  "/legal",
  "/about",
  "/brand",
  "/forgot-password",
];

/**
 * Check if a path requires subscription
 */
function requiresSubscription(pathname: string): boolean {
  return SUBSCRIPTION_REQUIRED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
}

/**
 * Check if a path is public (no auth/subscription required)
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, API routes, and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes("/favicon") ||
    pathname.includes(".") // static files (images, fonts, etc.)
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Get Firebase session cookie (set by AuthContext after login)
  const sessionCookie = request.cookies.get("__session");

  // If route requires subscription, verify it
  if (requiresSubscription(pathname)) {
    // Check if user is authenticated
    if (!sessionCookie) {
      // Not authenticated -> redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Get subscription status from cookie (set by SubscriptionContext)
    const subscriptionStatus = request.cookies.get("subscription_status")?.value;
    const subscriptionPlan = request.cookies.get("subscription_plan")?.value;

    // Check if subscription is active or trialing
    const hasActiveSubscription =
      subscriptionStatus === "active" ||
      subscriptionStatus === "trialing";

    // If no active subscription, redirect to pricing
    if (!hasActiveSubscription) {
      console.warn(`[Middleware] Blocking access to ${pathname} - No active subscription`);
      const pricingUrl = new URL("/pricing", request.url);
      pricingUrl.searchParams.set("redirect", pathname);
      pricingUrl.searchParams.set("reason", "subscription_required");
      return NextResponse.redirect(pricingUrl);
    }

    // Additional check: users without a valid plan should not access paid features
    // (keeps "free" check for legacy cookies that may still carry that value)
    if ((!subscriptionPlan || subscriptionPlan === "free") && pathname !== "/profile") {
      console.warn(`[Middleware] Blocking user without valid plan from ${pathname}`);
      const pricingUrl = new URL("/pricing", request.url);
      pricingUrl.searchParams.set("reason", "upgrade_required");
      return NextResponse.redirect(pricingUrl);
    }
  }

  // Allow the request to proceed
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, fonts, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
