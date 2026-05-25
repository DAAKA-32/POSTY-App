import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth, browserLocalPersistence, setPersistence } from "firebase/auth";
import {
  getFirestore,
  Firestore,
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if all required environment variables are present
const isConfigValid = () => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  );
};

// Initialize Firebase for both client and server
let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let googleProviderInstance: GoogleAuthProvider | undefined;

/**
 * Suppress two specific Firebase noise patterns from `console.error`:
 *
 *   1. "Could not reach Cloud Firestore backend. Connection failed N times…"
 *      — the SDK retries automatically; logging every retry to console.error
 *      pollutes the Next.js dev overlay (which surfaces ANY console.error as
 *      a full-screen modal) without giving us anything actionable.
 *   2. "Failed to get document because the client is offline."
 *      — same root cause, surfaced by getDoc/getDocs when the persistent cache
 *      is also empty. Real bugs (permission-denied, missing field, etc.) are
 *      a different message and pass through untouched.
 *
 * We patch console.error ONCE per page load and ONLY in the browser. Server
 * logs are unaffected. All other Firebase errors still flow through normally
 * so observability isn't compromised.
 */
function installFirebaseConsoleNoiseFilter(): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __postyFirebaseNoiseFilterInstalled?: boolean };
  if (w.__postyFirebaseNoiseFilterInstalled) return;
  w.__postyFirebaseNoiseFilterInstalled = true;

  const NOISE_PATTERNS = [
    /Could not reach Cloud Firestore backend/i,
    /Fetching auth token failed/i,
    /auth\/network-request-failed/i,
    /Failed to get document because the client is offline/i,
  ];

  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const firstString = args.find((a) => typeof a === "string") as string | undefined;
    if (firstString && NOISE_PATTERNS.some((re) => re.test(firstString))) {
      return; // swallow — transient network noise, SDK will recover on its own
    }
    // Also catch the case where the first arg is an Error whose message matches.
    const firstError = args.find((a) => a instanceof Error) as Error | undefined;
    if (firstError && NOISE_PATTERNS.some((re) => re.test(firstError.message))) {
      return;
    }
    originalError(...args);
  };
}

// Initialize Firebase if config is valid (works on both client and server)
if (isConfigValid()) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

  // Client-side: Initialize Firestore with persistent cache
  if (typeof window !== "undefined") {
    // Install the noise filter BEFORE any Firestore call so we never miss a
    // retry log. Idempotent across HMR reloads.
    installFirebaseConsoleNoiseFilter();

    try {
      // Use the new persistent cache API (Firebase v10+)
      dbInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
          cacheSizeBytes: CACHE_SIZE_UNLIMITED,
        }),
      });
    } catch {
      // Fallback if already initialized
      dbInstance = getFirestore(app);
    }

    authInstance = getAuth(app);
    // Configure persistent session - user stays logged in until manual sign out
    setPersistence(authInstance, browserLocalPersistence).catch(console.error);
    googleProviderInstance = new GoogleAuthProvider();
    // Force account selection on every sign-in (no auto-login)
    googleProviderInstance.setCustomParameters({ prompt: "select_account" });
  } else {
    // Server-side: Use standard Firestore without persistence
    dbInstance = getFirestore(app);
  }
}

// Export safe getters
export const auth = authInstance as Auth;
export const db = dbInstance as Firestore;
export const googleProvider = googleProviderInstance as GoogleAuthProvider;

export default app;
