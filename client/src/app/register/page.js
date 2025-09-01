"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { userService } from "../services/userService";
import Background from "../components/background";
import { BackgroundProvider } from "../components/context";
import Footer from "../components/footer";

export default function RegisterPage() {
  const router = useRouter();
  const [responseGet, setResponseGet] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);
  const [profileIcon, setProfileIcon] = useState("1");

  useEffect(() => {
    setIsFormValid(firstName && lastName && username && password);
  }, [firstName, lastName, username, password]);

  const handleSubmit = () => {
    if (!isFormValid) return;

    userService
      .addUser(firstName, lastName, username, password, email)
      .then((response) => {
        if (response.ok) {
          // Auto login after registration
          userService.loginUser(username, password).then((loginResp) => {
            if (loginResp.ok) {
              loginResp.json().then((data) => {
                localStorage.setItem("token", data.token);
                router.push("/home");
              });
            }
          });
        } else {
          alert("Error: Username Already Exists.");
        }
      });
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center">
      <BackgroundProvider>
      <Background />

      <div className="z-10 w-full max-w-3xl p-10 rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          Register
        </h1>

        <form className="space-y-6">
          {/* Profile Icons */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Select Profile Icon <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {["1", "2", "3", "4"].map((id) => (
                <div
                  key={id}
                  onClick={() => setProfileIcon(id)}
                  className={`cursor-pointer rounded-lg ${
                    profileIcon === id
                      ? "border-8 border-white-500" // thicker border when selected
                      : "border-0 border-red-600" // thinner default border
                  }`}
                >
                  <img
                    src={`/icon-${id}.png`}
                    alt={`Profile Icon ${id}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Name Fields */}
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border bg-white/10 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border bg-white/10 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
            />
          </div>

          {/* Username */}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border bg-white/10 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border bg-white/10 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
          />

          {/* Email */}
          <input
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border bg-white/10 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
          />

          {/* Buttons */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-4">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full md:w-auto px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid}
              className={`w-full md:w-auto px-6 py-3 rounded-xl font-semibold transition-all ${
                isFormValid
                  ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                  : "bg-gray-500 text-gray-300 cursor-not-allowed"
              }`}
            >
              Register
            </button>
          </div>

          {responseGet && (
            <p className="text-sm text-red-500 mt-2 text-center">{responseGet}</p>
          )}
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
    </BackgroundProvider>
    </div>
  );
}
