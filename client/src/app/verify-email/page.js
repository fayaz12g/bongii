"use client";

import { Loader2, LogOut, MailCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Background from "../components/background";
import { useAuth } from "../components/authContext";
import Footer from "../components/footer";
import { safeReturnTo } from "../utils/authRedirect.mjs";

const readReturnTo = () => safeReturnTo(
  new URLSearchParams(window.location.search).get("returnTo"),
);

export default function VerifyEmailPage() {
  const router = useRouter();
  const {
    firebaseUser,
    isAuthenticated,
    loading,
    refreshVerification,
    resendVerification,
    signOut,
  } = useAuth();
  const [message, setMessage] = useState("");
  const [operation, setOperation] = useState("");

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace(readReturnTo());
  }, [isAuthenticated, loading, router]);

  const checkVerification = async () => {
    setOperation("check");
    setMessage("");
    try {
      const verified = await refreshVerification();
      if (verified) router.replace(readReturnTo());
      else setMessage("That address is not verified yet.");
    } catch {
      setMessage("Verification status could not be checked. Try again.");
    } finally {
      setOperation("");
    }
  };

  const resend = async () => {
    setOperation("resend");
    setMessage("");
    try {
      await resendVerification(readReturnTo());
      setMessage("A new verification email has been sent.");
    } catch {
      setMessage("The email could not be sent. Wait a moment and try again.");
    } finally {
      setOperation("");
    }
  };

  const leave = async () => {
    await signOut();
    router.replace(`/login?returnTo=${encodeURIComponent(readReturnTo())}`);
  };

  return (
    <div className="app-page relative flex min-h-screen flex-col">
      <Background />
      <main className="z-10 flex flex-1 items-center justify-center px-4 py-16">
        <div className="app-panel w-full max-w-md p-6 text-center sm:p-8">
          <MailCheck className="mx-auto h-10 w-10 text-accent" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-bold text-white">Verify your email</h1>
          {firebaseUser ? (
            <>
              <p className="mt-4 text-muted">We sent a verification link to <strong className="text-white">{firebaseUser.email}</strong>.</p>
              <div className="mt-8 grid gap-3">
                <button type="button" onClick={checkVerification} disabled={Boolean(operation)} className="ui-button-primary w-full">
                  {operation === "check" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  I&apos;ve verified my email
                </button>
                <button type="button" onClick={resend} disabled={Boolean(operation)} className="ui-button-secondary w-full">
                  Resend email
                </button>
                <button type="button" onClick={leave} className="ui-button-secondary w-full">
                  <LogOut className="h-4 w-4" />
                  Use another account
                </button>
              </div>
            </>
          ) : !loading && (
            <p className="mt-6 text-muted">Open the link in your email, then <Link href="/login" className="text-blue-300 underline">sign in</Link>.</p>
          )}
          {message && <p role="status" className="ui-toast mt-5">{message}</p>}
        </div>
      </main>
      <Footer />
    </div>
  );
}