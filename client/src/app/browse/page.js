"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../components/header";
import Background from "../components/background";
import Footer from "../components/footer";
import { campaignService } from "../services/campaignService";

const statusLabels = {
  open: "Open",
  locked: "Entries locked",
  moderating: "Moderating",
  completed: "Completed",
};

export default function Browse() {
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    let active = true;

    campaignService.getCampaigns().then(async (response) => {
      if (!response.ok) throw new Error("Failed to fetch campaigns");
      const data = await response.json();
      if (active) setCampaigns(data);
    }).catch((error) => {
      console.error("Error loading campaigns:", error);
    });

    return () => {
      active = false;
    };
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
                  <span className="mt-3 inline-block rounded-md border border-white/25 bg-black/20 px-2 py-1 text-xs font-semibold text-white">
                    {statusLabels[c.status] || c.status}
                  </span>
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
