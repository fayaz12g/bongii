"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams} from "next/navigation";
import { campaignService } from "../../services/campaignService";
import Header from "../../components/header";
import Footer from "../../components/footer";
import Background from "../../components/background";
import { BackgroundProvider } from "../../components/context";
import { V } from "framer-motion/dist/types.d-6pKw1mTI";

export default function ModerateCampaignPage() {
  const { campaignCode } = useParams(); // get campaign code from URL
  const [campaign, setCampaign] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const loadCampaign = async () => {
    try {
      const response = await campaignService.getCampaign(campaignCode);
      if (response.ok) {
          const data = await response.json();
          console.log(data);
          setCampaign(data);
          updateTimeLeft(data.startDateTime);
      }
    } catch (err) {
      console.error("Error loading campaign:", err);
    }
  };

  const updateTimeLeft = (startDateTime) => {
    const interval = setInterval(() => {
      const now = new Date();
      const start = new Date(startDateTime);
      const diff = start - now;

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
      } else {
        setTimeLeft(diff);
      }
    }, 1000);
  };
  
  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
    else {
      loadCampaign();
    }
  }, [router, campaignCode]);


  if (!campaign) {
    return (
      <div>
        <BackgroundProvider>
          <Background />
          <Header />
          <main className="max-w-5xl mx-auto p-6 mt-24 text-center text-gray-400">
            Loading campaign...
          </main>
          <Footer />
        </BackgroundProvider>
      </div>
    );
  }

  const formatTime = (ms) => {
    if (ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div>
      <BackgroundProvider selectedPreset={campaign.backgroundPreset}>
        <Background />
        <Header />
        <br />
        <main className="max-w-5xl mx-auto p-6 mt-24">

          {/* Campaign Info */}
          <div className="mb-6 text-center">
            <h1 className="text-4xl font-bold mb-2">{campaign.title}</h1>
            <p className="text-gray-300 mb-2">{campaign.description || "No description provided."}</p>
            <p className="text-sm text-gray-400 mb-4">
              Players: {campaign.playerCount || 0}
            </p>

            {/* Countdown or Start Button */}
            {timeLeft > 0 ? (
              <p className="text-2xl font-mono text-green-400">
                Starts in: {formatTime(timeLeft)}
              </p>
            ) : (
              <button className="mt-4 bg-blue-500 text-white px-6 py-3 rounded-lg text-xl font-semibold hover:bg-blue-600 transition">
                Start Campaign
              </button>
            )}
          </div>

          {/* Categories and Items */}
          <div className="space-y-8">
            {campaign.categories.map((category) => (
              <div key={category.id}>
                <h2 className="text-2xl font-semibold mb-4">{category.name}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-white/10 rounded-lg shadow hover:bg-white/20 transition text-center"
                    >
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </BackgroundProvider>
    </div>
  );
}
