"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onIdTokenChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile as updateFirebaseProfile,
} from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { profileService } from "../services/profileService";
import { getFirebaseAuth, getFirebaseConfigurationError } from "../utils/firebase";

const AuthContext = createContext(null);
const configurationError = getFirebaseConfigurationError();

const actionUrl = (path) => ({ url: `${window.location.origin}${path}` });

const readError = async (response) => {
  const data = await response.json().catch(() => ({}));
  return data.error || "Authentication could not be completed";
};

const loadLocalProfile = async () => {
  const response = await profileService.getUserData();
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
};

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!configurationError);
  const [authError, setAuthError] = useState(configurationError);

  useEffect(() => {
    if (configurationError) return undefined;
    let active = true;
    const unsubscribe = onIdTokenChanged(getFirebaseAuth(), async (nextUser) => {
      if (!active) return;
      setFirebaseUser(nextUser);
      setAuthError("");
      if (!nextUser?.emailVerified) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const nextProfile = await loadLocalProfile();
        if (active) setProfile(nextProfile);
      } catch (error) {
        if (active) {
          setProfile(null);
          setAuthError(error.message);
        }
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const syncProfile = async (user) => {
    if (!user.emailVerified) return null;
    await user.getIdToken(true);
    const nextProfile = await loadLocalProfile();
    setFirebaseUser(user);
    setProfile(nextProfile);
    setAuthError("");
    return nextProfile;
  };

  const signInWithEmail = async (email, password) => {
    const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    if (!credential.user.emailVerified) return credential.user;
    try {
      await syncProfile(credential.user);
      return credential.user;
    } catch (error) {
      await firebaseSignOut(getFirebaseAuth());
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await signInWithPopup(getFirebaseAuth(), provider);
    try {
      await syncProfile(credential.user);
      return credential.user;
    } catch (error) {
      await firebaseSignOut(getFirebaseAuth());
      throw error;
    }
  };

  const registerWithEmail = async ({ displayName, email, password, returnTo }) => {
    const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    await updateFirebaseProfile(credential.user, { displayName });
    await sendEmailVerification(
      credential.user,
      actionUrl(`/verify-email?returnTo=${encodeURIComponent(returnTo)}`),
    );
    setFirebaseUser(credential.user);
    return credential.user;
  };

  const resendVerification = (returnTo = "/home") => {
    if (!firebaseUser) throw new Error("Sign in before requesting another verification email");
    return sendEmailVerification(
      firebaseUser,
      actionUrl(`/verify-email?returnTo=${encodeURIComponent(returnTo)}`),
    );
  };

  const refreshVerification = async () => {
    if (!firebaseUser) return false;
    await reload(firebaseUser);
    if (!firebaseUser.emailVerified) return false;
    await syncProfile(firebaseUser);
    return true;
  };

  const requestPasswordReset = (email, returnTo = "/home") => sendPasswordResetEmail(
    getFirebaseAuth(),
    email,
    actionUrl(`/login?returnTo=${encodeURIComponent(returnTo)}`),
  );

  const updateDisplayName = async (displayName) => {
    if (!firebaseUser) throw new Error("Authentication required");
    await updateFirebaseProfile(firebaseUser, { displayName });
    await firebaseUser.getIdToken(true);
  };

  const signOut = async () => {
    await firebaseSignOut(getFirebaseAuth());
    setFirebaseUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      authError,
      firebaseUser,
      isAuthenticated: Boolean(firebaseUser?.emailVerified && profile),
      loading,
      profile,
      refreshVerification,
      registerWithEmail,
      requestPasswordReset,
      resendVerification,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      syncProfile,
      updateDisplayName,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};