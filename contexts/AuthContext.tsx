"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
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
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { createUserProfile, getUserProfile, deleteAllUserData } from "@/lib/firestore";
import { AuthContextType, UserProfile } from "@/types";
import toast from "react-hot-toast";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch user profile from Firestore
        const profile = await getUserProfile(firebaseUser.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
        await createUserProfile(googleUser.uid, {
          email: googleUser.email || "",
          displayName: googleUser.displayName || "",
          photoURL: googleUser.photoURL,
        });
      }

      toast.success("Connexion réussie !");
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
      toast.success("Connexion réussie !");
    } catch (error) {
      console.error("Email sign-in error:", error);
      toast.error("Email ou mot de passe incorrect");
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

      toast.success("Compte créé avec succès !");
    } catch (error) {
      console.error("Email sign-up error:", error);
      toast.error("Erreur lors de la création du compte");
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUserProfile(null);
      toast.success("Déconnexion réussie");
    } catch (error) {
      console.error("Sign-out error:", error);
      toast.error("Erreur lors de la déconnexion");
      throw error;
    }
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

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshUserProfile,
    deleteUserAccount,
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
