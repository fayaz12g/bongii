"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Background from "../components/background";
import Footer from "../components/footer";
import { campaignService } from "../services/campaignService";
import Link from "next/link";
import { BackgroundProvider } from "../components/context";

export default function PlayPage() {
  const router = useRouter();
  const [campaignCode, setCampaignCode] = useState("");

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

  return (
    <div className="relative min-h-screen flex flex-col">
        <BackgroundProvider>
      <Background />
      <div className="flex-1 flex flex-col justify-center items-center px-6">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/30 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/20 shadow-2xl"
          >
            <div className="flex justify-start mb-6">
              <button
                onClick={() => router.push("/")}
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
          </motion.div>
        </div>
        
        {/* Browse Area */}
        <div className="mt-6 text-center">
          <p className="text-white">
            Looking for a campaign?{" "}
            <button
              onClick={() => router.push("/browse")}
              className="underline text-blue-400 hover:text-blue-300 font-medium"
            >
              Browse Campaigns
            </button>
          </p>
        </div>

      </div>
      <Footer />
    </BackgroundProvider>
    </div>
  );
}
