"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, X } from "lucide-react";
import { campaignService } from "../../services/campaignService";
import Background from "@/app/components/background";
import { BackgroundProvider } from "@/app/components/context";

export default function PlayerBoardPage() {
  const { boardCode } = useParams();
  const router = useRouter();
  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const res = await campaignService.getPlayerBoard(boardCode);
        if (res.ok) {
          const data = await res.json();
          setBoardData(data);
        } else if (res.status === 404) {
          setError("Board not found");
        } else {
          setError("Failed to load board");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch board");
      } finally {
        setLoading(false);
      }
    };

    if (boardCode) fetchBoard();
  }, [boardCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-white mx-auto mb-4"></div>
          <p>Loading board...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Error</h1>
          <p>{error}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-4 py-2 bg-red-500 rounded hover:bg-red-600"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const { tiles, boardSize, campaignTitle } = boardData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <BackgroundProvider>
        <Background />
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl text-white font-bold mb-6">{campaignTitle}</h1>
        <div
          className="grid gap-4 mx-auto"
          style={{ gridTemplateColumns: `repeat(${boardSize}, 1fr)` }}
        >
          {tiles.map((cell, index) => (
            <div
              key={index}
              className={`aspect-square border-2 rounded-xl flex items-center justify-center p-2 text-center transition-all ${
                cell.isCenter
                  ? "bg-yellow-500/30 border-yellow-400 text-yellow-100"
                  : cell.categoryItemId
                  ? "bg-green-500/30 border-green-400 text-green-100"
                  : "bg-white/10 border-white/30 text-white/50"
              }`}
            >
            {/* {!cell.categoryId ? ( */}
              {cell.isCenter ? (
                <div className="text-center">
                  <User className="w-6 h-6 mx-auto mb-1" />
                  <div className="text-xs">{boardData.playerName || "Free Space"}</div>
                </div>
              ) : cell.categoryItemId ? (
                <div className="text-xs break-words">{cell.customText || cell.text}</div>
              ) : (
                <div className="text-xs">Empty</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </BackgroundProvider>
    </div>
  );
}
