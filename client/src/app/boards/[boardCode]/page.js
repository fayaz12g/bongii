"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Check, CircleDashed, RefreshCw, Trophy, User, Wifi, WifiOff, X } from "lucide-react";
import { campaignService } from "../../services/campaignService";
import Background from "@/app/components/background";
import Header from "@/app/components/header";
import Footer from "@/app/components/footer";
import { useBackground } from "../../components/context";
import { useCampaignRealtime } from "../../hooks/useCampaignRealtime";
import { applyBoardOutcome, getCompletedLinePositions } from "../../utils/campaignRealtime.mjs";

const statusDetails = {
  open: { label: "Open", message: "Board submissions are still open." },
  locked: { label: "Entries locked", message: "Submitted boards are now read-only." },
  moderating: { label: "Moderating", message: "Campaign outcomes are being reviewed." },
  completed: { label: "Completed", message: "This campaign has been finalized." },
  cancelled: { label: "Cancelled", message: "This campaign was cancelled." },
};

const outcomeDetails = {
  pending: {
    label: "Pending",
    icon: CircleDashed,
    className: "border-line bg-panel-strong text-white",
  },
  happened: {
    label: "Happened",
    icon: Check,
    className: "border-emerald-300 bg-happened text-white",
  },
  did_not_happen: {
    label: "Did not happen",
    icon: X,
    className: "border-rose-300 bg-failed text-white",
  },
};

const connectionLabels = {
  connected: "Live",
  connecting: "Connecting",
  reconnecting: "Syncing updates",
  error: "Live updates unavailable",
};

export default function PlayerBoardPage() {
  const { boardCode } = useParams();
  const router = useRouter();
  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [changedOutcome, setChangedOutcome] = useState(null);
  const { setSelectedPreset } = useBackground();

  const refreshBoard = async () => {
    const response = await campaignService.getPlayerBoard(boardCode);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to refresh board");
    setBoardData(data);
    setSelectedPreset(data.backgroundPreset);
  };

  useEffect(() => {
    let active = true;
    const fetchBoard = async () => {
      try {
        const res = await campaignService.getPlayerBoard(boardCode);
        const data = await res.json();
        if (!active) return;
        if (res.ok) {
          setBoardData(data);
          setSelectedPreset(data.backgroundPreset);
        } else if (res.status === 404) {
          setError("Board not found");
        } else {
          setError(data.error || "Failed to load board");
        }
      } catch (err) {
        console.error(err);
        if (active) setError("Failed to fetch board");
      } finally {
        if (active) setLoading(false);
      }
    };

    if (boardCode) fetchBoard();
    return () => {
      active = false;
    };
  }, [boardCode, setSelectedPreset]);

  useEffect(() => {
    if (!changedOutcome) return undefined;
    const timeout = window.setTimeout(() => setChangedOutcome(null), 700);
    return () => window.clearTimeout(timeout);
  }, [changedOutcome]);

  const { connectionState, reconnect } = useCampaignRealtime({
    campaignCode: boardData?.campaignCode,
    campaignVersion: boardData?.campaignVersion,
    onFinalized: refreshBoard,
    onOutcome(event) {
      if (boardData?.tiles.some((tile) => tile.categoryItemId === event.itemId)) {
        setChangedOutcome({ itemId: event.itemId, version: event.campaignVersion });
      }
      setBoardData((current) => {
        const result = applyBoardOutcome(current, event);
        return result.snapshot;
      });
    },
    onRefreshRequested: refreshBoard,
    onStatus(event) {
      setBoardData((current) => (
        !current || event.campaignVersion <= current.campaignVersion
          ? current
          : {
              ...current,
              campaignStatus: event.status,
              campaignVersion: event.campaignVersion,
            }
      ));
    },
  });

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

  const campaignStatus = statusDetails[boardData.campaignStatus] || {
    label: boardData.campaignStatus,
    message: "This submitted board is read-only.",
  };
  const completedLinePositions = getCompletedLinePositions({ boardSize, tiles });

  return (
    <div className="app-page">
      <Background />
      <Header />
      <br />
      <br />
      <br />

      <main className="max-w-3xl mx-auto px-4 pb-16 relative">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl text-white font-bold">{campaignTitle}</h1>
            <span className="rounded-md border border-white/30 bg-black/20 px-2.5 py-1 text-sm font-semibold text-white">
              {campaignStatus.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white" aria-live="polite">
            {connectionState === "connected" ? (
              <Wifi className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            ) : (
              <WifiOff className="h-4 w-4 text-amber-300" aria-hidden="true" />
            )}
            <span>{connectionLabels[connectionState] || "Connecting"}</span>
            {connectionState !== "connected" && (
              <button
                type="button"
                onClick={reconnect}
                className="rounded-md border border-white/30 p-1.5 hover:bg-white/10"
                aria-label="Reconnect live updates"
                title="Reconnect live updates"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <p className="text-gray-300 mb-6">{campaignStatus.message}</p>
        {boardData.campaignStatus === "completed" && (
          <Link
            href={`/leaderboards/${boardData.campaignCode}`}
            className="mb-6 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
          >
            <Trophy className="h-4 w-4" aria-hidden="true" />
            View leaderboard
          </Link>
        )}

        <div
          className="grid gap-2 sm:gap-3 mx-auto"
          style={{ gridTemplateColumns: `repeat(${boardSize}, 1fr)` }}
          role="grid"
          aria-label={`${campaignTitle} board`}
        >
          {Array.from({ length: boardSize }, (_, rowIndex) => (
            <div key={rowIndex} role="row" className="contents">
              {tiles.slice(rowIndex * boardSize, (rowIndex + 1) * boardSize).map((cell) => {
                const outcome = outcomeDetails[cell.outcome?.status] || outcomeDetails.pending;
                const OutcomeIcon = outcome.icon;
                const outcomeLabel = cell.isCenter ? "Free space" : outcome.label;
                const changed = changedOutcome?.itemId === cell.categoryItemId
                  && changedOutcome?.version === boardData.campaignVersion;
                const inCompletedLine = completedLinePositions.has(cell.position);
                return (
                  <div
                    key={cell.position}
                    role="gridcell"
                    aria-label={`${cell.customText || cell.text || "Free space"}: ${outcomeLabel}${inCompletedLine ? ", completed line" : ""}`}
                    className={`aspect-square min-w-0 overflow-hidden border-2 rounded-lg flex items-center justify-center p-1.5 sm:p-2 text-center ${
                      cell.isCenter
                        ? "border-amber-300 bg-amber-500/30 text-amber-50"
                        : outcome.className
                    } ${changed ? "outcome-tile-changed" : ""} ${inCompletedLine ? "completed-line-tile" : ""}`}
                  >
                    {cell.isCenter ? (
                      <div className="text-center">
                        <User className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1" aria-hidden="true" />
                        <div className="text-xs break-words">{boardData.playerName || "Free Space"}</div>
                      </div>
                    ) : cell.categoryItemId ? (
                      <div className="flex max-h-full min-w-0 flex-col items-center gap-0.5 overflow-hidden">
                        <span className="flex max-w-full items-center justify-center gap-0.5 text-[9px] font-bold leading-none sm:text-[10px]">
                          <OutcomeIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span className="break-words">{outcomeLabel}</span>
                        </span>
                        <span className={`max-w-full overflow-hidden break-words leading-tight ${
                          boardSize === 5 ? "text-[9px]" : boardSize === 4 ? "text-[10px]" : "text-xs"
                        }`}>
                          {cell.customText || cell.text}
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs">Empty</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
