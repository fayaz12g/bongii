"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../components/header";
import Background from "../components/background";
import { BackgroundProvider } from "../components/context";
import Footer from "../components/footer";
import { campaignService } from "../services/campaignService";

export default function BrowseBoards() {
  const [boards, setBoards] = useState([]);

  const loadBoards = async () => {
    try {
      const res = await campaignService.getAllBoards(); // You need this endpoint
      if (!res.ok) {
        console.error("Failed to fetch boards");
        return;
      }
      const data = await res.json();
      console.log("Fetched boards:", data);
      setBoards(data);
    } catch (err) {
      console.error("Error loading boards:", err);
    }
  };

  useEffect(() => {
    loadBoards();
  }, []);

  // Group boards by campaign
  const boardsByCampaign = boards.reduce((acc, board) => {
    const campaignTitle = board.campaignTitle || "Unknown Campaign";
    if (!acc[campaignTitle]) acc[campaignTitle] = [];
    acc[campaignTitle].push(board);
    return acc;
  }, {});

  return (
    <div>
      <BackgroundProvider>
        <Header />
        <br />
        <Background />

        <main className="max-w-5xl mx-auto p-6 mt-24">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">Browse Boards</h1>
            <p className="text-lg text-gray-300">
              Explore all player boards organized by campaign!
            </p>
          </div>

          {boards.length === 0 ? (
            <p className="text-center text-gray-400 italic">
              No boards available yet. Check back soon!
            </p>
          ) : (
            Object.entries(boardsByCampaign).map(([campaignTitle, boards]) => (
              <div key={campaignTitle} className="mb-12">
                <h2 className="text-3xl font-semibold text-white mb-6">{campaignTitle}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {boards.map((board) => (
                    <Link key={board.boardCode} href={`/boards/${board.boardCode}`}>
                      <div className="bg-white/10 rounded-xl p-6 shadow-lg hover:bg-white/20 transition cursor-pointer">
                        {/* Background preview box */}
                        <div
                          className={`w-full h-48 rounded-lg mb-4 bg-gradient-to-r ${
                            board.backgroundPreset?.gradient || ""
                          } ${board.backgroundPreset?.animation ? `animate-${board.backgroundPreset.animation}` : ""}`}
                        />

                        {/* Board Details */}
                        <h3 className="text-2xl font-semibold mb-2">{board.playerName || "Unnamed Board"}</h3>
                        <p className="text-gray-300 mb-2 line-clamp-3">
                          Campaign: {campaignTitle}
                        </p>
                        <p className="text-sm text-gray-400">
                          Code: <span className="font-mono">{board.boardCode}</span>
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </main>

        <Footer />
      </BackgroundProvider>
    </div>
  );
}
