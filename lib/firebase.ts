import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth, browserLocalPersistence, setPersistence } from "firebase/auth";
import {
  getFirestore,
  Firestore,
  enableIndexedDbPersistence,
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

// Initialize Firebase if config is valid (works on both client and server)
if (isConfigValid()) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

  // Client-side: Initialize Firestore with persistent cache
  if (typeof window !== "undefined") {
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
