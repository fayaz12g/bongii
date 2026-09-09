"use client";

import { Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Background from "../components/background";
import { useAuth } from "../components/authContext";
import Footer from "../components/footer";
import { safeReturnTo } from "../utils/authRedirect.mjs";

const readReturnTo = () => safeReturnTo(
  new URLSearchParams(window.location.search).get("returnTo"),
);

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { authError, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      await requestPasswordReset(email, readReturnTo());
      setMessage("If an account exists for that email, a reset link is on its way.");
    } catch (error) {
      if (error.message?.startsWith("Firebase is not configured")) setMessage(error.message);
      else setMessage("If an account exists for that email, a reset link is on its way.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-page relative flex min-h-screen flex-col">
      <Background />
      <main className="z-10 flex flex-1 items-center justify-center px-4 py-16">
        <div className="app-panel w-full max-w-md p-6 sm:p-8">
          <h1 className="text-center text-3xl font-bold text-white">Reset password</h1>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-white">Email</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="ui-field"
                required
              />
            </div>
            <button type="submit" disabled={!email || submitting || Boolean(authError)} className="ui-button-primary w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send reset link
            </button>
            {(message || authError) && <p role="status" className="ui-toast">{message || authError}</p>}
          </form>
          <button
            type="button"
            onClick={() => router.push(`/login?returnTo=${encodeURIComponent(readReturnTo())}`)}
            className="mt-6 w-full text-center text-sm text-blue-300 underline hover:text-blue-200"
          >
            Back to sign in
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}