"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/db/firebase";
import { createUserProfile, getUserProfile, deleteAllUserData, saveUserConsent } from "@/lib/db/firestore";
import { readWithAuthRetry } from "@/lib/db/with-auth-retry";
import { AuthContextType, UserProfile } from "@/types";
import toast from "@/components/ui/Toast";
import { translations } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getT() {
  const lang = (typeof window !== "undefined" ? localStorage.getItem("posty-language") : "en") as Language || "en";
  return translations[lang];
}

// LocalStorage key for onboarding persistence (survives page refresh)
const ONBOARDING_STORAGE_KEY = "posty_should_show_onboarding";
const THEME_STORAGE_KEY = "posty-theme";

/**
 * Reset theme to light mode for public pages after logout/account deletion.
 * This ensures a consistent, professional experience for logged-out users.
 */
const resetThemeToLight = () => {
  if (typeof window === "undefined") return;

  localStorage.setItem(THEME_STORAGE_KEY, "light");

  const root = document.documentElement;
  root.classList.remove("dark");
  root.classList.add("light");
  root.style.colorScheme = "light";
  root.setAttribute("data-theme", "light");
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Flag to track if user just signed up (NOT on login) - used for onboarding
  const [isNewUser, setIsNewUser] = useState(false);

  // Check localStorage for shouldShowOnboarding (persistent across refresh)
  const getShouldShowOnboarding = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
  }, []);

  // Set shouldShowOnboarding in localStorage
  const setShouldShowOnboarding = useCallback((value: boolean): void => {
    if (typeof window === "undefined") return;
    if (value) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    }
  }, []);

  // Clear the onboarding flag (call after onboarding is complete)
  const clearOnboardingFlag = useCallback((): void => {
    setIsNewUser(false);
    setShouldShowOnboarding(false);
  }, [setShouldShowOnboarding]);

  // Check if user needs to see onboarding
  // This combines in-memory flag AND localStorage for robustness
  const needsOnboarding = useCallback((): boolean => {
    // Check in-memory flag first (for current session)
    if (isNewUser) return true;
    // Check localStorage (for page refresh during signup flow)
    if (getShouldShowOnboarding()) return true;
    return false;
  }, [isNewUser, getShouldShowOnboarding]);

  // Initialize isNewUser from localStorage on mount (for page refresh during signup)
  useEffect(() => {
    if (getShouldShowOnboarding()) {
      setIsNewUser(true);
    }
  }, [getShouldShowOnboarding]);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // CRITICAL: Set user AND re-enter loading state in the same synchronous
        // block so React batches them into a single render. This prevents a
        // window where user is set + loading is false + userProfile is stale/null,
        // which caused premature redirects (onboarding flash for existing users).
        setUser(firebaseUser);
        setLoading(true);

        // Fetch user profile from Firestore.
        // CRITICAL: wrap in readWithAuthRetry. Right after login — and
        // especially after a password reset, which revokes prior tokens —
        // the first read can hit `permission-denied` with a stale ID token.
        // Without the retry this returns null and the app paints a blank,
        // "brand-new account" (only the email is visible because it comes from
        // the auth object, not Firestore) even though the data is intact. The
        // retry force-refreshes the token and reads the real profile.
        try {
          const profile = await readWithAuthRetry(() =>
            getUserProfile(firebaseUser.uid)
          );
          setUserProfile(profile);

          // If user has completed onboarding, clear any stale localStorage flags
          if (profile?.onboardingComplete) {
            setShouldShowOnboarding(false);
            setIsNewUser(false);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUserProfile(null);
        }

        setLoading(false);
      } else {
        setUser(null);
        setUserProfile(null);
        // Clear onboarding flags when user logs out
        setShouldShowOnboarding(false);
        setIsNewUser(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setShouldShowOnboarding]);

  // Refresh user profile
  const refreshUserProfile = useCallback(async () => {
    if (user) {
      const profile = await readWithAuthRetry(() => getUserProfile(user.uid));
      setUserProfile(profile);
    }
  }, [user]);

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    // Set onboarding flags BEFORE signInWithPopup.
    // onAuthStateChanged fires as soon as the popup resolves, before we can
    // check if the user is new. Setting flags optimistically ensures
    // needsOnboarding() returns true when the login page redirect runs.
    // Flags are cleared below if the user turns out to be existing.
    setIsNewUser(true);
    setShouldShowOnboarding(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const { user: googleUser } = result;

      // Check if user profile exists, if not create one
      const existingProfile = await getUserProfile(googleUser.uid);
      if (!existingProfile) {
        // Confirmed NEW user — flags already set, create profile
        try {
          await createUserProfile(googleUser.uid, {
            email: googleUser.email || "",
            displayName: googleUser.displayName || "",
            photoURL: googleUser.photoURL,
          });
        } catch (profileError) {
          // Log but don't fail - profile will be created during onboarding
          console.warn("Profile creation deferred to onboarding:", profileError);
        }
        // Persist RGPD consent to Firestore (Art. 7.1 - proof of consent)
        try {
          await saveUserConsent(googleUser.uid, {
            privacyPolicy: true,
            termsOfService: true,
            analytics: false,
            marketing: false,
          });
        } catch (consentError) {
          console.warn("Consent persistence deferred:", consentError);
        }
        toast.success(getT().toasts.accountCreated);
      } else {
        // Existing user — this is a LOGIN, not signup.
        // Clear the optimistic onboarding flags.
        setIsNewUser(false);
        setShouldShowOnboarding(false);
        toast.success(getT().toasts.loginSuccess);
      }
      // Profile will be loaded by onAuthStateChanged listener - no extra read needed
    } catch (error: unknown) {
      // Reset onboarding flags on failure — no account was created/logged in
      setIsNewUser(false);
      setShouldShowOnboarding(false);

      const firebaseError = error as { code?: string; message?: string };

      // User cancelled or popup blocked — NOT an error, return silently
      // This ensures manual login works immediately after abandoning Google auth
      const cancelledCodes = [
        "auth/popup-closed-by-user",
        "auth/cancelled-popup-request",
        "auth/popup-blocked",
        "auth/user-cancelled",
      ];
      if (firebaseError.code && cancelledCodes.includes(firebaseError.code)) {
        return; // Clean return, no error state
      }

      // Real error — throw with appropriate message
      console.error("Google sign-in error:", {
        code: firebaseError.code,
        message: firebaseError.message,
        fullError: error,
      });
      let message: string;
      switch (firebaseError.code) {
        case "auth/unauthorized-domain":
          message = "Ce domaine n'est pas autorisé pour la connexion Google. Contactez le support.";
          break;
        case "auth/network-request-failed":
          message = "Connexion impossible. Vérifiez votre connexion internet.";
          break;
        case "auth/account-exists-with-different-credential":
          message = "Un compte existe déjà avec cette adresse e-mail.";
          break;
        case "auth/operation-not-allowed":
          message = "La connexion Google n'est pas disponible pour le moment.";
          break;
        case "auth/internal-error":
          message = "Erreur de configuration. Veuillez réessayer ou contacter le support.";
          break;
        default:
          message = `La connexion n'a pas abouti. Veuillez réessayer. (${firebaseError.code || "unknown"})`;
      }
      throw new Error(message);
    }
  }, [setShouldShowOnboarding]);

  // Sign in with email and password
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShouldShowOnboarding(false);
      toast.success(getT().toasts.loginSuccess);
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      let message: string;
      switch (firebaseError.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          message = "Adresse e-mail ou mot de passe incorrect.";
          break;
        case "auth/invalid-email":
          message = "Le format de l'adresse e-mail n'est pas valide.";
          break;
        case "auth/user-disabled":
          message = "Ce compte a été désactivé.";
          break;
        case "auth/too-many-requests":
          message = "Trop de tentatives. Veuillez réessayer dans quelques minutes.";
          break;
        case "auth/network-request-failed":
          message = "Connexion impossible. Vérifiez votre connexion internet.";
          break;
        default:
          message = "La connexion n'a pas abouti. Veuillez réessayer.";
      }
      throw new Error(message);
    }
  }, [setShouldShowOnboarding]);

  // Sign up with email and password
  const signUpWithEmail = useCallback(async (
    email: string,
    password: string,
    displayName: string
  ) => {
    // Set onboarding flags BEFORE creating the account.
    // onAuthStateChanged fires during createUserWithEmailAndPassword's await,
    // which triggers the login page redirect. If flags aren't set yet,
    // needsOnboarding() returns false and the user lands on /app instead of /onboarding.
    setIsNewUser(true);
    setShouldShowOnboarding(true);

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const { user: newUser } = result;

      // Update display name
      await updateProfile(newUser, { displayName });

      // Create user profile in Firestore
      await createUserProfile(newUser.uid, {
        email,
        displayName,
        photoURL: null,
      });

      // Persist RGPD consent to Firestore (Art. 7.1 - proof of consent)
      try {
        await saveUserConsent(newUser.uid, {
          privacyPolicy: true,
          termsOfService: true,
          analytics: false,
          marketing: false,
        });
      } catch (consentError) {
        console.warn("Consent persistence deferred:", consentError);
      }

      toast.success(getT().toasts.accountCreated);
    } catch (error: unknown) {
      // Reset onboarding flags on failure — account was not created
      setIsNewUser(false);
      setShouldShowOnboarding(false);

      const firebaseError = error as { code?: string };
      let message: string;
      switch (firebaseError.code) {
        case "auth/email-already-in-use":
          message = "Cette adresse e-mail est déjà associée à un compte.";
          break;
        case "auth/invalid-email":
          message = "Le format de l'adresse e-mail n'est pas valide.";
          break;
        case "auth/weak-password":
          message = "Le mot de passe doit contenir au moins 6 caractères.";
          break;
        case "auth/operation-not-allowed":
          message = "L'inscription par e-mail n'est pas disponible pour le moment.";
          break;
        case "auth/network-request-failed":
          message = "Connexion impossible. Vérifiez votre connexion internet.";
          break;
        default:
          message = "La création du compte n'a pas abouti. Veuillez réessayer.";
      }
      throw new Error(message);
    }
  }, [setShouldShowOnboarding]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setUserProfile(null);
      setIsNewUser(false);
      setShouldShowOnboarding(false);

      // Reset theme to light mode for public pages
      resetThemeToLight();
    } catch (error) {
      console.error("Sign-out error:", error);
      throw error;
    }
  }, [setShouldShowOnboarding]);

  // Legacy function - kept for backward compatibility
  const clearNewUserFlag = useCallback(() => {
    clearOnboardingFlag();
  }, [clearOnboardingFlag]);

  // Delete user account with password verification
  const deleteUserAccount = useCallback(async (password: string): Promise<void> => {
    if (!user) {
      throw new Error("Aucun utilisateur connecté");
    }

    // Check if user signed in with Google
    const isGoogleUser = user.providerData.some(
      (provider) => provider.providerId === "google.com"
    );

    try {
      // Reauthenticate based on provider
      if (isGoogleUser) {
        // For Google users, reauthenticate with Google popup
        const googleProviderInstance = new GoogleAuthProvider();
        googleProviderInstance.setCustomParameters({ prompt: "select_account" });
        await reauthenticateWithPopup(user, googleProviderInstance);
      } else {
        // For email/password users, reauthenticate with password
        if (!user.email) {
          throw new Error("Email non disponible");
        }
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      }

      // Delete all user data from Firestore
      await deleteAllUserData(user.uid);

      // Delete the Firebase Auth account
      await deleteUser(user);

      // Clear local state
      setUser(null);
      setUserProfile(null);
      setShouldShowOnboarding(false);

      // Reset theme to light mode for public pages
      resetThemeToLight();
    } catch (error: unknown) {
      console.error("Delete account error:", error);

      // Handle specific Firebase Auth errors
      const firebaseError = error as { code?: string };
      if (firebaseError.code === "auth/wrong-password") {
        throw new Error("Mot de passe incorrect");
      } else if (firebaseError.code === "auth/too-many-requests") {
        throw new Error("Trop de tentatives. Réessayez plus tard.");
      } else if (firebaseError.code === "auth/requires-recent-login") {
        throw new Error("Veuillez vous reconnecter avant de supprimer votre compte");
      } else if (firebaseError.code === "auth/popup-closed-by-user") {
        throw new Error("Authentification annulée");
      }

      throw error;
    }
  }, [user, setShouldShowOnboarding]);

  // Send password reset email
  const resetPassword = useCallback(async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/auth/action`,
        handleCodeInApp: true,
      });
      toast.success(getT().toasts.resetEmailSent);
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      // Silently succeed for user-not-found to prevent email enumeration
      if (firebaseError.code === "auth/user-not-found") {
        toast.success(getT().toasts.resetEmailSent);
        return;
      }
      if (firebaseError.code === "auth/invalid-email") {
        throw new Error("Le format de l'adresse e-mail n'est pas valide.");
      } else if (firebaseError.code === "auth/too-many-requests") {
        throw new Error("Trop de tentatives. Veuillez réessayer plus tard.");
      }
      throw new Error("L'envoi de l'e-mail n'a pas abouti. Veuillez réessayer.");
    }
  }, []);

  const value: AuthContextType = useMemo(() => ({
    user,
    userProfile,
    loading,
    isNewUser,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshUserProfile,
    deleteUserAccount,
    clearNewUserFlag,
    resetPassword,
    // New functions for robust onboarding
    needsOnboarding,
    clearOnboardingFlag,
  }), [
    user, userProfile, loading, isNewUser,
    signInWithGoogle, signInWithEmail, signUpWithEmail, signOut,
    refreshUserProfile, deleteUserAccount, clearNewUserFlag, resetPassword,
    needsOnboarding, clearOnboardingFlag,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
