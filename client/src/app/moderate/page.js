"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from 'next/navigation';
import Link from "next/link";
import { campaignService } from "../services/campaignService";
import Footer from "../components/footer";
import Background from "../components/background";
import { BackgroundProvider } from "../components/context";
import Header from "../components/header";

export default function Moderate() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);

  const loadCampaigns = async () => {
    try {
      const res = await campaignService.getUserCampaigns();
      const data = await res.json();
      setCampaigns(data);
    } catch (err) {
      console.error("Error loading campaigns:", err);
    }
  };

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
    else {
      loadCampaigns();
    }
  }, [router]);

  const handleDelete = async (code) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      const res = await campaignService.deleteCampaign(code);
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.code !== code));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete campaign");
      }
    } catch (err) {
      console.error("Error deleting campaign:", err);
    }
  };

  return (
    <div>
      <BackgroundProvider>
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
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(c.code)}
                    className="mt-4 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>

        <Footer />
      </BackgroundProvider>
    </div>
  );
}
