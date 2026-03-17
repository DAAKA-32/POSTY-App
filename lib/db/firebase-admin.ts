import { initializeApp, getApps, cert, App, ServiceAccount } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

// State container to avoid reassignment issues
const state: {
  initialized: boolean;
  app: App | undefined;
  db: Firestore | undefined;
} = {
  initialized: false,
  app: undefined,
  db: undefined,
};

// Try to load service account from file
function loadServiceAccountFromFile(): ServiceAccount | null {
  const possiblePaths = [
    path.join(process.cwd(), "service-account.json"),
    path.join(process.cwd(), "firebase-service-account.json"),
    path.join(process.cwd(), "tink-dc3d4-firebase-adminsdk-fbsvc-15790cf707.json"),
  ];

  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const serviceAccount = JSON.parse(fileContent) as ServiceAccount;
        console.log(`Firebase Admin: Loaded service account from ${filePath}`);
        return serviceAccount;
      }
    } catch {
      // Continue to next path
    }
  }
  return null;
}

function initializeFirebaseAdmin(): { app: App; db: Firestore } | null {
  // If already initialized, return cached instances
  if (state.initialized && state.app && state.db) {
    return { app: state.app, db: state.db };
  }

  // Check if already initialized by another import
  const existingApps = getApps();
  if (existingApps.length > 0) {
    state.app = existingApps[0];
    state.db = getFirestore(state.app);
    state.initialized = true;
    return { app: state.app, db: state.db };
  }

  try {
    // Option 1: Load from service account file
    const serviceAccountFromFile = loadServiceAccountFromFile();
    if (serviceAccountFromFile) {
      const app = initializeApp({
        credential: cert(serviceAccountFromFile),
      });
      const db = getFirestore(app);
      state.app = app;
      state.db = db;
      state.initialized = true;
      console.log("Firebase Admin initialized with service account file");
      return { app, db };
    }

    // Option 2: Use service account from environment variable (JSON string)
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      const db = getFirestore(app);
      state.app = app;
      state.db = db;
      state.initialized = true;
      console.log("Firebase Admin initialized with service account env");
      return { app, db };
    }

    // Option 3: Use individual environment variables
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      const app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      const db = getFirestore(app);
      state.app = app;
      state.db = db;
      state.initialized = true;
      console.log("Firebase Admin initialized with individual credentials");
      return { app, db };
    }

    // Option 4: Initialize without credentials (will use Application Default Credentials if available)
    // This works on Google Cloud environments
    if (projectId) {
      const app = initializeApp({
        projectId,
      });
      const db = getFirestore(app);
      state.app = app;
      state.db = db;
      state.initialized = true;
      console.log("Firebase Admin initialized with default credentials");
      return { app, db };
    }

    console.error("Firebase Admin: No valid credentials found");
    return null;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    return null;
  }
}

// Initialize on module load
const firebaseAdmin = initializeFirebaseAdmin();

// Export getters to ensure we always have the latest values
export function getAdminDb(): Firestore | undefined {
  if (!state.initialized) {
    initializeFirebaseAdmin();
  }
  return state.db;
}

export function getAdminApp(): App | undefined {
  if (!state.initialized) {
    initializeFirebaseAdmin();
  }
  return state.app;
}

// For backward compatibility - use the initial result
export const adminDb = firebaseAdmin?.db;
export const adminApp = firebaseAdmin?.app;

// Helper function to check if admin is initialized
export function isAdminInitialized(): boolean {
  return state.initialized && !!state.db;
}
