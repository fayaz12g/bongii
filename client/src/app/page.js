"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Background from "./components/background";
import Footer from "./components/footer";
import { motion } from "framer-motion";
import { Upload, Play } from "lucide-react";
import { setServerBase } from "./utils/config";
import { profileService } from "./services/profileService";
import { BackgroundProvider } from "./components/context";

export default function Home() {
  const router = useRouter();
  const [server, setServer] = useState("production");
  const [showServer, setShowServer] = useState(false);

  const handleServerChange = (e) => {
    const selected = e.target.value;
    setServer(selected);
    setServerBase(selected);
  };

  const handleCreateSubmit = () => {
    profileService.getUserData().then((response) => {
      if (!response.ok) {
        router.push("/login");
      } else {
        router.push("/create");
      }
    });
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <BackgroundProvider>
      <Background />
      <div className="flex-1 flex flex-col justify-center items-center px-6">
        <div className="w-full max-w-2xl space-y-6 text-center">
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
            onClick={() => router.push("/play")}
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

          {/* Server Selector */}
          {showServer && (
            <div>
              <h1 className="text-2xl font-bold mb-4">Select Server</h1>
              <select
                value={server}
                onChange={handleServerChange}
                className="p-2 border rounded"
              >
                <option value="production">Bongii (https://bongii.fly.dev)</option>
                <option value="localhost">Localhost (http://localhost:3000)</option>
              </select>
            </div>
          )}
        </div>
      </div>
      <Footer />
      </BackgroundProvider>
    </div>
  );
}
