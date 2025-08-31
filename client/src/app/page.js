"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Background from "./components/background";
import { setServerBase } from './utils/config';
import Footer from "./components/footer";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Play, ArrowLeft } from "lucide-react";
import { userService } from "./services/userService";
import { campaignService } from "./services/campaignService";
import { profileService } from "./services/profileService";

export default function Home() {

  const [server, setServer] = useState('production');

  const handleServerChange = (e) => {
    const selected = e.target.value;
    setServer(selected);
    setServerBase(selected); // updates the shared server path
  };

  const router = useRouter();
  const [step, setStep] = useState("main"); // "main" | "play" | "create-login" | "create-register"
  const [campaignCode, setCampaignCode] = useState("");

  // login states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // register states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [email, setEmail] = useState("");
  const [profileIcon, setProfileIcon] = useState("1");
  const [isFormValid, setIsFormValid] = useState(false);
  const [responseGet, setResponseGet] = useState("");

  const [showServer, setShowServer] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    // Create audio element and play on mount
    audioRef.current = new Audio("/music/bongii.mp3");
    audioRef.current.loop = true;
    audioRef.current.volume = 0.7;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const startAudio = () => {
    if (!audioStarted && audioRef.current) {
      audioRef.current.play().catch(() => {});
      setAudioStarted(true);
    }
  };

  useEffect(() => {
    setIsFormValid(firstName && lastName && regUsername && regPassword);
  }, [firstName, lastName, regUsername, regPassword]);

  // --- PLAY ---
  const handlePlaySubmit = async () => {
    if (campaignCode.length === 4) {
      try {
        const isValid = await campaignService.validateCampaign(campaignCode);
        if (isValid) {
          router.push(`/${campaignCode}`);
        }
      } catch (error) {
        alert(error.message);
      }
    } else {
      alert("Please enter a 4-letter code.");
    }
  };

    const handleCreateSubmit = async () => {
    // Check if the token exists in localStorage
    const token = localStorage.getItem('token');
    console.log("Checking access");
    profileService.getUserData().then(response => {
        if (!response.ok) {
          router.push('/login'); // Redirect to login page
        }
        else {
          console.log("User has access");
          router.push('/create'); // Redirect to create page
        }
    });
  };


  // --- LOGIN ---
  const handleLogin = async () => {
    const response = await userService.loginUser(username, password);
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("token", data.token);
      router.push("/create");
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div
      className="relative min-h-screen flex flex-col"
      onClick={startAudio}
      tabIndex={0} // makes div focusable for accessibility
      style={{ outline: "none" }}
    >
      <Background />
      <div className="flex-1 flex flex-col justify-center items-center px-6">
        <div className="w-full max-w-2xl space-y-6 text-center">
          {/* ---------- MAIN MENU ---------- */}
          <AnimatePresence>
            {step === "main" && (
              <>
                {/* Logo */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center items-center mb-20"
                  onClick={() => setShowServer(!showServer)}
                >
                  <img src="/logo.png" alt="App Logo" className="h-25 object-contain" />
                </motion.div>

                {/* Play */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5 rounded-2xl shadow-lg flex items-center justify-center space-x-3 border-4 border-white/30 hover:border-white/50 transition-colors"
                  onClick={() => setStep("play")}
                >
                  <Play className="w-6 h-6" />
                  <span className="text-lg font-semibold">Play</span>
                </motion.button>

                {/* Create */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full bg-gradient-to-r from-green-400 to-green-500 text-white p-5 rounded-2xl shadow-lg flex items-center justify-center space-x-3 border-4 border-white/30 hover:border-white/50 transition-colors"
                   onClick={handleCreateSubmit}
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-lg font-semibold">Create</span>
                </motion.button>

              {/* Server */}
              {showServer && <div><h1 className="text-2xl font-bold mb-4">Select Server</h1>
              <select value={server} onChange={handleServerChange} className="p-2 border rounded">
                <option value="production">Bongii (https://bongii.fly.dev)</option>
                <option value="localhost">Localhost (http://localhost:3001)</option>
              </select>
            </div>}
              </>
              
            )}
          </AnimatePresence>

          {/* ---------- PLAY FLOW ---------- */}
          <AnimatePresence>
            {step === "play" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/20 shadow-2xl">
                  <div className="flex justify-start mb-6">
                    <button
                      onClick={() => setStep("main")}
                      className="flex items-center text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl border-2 border-white/30 hover:border-white/50 transition-all"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      <span className="font-medium">Back</span>
                    </button>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-6">Enter a campaign code</h2>
                  <input
                    type="text"
                    value={campaignCode}
                    onChange={(e) => setCampaignCode(e.target.value.toUpperCase())}
                    maxLength={4}
                    className="w-full px-4 py-3 border-3 border-white/40 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white/10 text-white placeholder-gray-300 uppercase text-center tracking-widest text-xl font-bold transition-all"
                    placeholder="ABCD"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handlePlaySubmit}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-2xl shadow-lg font-semibold border-4 border-white/30 hover:border-white/50 transition-colors mt-6"
                  >
                    Play
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ---------- CREATE LOGIN FLOW ---------- */}
          <AnimatePresence>
            {step === "create-login" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/20 shadow-2xl">
                  <div className="flex justify-start mb-6">
                    <button
                      onClick={() => setStep("main")}
                      className="flex items-center text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl border-2 border-white/30 hover:border-white/50 transition-all"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      <span className="font-medium">Back</span>
                    </button>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-6">
                    Login first to create a new campaign
                  </h2>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-indigo-900/70 text-white placeholder-gray-300 border-3 border-white/30 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-indigo-900/70 text-white placeholder-gray-300 border-3 border-white/30 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="flex justify-between items-center mt-6">
                    <button
                      onClick={() => setStep("create-register")}
                      className="text-sm text-gray-300 underline hover:text-white transition-colors font-medium"
                    >
                      Need an account?
                    </button>
                    <button
                      onClick={handleLogin}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white font-semibold border-3 border-white/30 hover:border-white/50 hover:scale-105 transition-all"
                    >
                      Login
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Footer />
    </div>
  );
}
