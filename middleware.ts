import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/app", "/history", "/profile"];

// Routes that should redirect to app if already logged in
const authRoutes = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Note: Firebase Auth state is managed client-side
  // This middleware provides a basic redirect pattern
  // Actual auth checks happen in ProtectedRoute component

  // For now, we just let the client-side handle auth redirects
  // This is because Firebase Auth tokens are stored client-side

  // You can enhance this with Firebase Admin SDK for server-side auth
  // by checking cookies or session tokens

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

/*
 * FUTURE ENHANCEMENT: Server-side auth with Firebase Admin
 *
 * To implement server-side auth protection:
 *
 * 1. Install Firebase Admin SDK:
 *    npm install firebase-admin
 *
 * 2. Set up service account credentials in env:
 *    FIREBASE_ADMIN_PROJECT_ID=
 *    FIREBASE_ADMIN_PRIVATE_KEY=
 *    FIREBASE_ADMIN_CLIENT_EMAIL=
 *
 * 3. Create lib/firebase-admin.ts:
 *    import { initializeApp, getApps, cert } from 'firebase-admin/app';
 *    import { getAuth } from 'firebase-admin/auth';
 *
 *    const app = getApps().length === 0
 *      ? initializeApp({
 *          credential: cert({
 *            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
 *            privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
 *            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
 *          }),
 *        })
 *      : getApps()[0];
 *
 *    export const adminAuth = getAuth(app);
 *
 * 4. Update middleware to verify tokens:
 *    const token = request.cookies.get('firebase-auth-token')?.value;
 *    if (token) {
 *      try {
 *        await adminAuth.verifyIdToken(token);
 *        // User is authenticated
 *      } catch (error) {
 *        // Token is invalid
 *      }
 *    }
 *
 * 5. Set cookie on client-side login:
 *    document.cookie = `firebase-auth-token=${await user.getIdToken()}; path=/`;
 */
