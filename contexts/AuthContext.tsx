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
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const { user: googleUser } = result;

      // Check if user profile exists, if not create one
      const existingProfile = await getUserProfile(googleUser.uid);
      if (!existingProfile) {
        // This is a NEW user - set flag for onboarding
        try {
          await createUserProfile(googleUser.uid, {
            email: googleUser.email || "",
            displayName: googleUser.displayName || "",
            photoURL: googleUser.photoURL,
          });
          // Mark as new user for onboarding (signup via Google)
          // Set BOTH in-memory AND localStorage for robustness
          setIsNewUser(true);
          setShouldShowOnboarding(true);
        } catch (profileError) {
          // Log but don't fail - profile will be created during onboarding
          console.warn("Profile creation deferred to onboarding:", profileError);
          // Still mark as new user since no profile exists
          setIsNewUser(true);
          setShouldShowOnboarding(true);
        }
        toast.success("Compte créé avec succès !");
      } else {
        // Existing user - this is a LOGIN, not signup
        // isNewUser stays false (never show onboarding on login)
        // Clear any stale localStorage flags
        setShouldShowOnboarding(false);
        toast.success("Connexion réussie !");
      }

      // Refresh profile after sign in
      await refreshUserProfile();
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error("Erreur lors de la connexion Google");
      throw error;
    }
  };

  // Sign in with email and password
  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Clear any stale localStorage flags on login
      setShouldShowOnboarding(false);
      toast.success("Connexion réussie !");
    } catch (error: unknown) {
      console.error("Email sign-in error:", error);

      // Handle specific Firebase Auth errors
      const firebaseError = error as { code?: string };
      switch (firebaseError.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          toast.error("Email ou mot de passe incorrect");
          break;
        case "auth/invalid-email":
          toast.error("Format d'email invalide");
          break;
        case "auth/user-disabled":
          toast.error("Ce compte a été désactivé");
          break;
        case "auth/too-many-requests":
          toast.error("Trop de tentatives. Réessayez dans quelques minutes.");
          break;
        case "auth/network-request-failed":
          toast.error("Erreur de connexion. Vérifiez votre connexion internet.");
          break;
        default:
          toast.error("Erreur lors de la connexion");
      }
      throw error;
    }
  };

  // Sign up with email and password
  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName: string
  ) => {
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

      // Mark as new user for onboarding (signup via email)
      // Set BOTH in-memory AND localStorage for robustness
      setIsNewUser(true);
      setShouldShowOnboarding(true);

      toast.success("Compte créé avec succès !");
    } catch (error: unknown) {
      console.error("Email sign-up error:", error);

      // Handle specific Firebase Auth errors
      const firebaseError = error as { code?: string };
      switch (firebaseError.code) {
        case "auth/email-already-in-use":
          toast.error("Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.");
          break;
        case "auth/invalid-email":
          toast.error("Format d'email invalide");
          break;
        case "auth/weak-password":
          toast.error("Le mot de passe doit contenir au moins 6 caractères");
          break;
        case "auth/operation-not-allowed":
          toast.error("L'inscription par email n'est pas activée");
          break;
        case "auth/network-request-failed":
          toast.error("Erreur de connexion. Vérifiez votre connexion internet.");
          break;
        default:
          toast.error("Erreur lors de la création du compte");
      }
      throw error;
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
      console.error("Password reset error:", error);
      const firebaseError = error as { code?: string };

      if (firebaseError.code === "auth/user-not-found") {
        throw new Error("Aucun compte associé à cet email");
      } else if (firebaseError.code === "auth/invalid-email") {
        throw new Error("Adresse email invalide");
      } else if (firebaseError.code === "auth/too-many-requests") {
        throw new Error("Trop de tentatives. Réessayez plus tard.");
      }

      throw new Error("Erreur lors de l'envoi de l'email");
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
