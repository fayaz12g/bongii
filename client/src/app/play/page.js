"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Background from "../components/background";
import Footer from "../components/footer";
import { campaignService } from "../services/campaignService";
import Link from "next/link";

export default function PlayPage() {
  const router = useRouter();
  const [campaignCode, setCampaignCode] = useState("");
  const [error, setError] = useState("");

  const handlePlaySubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (campaignCode.length === 4) {
      try {
        const isValid = await campaignService.validateCampaign(campaignCode);
        if (isValid) {
          router.push(`/${campaignCode}`);
        }
      } catch (error) {
        setError(error.message);
      }
    } else {
      setError("Enter a 4-letter campaign code.");
    }
  };

  return (
    <div className="app-page relative flex min-h-screen flex-col">
      <Background />
      <div className="flex-1 flex flex-col justify-center items-center px-6">
        <div className="w-full max-w-2xl">
          <motion.div
            className="app-panel p-6 sm:p-8"
          >
            <div className="flex justify-start mb-6">
              <button
                onClick={() => router.push("/")}
                className="ui-button-secondary"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span className="font-medium">Back</span>
              </button>
            </div>
            <h1 className="text-2xl font-bold text-white mb-6">Enter a campaign code</h1>
            <form onSubmit={handlePlaySubmit}>
            <label htmlFor="campaign-code" className="sr-only">Campaign code</label>
            <input
              id="campaign-code"
              type="text"
              value={campaignCode}
              onChange={(e) => setCampaignCode(e.target.value.toUpperCase())}
              maxLength={4}
              autoComplete="off"
              aria-describedby={error ? "campaign-code-error" : undefined}
              className="ui-field text-center text-xl font-bold uppercase tracking-widest"
              placeholder="ABCD"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              className="ui-button-primary mt-6 w-full"
            >
              Play
            </motion.button>
            {error && <p id="campaign-code-error" role="alert" className="ui-toast mt-4 border-rose-400 text-rose-100">{error}</p>}
            </form>
          </motion.div>
        </div>
        
        {/* Browse Area */}
        <div className="mt-6 text-center">
          <p className="text-white">
            Looking for a campaign?{" "}
            <Link
              href="/browse"
              className="underline text-blue-400 hover:text-blue-300 font-medium"
            >
              Browse Campaigns
            </Link>
          </p>
        </div>

      </div>
      <Footer />
    </div>
  );
}
