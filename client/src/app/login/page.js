"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { userService } from "../services/userService";
import Background from "../components/background";
import { BackgroundProvider } from "../components/context";
import Footer from "../components/footer";

export default function LoginPage() {
  const router = useRouter();
  const [responseGet, setResponseGet] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);

  // Check if all required fields are filled
  useEffect(() => {
    setIsFormValid(username && password);
  }, [username, password]);

  const handleSubmit = (username, password) => {
    if (username && password) {
      userService
        .loginUser(username, password)
        .then((response) => {
          if (response.ok) {
            return response.json();
          } else {
            alert("Invalid Credentials");
          }
        })
        .then((data) => {
          if (data?.token) {
            localStorage.setItem("token", data.token);
            router.push("/home");
          }
        });
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center">
      <BackgroundProvider>
      <Background />

      {/* Glassy Centered Form */}
      <div className="z-10 w-full max-w-md p-8 rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
        <h1 className="text-4xl font-bold text-white text-center mb-8">Login</h1>

        <form className="space-y-6">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white/10 text-white placeholder-gray-300 transition-all"
              placeholder="Enter username"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white/10 text-white placeholder-gray-300 transition-all"
              placeholder="Enter password"
            />
          </div>

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
              onClick={() => handleSubmit(username, password)}
              disabled={!isFormValid}
              className={`w-full md:w-auto px-6 py-3 rounded-xl font-semibold transition-all ${
                isFormValid
                  ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                  : "bg-gray-500 text-gray-300 cursor-not-allowed"
              }`}
            >
              Login
            </button>
          </div>

          {responseGet && (
            <p className="text-sm text-red-500 mt-2 text-center">{responseGet}</p>
          )}
        </form>

        {/* Register Area */}
        <div className="mt-6 text-center">
          <p className="text-white">
            Don't have an account?{" "}
            <button
              onClick={() => router.push("/register")}
              className="underline text-blue-400 hover:text-blue-300 font-medium"
            >
              Register
            </button>
          </p>
        </div>
      </div>

      <Footer />
      </BackgroundProvider>
    </div>
  );
}
