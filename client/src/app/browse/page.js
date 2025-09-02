"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../components/header";
import Background from "../components/background";
import { BackgroundProvider } from "../components/context";
import Footer from "../components/footer";
import { campaignService } from "../services/campaignService";

export default function Browse() {
  const [campaigns, setCampaigns] = useState([]);

  const loadCampaigns = async () => {
    try {
      const res = await campaignService.getCampaigns();
      if (!res.ok) {
        console.error("Failed to fetch campaigns");
        return;
      }
      const data = await res.json();
      console.log("Fetched campaigns:", data);
      setCampaigns(data);
    } catch (err) {
      console.error("Error loading campaigns:", err);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  return (
    <div>
      <Header />
      <br />
      <Background />
      <main className="max-w-5xl mx-auto p-6 mt-24">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Browse Campaigns</h1>
          <p className="text-lg text-gray-300">
            Explore public Bongii campaigns and jump into the fun!
          </p>
        </div>

        {campaigns.length === 0 ? (
          <p className="text-center text-gray-400 italic">
            No campaigns available yet. Check back soon!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.map((c) => (
              <Link key={c.code} href={`/${c.code}`}>
                <div className="bg-white/10 rounded-xl p-6 shadow-lg hover:bg-white/20 transition cursor-pointer">
                  {/* Background preview box */}
                  <div
                    className={`w-full h-64 rounded-lg mb-4 bg-gradient-to-r ${
                      c.backgroundPreset?.gradient || ""
                    } ${c.backgroundPreset?.animation === "shimmer" ? "animate-shimmer" : ""}`}
                  />

                  {/* Campaign Details */}
                  <h2 className="text-2xl font-semibold mb-2">{c.title}</h2>
                  <p className="text-gray-300 mb-2 line-clamp-3">
                    {c.description || "No description provided."}
                  </p>
                  <p className="text-sm text-gray-400">
                    Code: <span className="font-mono">{c.code}</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
