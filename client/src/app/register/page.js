"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { userService } from "../services/userService";
import Background from "../components/background";
import Footer from "../components/footer";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [profileIcon, setProfileIcon] = useState("1");
  const [error, setError] = useState("");
  const isFormValid = Boolean(firstName && lastName && username && password.length >= 8);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid) return;
    setError("");
    try {
      const response = await userService.addUser(firstName, lastName, username, password, email, profileIcon);
      if (!response.ok) {
        setError("That username is already in use.");
        return;
      }
      const loginResponse = await userService.loginUser(username, password);
      if (!loginResponse.ok) {
        setError("Your account was created, but sign-in failed. Please use the login page.");
        return;
      }
      const data = await loginResponse.json();
      localStorage.setItem("token", data.token);
      router.push("/home");
    } catch {
      setError("Registration could not be completed. Please try again.");
    }
  };

  return (
    <div className="app-page relative flex flex-col items-center justify-center px-4 py-16">
      <Background />

      <div className="app-panel z-10 w-full max-w-3xl p-6 sm:p-10">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          Register
        </h1>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Profile Icons */}
          <fieldset>
            <legend className="block text-sm font-medium text-white mb-2">
              Select Profile Icon <span className="text-red-500">*</span>
            </legend>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {["1", "2", "3", "4"].map((id) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setProfileIcon(id)}
                  aria-pressed={profileIcon === id}
                  className={`rounded-md border-2 p-2 ${
                    profileIcon === id
                      ? "border-focus bg-panel-strong"
                      : "border-line"
                  }`}
                >
                  <Image
                    src={`/icon-${id}.png`}
                    alt={`Profile Icon ${id}`}
                    width={160}
                    height={160}
                    priority={id === "1"}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </button>
              ))}
            </div>
          </fieldset>

          {/* Name Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor="register-first-name" className="sr-only">First name</label>
            <input
              id="register-first-name"
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              className="ui-field"
            />
            <label htmlFor="register-last-name" className="sr-only">Last name</label>
            <input
              id="register-last-name"
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              className="ui-field"
            />
          </div>

          {/* Username */}
          <label htmlFor="register-username" className="sr-only">Username</label>
          <input
            id="register-username"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="ui-field"
          />

          {/* Password */}
          <label htmlFor="register-password" className="sr-only">Password, 8 or more characters</label>
          <input
            id="register-password"
            type="password"
            placeholder="Password (8+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            className="ui-field"
          />

          {/* Email */}
          <label htmlFor="register-email" className="sr-only">Email, optional</label>
          <input
            id="register-email"
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="ui-field"
          />

          {error && <p role="alert" className="ui-toast border-rose-400 text-rose-100">{error}</p>}

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
              Register
            </button>
          </div>

        </form>

        {/* Login link */}
        <div className="mt-6 text-center">
          <p className="text-white">
            Already have an account?{" "}
            <button
              onClick={() => router.push("/login")}
              className="underline text-blue-400 hover:text-blue-300 font-medium"
            >
              Login
            </button>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
