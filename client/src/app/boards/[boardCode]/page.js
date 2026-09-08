"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { User } from "lucide-react";
import { campaignService } from "../../services/campaignService";
import Background from "@/app/components/background";
import Header from "@/app/components/header";
import Footer from "@/app/components/footer";
import { useBackground } from "../../components/context";

const statusDetails = {
  open: { label: "Open", message: "Board submissions are still open." },
  locked: { label: "Entries locked", message: "Submitted boards are now read-only." },
  moderating: { label: "Moderating", message: "Campaign outcomes are being reviewed." },
  completed: { label: "Completed", message: "This campaign has been finalized." },
  cancelled: { label: "Cancelled", message: "This campaign was cancelled." },
};

export default function PlayerBoardPage() {
  const { boardCode } = useParams();
  const router = useRouter();
  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { setSelectedPreset } = useBackground();

  // Track player marking state (null=unmarked, "right", "wrong")
  const [marks, setMarks] = useState([]);

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const res = await campaignService.getPlayerBoard(boardCode);
        if (res.ok) {
          const data = await res.json();
          setBoardData(data);
          setSelectedPreset(data.backgroundPreset);

          // Initialize marking array
          setMarks(Array(data.tiles.length).fill(null));
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
  }, [boardCode, setSelectedPreset]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-white mx-auto mb-4"></div>
          <p>Loading board...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Error</h1>
          <p>{error}</p>
          <button
            onClick={() => router.push("/boards")}
            className="mt-4 px-4 py-2 bg-red-500 rounded hover:bg-red-600"
          >
            Back
          </button>
        </div>
      </div>
    );

  const { tiles, boardSize, campaignTitle } = boardData;

  // Toggle mark state
  const handleTileClick = (index) => {
  setMarks((prev) => {
    const next = [...prev];
    if (next[index] === null) next[index] = "right";
    else if (next[index] === "right") next[index] = "wrong";
    else next[index] = null;
    return next;
  });
};


  const campaignStatus = statusDetails[boardData.campaignStatus] || {
    label: boardData.campaignStatus,
    message: "This submitted board is read-only.",
  };

  // Helper: check winning lines
  const getWinningLines = () => {
   const lines = [];
    const size = boardSize;

    // Rows
    for (let r = 0; r < size; r++) {
      const row = Array.from({ length: size }, (_, c) => r * size + c);
      if (row.every((i) => marks[i] === "right")) lines.push(row);
    }

    // Columns
    for (let c = 0; c < size; c++) {
      const col = Array.from({ length: size }, (_, r) => r * size + c);
      if (col.every((i) => marks[i] === "right")) lines.push(col);
    }

    // Diagonals
    const diag1 = Array.from({ length: size }, (_, i) => i * size + i);
    if (diag1.every((i) => marks[i] === "right")) lines.push(diag1);

    const diag2 = Array.from({ length: size }, (_, i) => i * size + (size - 1 - i));
    if (diag2.every((i) => marks[i] === "right")) lines.push(diag2);

    return lines;
  };

  const winningLines = getWinningLines();

  return (
    <div className="min-h-screen">
      <Background />
      <Header />
      <br />
      <br />
      <br />

      <div className="max-w-5xl mx-auto relative">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl text-white font-bold">{campaignTitle}</h1>
          <span className="rounded-md border border-white/30 bg-black/20 px-2.5 py-1 text-sm font-semibold text-white">
            {campaignStatus.label}
          </span>
        </div>
        <p className="text-gray-300 mb-6">{campaignStatus.message}</p>

        <div
          className="grid gap-4 mx-auto relative"
          style={{ gridTemplateColumns: `repeat(${boardSize}, 1fr)` }}
        >
          {tiles.map((cell, index) => {
            const mark = marks[index];
            return (
              <div
                key={index}
                onClick={() => handleTileClick(index)}
                className={`aspect-square border-2 rounded-xl flex items-center justify-center p-2 text-center cursor-pointer transition-all
                  ${
                    mark === "right"
                      ? "bg-green-500/70 border-green-400 text-white"
                      : mark === "wrong"
                      ? "bg-red-500/70 border-red-400 text-white"
                      : cell.isCenter
                      ? "bg-yellow-500/30 border-yellow-400 text-yellow-100"
                      : cell.categoryItemId
                      ? "bg-white/10 border-white/30 text-white"
                      : "bg-gray-800/50 border-gray-600 text-gray-400"
                  }`}
              >
                {cell.isCenter ? (
                  <div className="text-center">
                    <User className="w-6 h-6 mx-auto mb-1" />
                    <div className="text-xs">{boardData.playerName || "Free Space"}</div>
                  </div>
                ) : cell.categoryItemId ? (
                  <div className="text-xs break-words">
                    {cell.customText || cell.text}
                  </div>
                ) : (
                  <div className="text-xs">Empty</div>
                )}
              </div>
            );
          })}

          {/* Overlay lines for winning bingos */}
          {winningLines.map((line, i) => (
            <svg
              key={i}
              className="absolute inset-0 pointer-events-none"
              style={{ width: "100%", height: "100%" }}
            >
              <line
                x1={`${(line[0] % boardSize) * (100 / boardSize) + 50 / boardSize}%`}
                y1={`${Math.floor(line[0] / boardSize) * (100 / boardSize) + 50 / boardSize}%`}
                x2={`${(line[line.length - 1] % boardSize) * (100 / boardSize) + 50 / boardSize}%`}
                y2={`${
                  Math.floor(line[line.length - 1] / boardSize) * (100 / boardSize) +
                  50 / boardSize
                }%`}
                stroke="white"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </svg>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
