"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Background from "./components/background";
import Footer from "./components/footer";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Play, Loader2 } from "lucide-react";
import { profileService } from "./services/profileService";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await profileService.getUserData();
      if (!response.ok) {
        router.push("/login");
      } else {
        router.push("/create");
      }
    } catch (err) {
      console.error(err);
      router.push("/login");
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
        <Background />

        {/* Loading overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-50"
            >
              <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
              <p className="text-white text-lg font-semibold">
                Connecting to server...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col justify-center items-center px-6">
          <div className="w-full max-w-2xl space-y-6 text-center">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center items-center mb-20"
            >
              <Image
                src="/logo.png"
                alt="App Logo"
                width={320}
                height={128}
                priority
                className="h-auto w-full max-w-80 object-contain"
              />
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

          </div>
        </div>
        <Footer />
    </div>
  );
}
