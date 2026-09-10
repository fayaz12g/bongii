"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import Background from "../components/background";
import { useAuth } from "../components/authContext";
import Footer from "../components/footer";
import ProfileAvatarPicker from "../components/profileAvatarPicker";
import { safeReturnTo } from "../utils/authRedirect.mjs";
import { DEFAULT_PROFILE_AVATAR_ID } from "../utils/profileAvatars.mjs";

const readReturnTo = () => safeReturnTo(
  new URLSearchParams(window.location.search).get("returnTo"),
);

export default function RegisterPage() {
  const router = useRouter();
  const { authError, registerWithEmail, signInWithGoogle } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [profileIcon, setProfileIcon] = useState(DEFAULT_PROFILE_AVATAR_ID);
  const isFormValid = Boolean(
    displayName.trim() && email && password.length >= 8 && password === passwordConfirmation,
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid) return;
    setError("");
    setSubmitting(true);
    try {
      const returnTo = readReturnTo();
      await registerWithEmail({
        displayName: displayName.trim(),
        email,
        password,
        profileIcon,
        returnTo,
      });
      router.push(`/verify-email?returnTo=${encodeURIComponent(returnTo)}`);
    } catch (requestError) {
      setError(requestError.message?.startsWith("Firebase is not configured")
        ? requestError.message
        : "Registration could not be completed. Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace(readReturnTo());
    } catch (requestError) {
      if (requestError.code !== "auth/popup-closed-by-user") {
        setError(requestError.message?.startsWith("Firebase is not configured")
          ? requestError.message
          : "Google sign-in could not be completed.");
      }
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="app-page relative flex flex-col items-center justify-center px-4 py-16">
      <Background />

      <div className="app-panel z-10 w-full max-w-3xl p-6 sm:p-10">
        <h1 className="mb-2 text-center text-4xl font-bold text-white">
          Create account
        </h1>
        <p className="mb-8 text-center text-muted">Choose Chippy or Lucky, or use your Google image.</p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting || googleSubmitting || Boolean(authError)}
          className="ui-button-secondary w-full"
        >
          {googleSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase text-muted">
          <span className="h-px flex-1 bg-line" />
          <span>or email</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <label htmlFor="register-name" className="block text-sm font-medium text-white">Display name</label>
          <input
            id="register-name"
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="name"
            maxLength={160}
            className="ui-field"
            required
          />

          <ProfileAvatarPicker
            disabled={submitting || googleSubmitting}
            selectedId={profileIcon}
            onSelect={setProfileIcon}
          />

          <label htmlFor="register-email" className="block text-sm font-medium text-white">Email</label>
          <input
            id="register-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="ui-field"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-white">Password</label>
              <input
                id="register-password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                autoComplete="new-password"
                className="ui-field mt-1"
                required
              />
            </div>
            <div>
              <label htmlFor="register-password-confirmation" className="block text-sm font-medium text-white">Confirm password</label>
              <input
                id="register-password-confirmation"
                type="password"
                placeholder="Repeat password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                minLength={8}
                autoComplete="new-password"
                className="ui-field mt-1"
                required
              />
            </div>
          </div>

          {(error || authError) && <p role="alert" className="ui-toast border-rose-400 text-rose-100">{error || authError}</p>}

            <button
              type="submit"
              disabled={!isFormValid || submitting || googleSubmitting || Boolean(authError)}
              className="ui-button-primary w-full"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Create account
            </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-white">
            Already have an account?{" "}
            <button
              onClick={() => router.push(`/login?returnTo=${encodeURIComponent(readReturnTo())}`)}
              className="underline text-blue-400 hover:text-blue-300 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
