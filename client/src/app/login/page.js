"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { userService } from "../services/userService";
import Background from "../components/background";
import Footer from "../components/footer";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const isFormValid = Boolean(username && password);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/home");
    }
  }, [router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid) return;
    setError("");
    try {
      const response = await userService.loginUser(username, password);
      if (!response.ok) {
        setError("The username or password is incorrect.");
        return;
      }
      const data = await response.json();
      localStorage.setItem("token", data.token);
      router.push("/home");
    } catch {
      setError("Sign in is unavailable. Please try again.");
    }
  };

  return (
    <div className="app-page relative flex min-h-screen flex-col">
      <Background />

      <main className="z-10 flex flex-1 items-center justify-center px-4 py-16">
      <div className="app-panel w-full max-w-md p-6 sm:p-8">
        <h1 className="text-4xl font-bold text-white text-center mb-8">Login</h1>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Username */}
          <div>
            <label htmlFor="login-username" className="block text-sm font-medium text-white mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="ui-field"
              placeholder="Enter username"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-white mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="ui-field"
              placeholder="Enter password"
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-4">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="ui-button-danger w-full md:w-auto"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!isFormValid}
              className="ui-button-primary w-full md:w-auto"
            >
              Login
            </button>
          </div>

          {error && (
            <p role="alert" className="ui-toast border-rose-400 text-rose-100">{error}</p>
          )}
        </form>

        {/* Register Area */}
        <div className="mt-6 text-center">
          <p className="text-white">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="underline text-blue-400 hover:text-blue-300 font-medium"
            >
              Register
            </button>
          </p>
        </div>
      </div>
      </main>

      <Footer />
    </div>
  );
}
