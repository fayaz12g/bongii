"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { campaignService } from "../services/campaignService";
import Footer from "../components/footer";
import Background from "../components/background";
import Header from "../components/header";

const statusLabels = {
  draft: "Draft",
  open: "Open",
  locked: "Entries locked",
  moderating: "Moderating",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function Moderate() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    let active = true;
    campaignService.getUserCampaigns().then(async (response) => {
      if (!response.ok) throw new Error("Failed to load campaigns");
      const data = await response.json();
      if (active) setCampaigns(data);
    }).catch((error) => {
      console.error("Error loading campaigns:", error);
    });

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div>
        <Background />
        <Header />
        <br />
        <main className="max-w-5xl mx-auto p-6 mt-24">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">My Campaigns</h1>
            <p className="text-lg text-gray-300">
              Manage your campaigns here. Delete or edit as needed.
            </p>
          </div>

          {campaigns.length === 0 ? (
            <p className="text-center text-gray-400 italic">
              You haven’t created any campaigns yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {campaigns.map((c) => (
                <div
                  key={c.code}
                  className="bg-white/10 rounded-xl p-6 shadow-lg hover:bg-white/20 transition flex flex-col justify-between"
                >
                  {/* Background preview box */}
                  <div
                    className={`w-full h-64 rounded-lg mb-4 bg-gradient-to-r ${
                      c.backgroundPreset?.gradient || ""
                    } ${
                      c.backgroundPreset?.animation
                        ? `animate-${c.backgroundPreset.animation}`
                        : ""
                    }`}
                  />

                  {/* Campaign Details */}
                  <div>
                    <Link href={`/moderate/${c.code}`}>
                      <h2 className="text-2xl font-semibold mb-2 hover:underline">
                        {c.title}
                      </h2>
                    </Link>
                    <p className="text-gray-300 mb-2 line-clamp-3">
                      {c.description || "No description provided."}
                    </p>
                    <p className="text-sm text-gray-400">
                      Players: {c.playerCount || 0}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {statusLabels[c.status] || c.status} · Version {c.version}
                    </p>
                  </div>

                  <Link
                    href={`/moderate/${c.code}`}
                    className="mt-4 inline-flex justify-center bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-500"
                  >
                    Manage campaign
                  </Link>
                </div>
              ))}
            </div>
          )}
        </main>
        <Footer />
    </div>
  );
}
