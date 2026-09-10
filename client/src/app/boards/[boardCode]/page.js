"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Check, CircleDashed, Pencil, RefreshCw, Trophy, Wifi, WifiOff, X } from "lucide-react";
import { campaignService } from "../../services/campaignService";
import Background from "@/app/components/background";
import Header from "@/app/components/header";
import Footer from "@/app/components/footer";
import PlayerAvatar from "@/app/components/playerAvatar";
import { useBackground } from "../../components/context";
import { useCampaignRealtime } from "../../hooks/useCampaignRealtime";
import { useAuth } from "../../components/authContext";
import {
  applyBoardOutcome,
  getBongAnnouncement,
  getCompletedLinePositions,
  getCompletedLines,
} from "../../utils/campaignRealtime.mjs";

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
  const [bongAnnouncement, setBongAnnouncement] = useState("");
  const boardDataRef = useRef(null);
  const { reduceMotion, setSelectedPreset } = useBackground();
  const { loading: authLoading } = useAuth();

  const commitBoard = (data, { live = false } = {}) => {
    const announcement = getBongAnnouncement(boardDataRef.current, data, { live });
    boardDataRef.current = data;
    setBoardData(data);
    if (announcement) setBongAnnouncement(announcement);
  };

  const refreshBoard = async ({ live = false } = {}) => {
    const response = await campaignService.getPlayerBoard(boardCode);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to refresh board");
    commitBoard(data, { live });
    setSelectedPreset(data.backgroundPreset);
    return data;
  };

  useEffect(() => {
    let active = true;
    const fetchBoard = async () => {
      try {
        const res = await campaignService.getPlayerBoard(boardCode);
        const data = await res.json();
        if (!active) return;
        if (res.ok) {
          commitBoard(data);
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

    if (boardCode && !authLoading) fetchBoard();
    return () => {
      active = false;
    };
  }, [authLoading, boardCode, setSelectedPreset]);

  useEffect(() => {
    if (!changedOutcome) return undefined;
    const timeout = window.setTimeout(() => setChangedOutcome(null), 700);
    return () => window.clearTimeout(timeout);
  }, [changedOutcome]);

  useEffect(() => {
    if (!bongAnnouncement) return undefined;
    const timeout = window.setTimeout(() => setBongAnnouncement(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [bongAnnouncement]);

  const { connectionState, reconnect } = useCampaignRealtime({
    campaignCode: boardData?.campaignCode,
    campaignVersion: boardData?.campaignVersion,
    onFinalized: () => refreshBoard(),
    onOutcome(event) {
      if (boardDataRef.current?.tiles.some((tile) => tile.categoryItemId === event.itemId)) {
        setChangedOutcome({ itemId: event.itemId, version: event.campaignVersion });
        return refreshBoard({ live: true });
      }
      setBoardData((current) => {
        const result = applyBoardOutcome(current, event);
        boardDataRef.current = result.snapshot;
        return result.snapshot;
      });
      return undefined;
    },
    onRefreshRequested: () => refreshBoard(),
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
      if (boardDataRef.current && event.campaignVersion > boardDataRef.current.campaignVersion) {
        boardDataRef.current = {
          ...boardDataRef.current,
          campaignStatus: event.status,
          campaignVersion: event.campaignVersion,
        };
      }
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
  const completedLines = getCompletedLines({ boardSize, tiles });
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
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-y border-white/20 py-3">
          <div className="flex items-center gap-3">
            <PlayerAvatar avatar={boardData.playerAvatar} name={boardData.playerName} size={44} />
            <div>
              <p className="font-semibold text-white">{boardData.playerName}</p>
              <p className="text-sm text-gray-300">
                {boardData.currentScore?.completedLineCount || 0} {(boardData.currentScore?.completedLineCount || 0) === 1 ? "Bong" : "Bongs"}
              </p>
            </div>
          </div>
          {boardData.canEdit && boardData.campaignStatus === "open" && (
            <Link
              href={`/${boardData.campaignCode}?edit=${boardData.boardCode}`}
              className="ui-button-secondary"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit board
            </Link>
          )}
        </div>
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
          className="relative grid gap-2 sm:gap-3 mx-auto"
          style={{ gridTemplateColumns: `repeat(${boardSize}, 1fr)` }}
          role="grid"
          aria-label={`${campaignTitle} board`}
        >
          {bongAnnouncement && (
            <div
              className={`bong-announcement pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 border-2 border-focus bg-page px-5 py-2 text-xl font-black text-white shadow-xl ${reduceMotion ? "bong-announcement-static" : ""}`}
              aria-hidden="true"
            >
              {bongAnnouncement}
            </div>
          )}
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
                    className={`relative aspect-square min-w-0 overflow-hidden border-2 rounded-lg flex items-center justify-center p-1.5 sm:p-2 text-center ${
                      cell.isCenter
                        ? "border-amber-300 bg-amber-500/30 text-amber-50"
                        : outcome.className
                    } ${changed ? "outcome-tile-changed" : ""} ${inCompletedLine ? "completed-line-tile" : ""}`}
                  >
                    {cell.isCenter ? (
                      <div className="relative z-20 text-center">
                        <PlayerAvatar
                          avatar={boardData.playerAvatar}
                          name={boardData.playerName}
                          size={28}
                          className="mx-auto mb-1"
                        />
                        <div className="text-xs break-words">{boardData.playerName || "Free Space"}</div>
                      </div>
                    ) : cell.categoryItemId ? (
                      <div className="relative z-20 flex max-h-full min-w-0 flex-col items-center gap-0.5 overflow-hidden">
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
                      <div className="relative z-20 text-xs">Empty</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {completedLines.length > 0 && (
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
              data-completed-lines
              preserveAspectRatio="none"
              viewBox={`0 0 ${boardSize} ${boardSize}`}
            >
              {completedLines.map((line) => (
                <g
                  key={`${line.start.x}-${line.start.y}-${line.end.x}-${line.end.y}`}
                  data-completed-line
                >
                  <line
                    x1={line.start.x}
                    y1={line.start.y}
                    x2={line.end.x}
                    y2={line.end.y}
                    stroke="rgba(8, 12, 16, 0.82)"
                    strokeLinecap="round"
                    strokeWidth="10"
                    vectorEffect="non-scaling-stroke"
                  />
                  <line
                    x1={line.start.x}
                    y1={line.start.y}
                    x2={line.end.x}
                    y2={line.end.y}
                    stroke="var(--color-focus)"
                    strokeLinecap="round"
                    strokeWidth="6"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ))}
            </svg>
          )}
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">{bongAnnouncement}</p>
      </main>
      <Footer />
    </div>
  );
}
