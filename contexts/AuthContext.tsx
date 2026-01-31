"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
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
import { auth, googleProvider } from "@/lib/firebase";
import { createUserProfile, getUserProfile, deleteAllUserData } from "@/lib/firestore";
import { AuthContextType, UserProfile } from "@/types";
import toast from "@/components/ui/Toast";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch user profile from Firestore
        const profile = await getUserProfile(firebaseUser.uid);
        setUserProfile(profile);

        // If user has completed onboarding, clear any stale localStorage flags
        if (profile?.onboardingComplete) {
          setShouldShowOnboarding(false);
          setIsNewUser(false);
        }
      } else {
        setUserProfile(null);
        // Clear onboarding flags when user logs out
        setShouldShowOnboarding(false);
        setIsNewUser(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [setShouldShowOnboarding]);

  // Refresh user profile
  const refreshUserProfile = async () => {
    if (user) {
      const profile = await getUserProfile(user.uid);
      setUserProfile(profile);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
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
        toast.success("Compte créé avec succès !");
      } else {
        // Existing user — this is a LOGIN, not signup.
        // Clear the optimistic onboarding flags.
        setIsNewUser(false);
        setShouldShowOnboarding(false);
        toast.success("Connexion réussie !");
      }

      // Refresh profile after sign in
      await refreshUserProfile();
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
      let message: string;
      switch (firebaseError.code) {
        case "auth/network-request-failed":
          message = "Connexion impossible. Vérifiez votre connexion internet.";
          break;
        case "auth/account-exists-with-different-credential":
          message = "Un compte existe déjà avec cette adresse e-mail.";
          break;
        case "auth/operation-not-allowed":
          message = "La connexion Google n'est pas disponible pour le moment.";
          break;
        default:
          message = "La connexion n'a pas abouti. Veuillez réessayer.";
      }
      throw new Error(message);
    }
  };

  // Sign in with email and password
  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShouldShowOnboarding(false);
      toast.success("Connexion réussie !");
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
  };

  // Sign up with email and password
  const signUpWithEmail = async (
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

      toast.success("Compte créé avec succès !");
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
  };

  // Sign out
  const signOut = async () => {
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
  };

  // Legacy function - kept for backward compatibility
  const clearNewUserFlag = () => {
    clearOnboardingFlag();
  };

  // Delete user account with password verification
  const deleteUserAccount = async (password: string): Promise<void> => {
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
  };

  // Send password reset email
  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/login`, // Redirect to login after reset
      });
      toast.success("Email de réinitialisation envoyé !");
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code === "auth/user-not-found") {
        throw new Error("Aucun compte n'est associé à cette adresse e-mail.");
      } else if (firebaseError.code === "auth/invalid-email") {
        throw new Error("Le format de l'adresse e-mail n'est pas valide.");
      } else if (firebaseError.code === "auth/too-many-requests") {
        throw new Error("Trop de tentatives. Veuillez réessayer plus tard.");
      }
      throw new Error("L'envoi de l'e-mail n'a pas abouti. Veuillez réessayer.");
    }
  };

  const value: AuthContextType = {
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
  };

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
