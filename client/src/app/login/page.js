"use client";

import Link from "next/link";
import { Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Background from "../components/background";
import { useAuth } from "../components/authContext";
import Footer from "../components/footer";
import { safeReturnTo } from "../utils/authRedirect.mjs";

const readReturnTo = () => safeReturnTo(
  new URLSearchParams(window.location.search).get("returnTo"),
);

const loginErrorMessage = (error) => {
  if (error.code === "auth/popup-closed-by-user") return "";
  if (error.message?.includes("manual account recovery")) return error.message;
  if (error.message?.startsWith("Firebase is not configured")) return error.message;
  return "Sign in failed. Check your details and try again.";
};

export default function LoginPage() {
  const router = useRouter();
  const {
    authError,
    firebaseUser,
    isAuthenticated,
    loading: authLoading,
    signInWithEmail,
    signInWithGoogle,
  } = useAuth();
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [operation, setOperation] = useState("");
  const isFormValid = Boolean(email && password);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) router.replace(readReturnTo());
    else if (firebaseUser && !firebaseUser.emailVerified) {
      router.replace(`/verify-email?returnTo=${encodeURIComponent(readReturnTo())}`);
    }
  }, [authLoading, firebaseUser, isAuthenticated, router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid) return;
    setError("");
    setOperation("email");
    try {
      const user = await signInWithEmail(email, password);
      if (!user.emailVerified) {
        router.push(`/verify-email?returnTo=${encodeURIComponent(readReturnTo())}`);
        return;
      }
      router.replace(readReturnTo());
    } catch (requestError) {
      setError(loginErrorMessage(requestError));
    } finally {
      setOperation("");
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setOperation("google");
    try {
      await signInWithGoogle();
      router.replace(readReturnTo());
    } catch (requestError) {
      setError(loginErrorMessage(requestError));
    } finally {
      setOperation("");
    }
  };

  return (
    <div className="app-page relative flex min-h-screen flex-col">
      <Background />

      <main className="z-10 flex flex-1 items-center justify-center px-4 py-16">
      <div className="app-panel w-full max-w-md p-6 sm:p-8">
        <h1 className="mb-2 text-center text-4xl font-bold text-white">Sign in</h1>
        <p className="mb-8 text-center text-muted">Manage campaigns with your verified account.</p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={Boolean(operation) || Boolean(authError)}
          className="ui-button-secondary w-full"
        >
          {operation === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase text-muted">
          <span className="h-px flex-1 bg-line" />
          <span>or email</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-white mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="ui-field"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-white mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="ui-field"
              placeholder="Enter password"
              required
            />
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => router.push(`/forgot-password?returnTo=${encodeURIComponent(readReturnTo())}`)}
                className="text-sm font-medium text-blue-300 underline hover:text-blue-200"
              >
                Forgot password?
              </button>
            </div>
          </div>

            <button
              type="submit"
              disabled={!isFormValid || Boolean(operation) || Boolean(authError)}
              className="ui-button-primary w-full"
            >
              {operation === "email" && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </button>

          {(error || authError) && (
            <p role="alert" className="ui-toast border-rose-400 text-rose-100">{error || authError}</p>
          )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-white">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => router.push(`/register?returnTo=${encodeURIComponent(readReturnTo())}`)}
              className="underline text-blue-400 hover:text-blue-300 font-medium"
            >
              Create one
            </button>
          </p>
          <Link href="/" className="mt-4 inline-block text-sm text-muted underline hover:text-white">
            Back to Bongii
          </Link>
        </div>
      </div>
      </main>

      <Footer />
    </div>
  );
}
