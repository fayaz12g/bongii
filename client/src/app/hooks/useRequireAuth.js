"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/authContext";
import { loginHref } from "../utils/authRedirect.mjs";

export const useRequireAuth = () => {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.loading || auth.isAuthenticated) return;
    const returnTo = `${window.location.pathname}${window.location.search}`;
    if (auth.firebaseUser && !auth.firebaseUser.emailVerified) {
      router.replace(`/verify-email?returnTo=${encodeURIComponent(returnTo)}`);
    } else {
      router.replace(loginHref(returnTo));
    }
  }, [auth.firebaseUser, auth.isAuthenticated, auth.loading, router]);

  return auth;
};