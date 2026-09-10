"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Coins,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import Background from "../../components/background";
import Footer from "../../components/footer";
import Header from "../../components/header";
import { useBackground } from "../../components/context";
import { campaignService } from "../../services/campaignService";
import PlayerAvatar from "../../components/playerAvatar";

const outcomeDetails = {
  happened: { label: "Happened", icon: Check, className: "border-emerald-300/60 bg-emerald-600/75 text-white" },
  did_not_happen: { label: "Did not happen", icon: X, className: "border-rose-300/60 bg-rose-700/75 text-white" },
  pending: { label: "Pending", icon: CircleDashed, className: "border-white/30 bg-white/10 text-white" },
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
};

const BoardPreview = ({ avatar, boardSize, playerName, tiles }) => (
  <div
    className="grid aspect-square w-full gap-1"
    style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}
    role="grid"
    aria-label={`${playerName} board preview`}
  >
    {Array.from({ length: boardSize }, (_, rowIndex) => (
      <div key={rowIndex} role="row" className="contents">
        {tiles.slice(rowIndex * boardSize, (rowIndex + 1) * boardSize).map((tile) => {
          if (tile.isCenter) {
            return (
              <div
                key={tile.position}
                className="flex min-w-0 flex-col items-center justify-center overflow-hidden border border-amber-300/70 bg-amber-500/30 p-1 text-center text-amber-50"
                role="gridcell"
                aria-label="Free space: happened"
                title="Free space"
              >
                <PlayerAvatar avatar={avatar} name={playerName} size={18} />
                <span className="mt-0.5 max-w-full break-words text-[8px] font-semibold leading-tight">Free</span>
              </div>
            );
          }

          const outcome = outcomeDetails[tile.outcome?.status] || outcomeDetails.pending;
          const OutcomeIcon = outcome.icon;
          const text = tile.customText || tile.text || "Empty";
          return (
            <div
              key={tile.position}
              className={`flex min-w-0 flex-col items-center justify-center overflow-hidden border p-1 text-center ${outcome.className}`}
              role="gridcell"
              aria-label={`${text}: ${outcome.label}`}
              title={`${text}: ${outcome.label}`}
            >
              <OutcomeIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="mt-0.5 max-w-full break-words text-[7px] leading-tight sm:text-[8px]">
                {text}
              </span>
            </div>
          );
        })}
      </div>
    ))}
  </div>
);

export default function CampaignLeaderboardPage() {
  const { campaignCode } = useParams();
  const { setSelectedPreset } = useBackground();
  const [snapshot, setSnapshot] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    campaignService.getCampaignResults(campaignCode, page).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load leaderboard");
      if (!active) return;
      setSnapshot(data);
      setSelectedPreset(data.campaign.backgroundPreset);
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [campaignCode, page, reloadKey, setSelectedPreset]);

  if (loading && !snapshot) {
    return (
      <div className="min-h-screen">
        <Background />
        <Header />
        <main className="relative mx-auto max-w-5xl px-6 pt-32 text-center text-gray-300">
          Loading leaderboard...
        </main>
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div className="min-h-screen">
        <Background />
        <Header />
        <main className="relative mx-auto max-w-5xl px-6 pt-32 text-center">
          <p role="alert" className="text-rose-100">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError("");
              setReloadKey((current) => current + 1);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-white/30 px-4 py-2 font-semibold text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
          <Link href="/leaderboards" className="ml-4 text-white underline">All leaderboards</Link>
        </main>
      </div>
    );
  }

  const { campaign, pagination, results } = snapshot;

  return (
    <div className="min-h-screen">
      <Background />
      <Header />
      <main className="relative mx-auto max-w-5xl px-5 pb-16 pt-28 sm:px-6">
        <header className="border-y border-white/20 py-7">
          <Link href="/leaderboards" className="inline-flex items-center gap-1 text-sm text-gray-300 hover:text-white">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            All leaderboards
          </Link>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <Trophy className="h-7 w-7 text-amber-200" aria-hidden="true" />
                <h1 className="break-words text-4xl font-bold text-white">{campaign.title}</h1>
              </div>
              <p className="mt-3 text-sm text-gray-300">
                Finalized {formatDate(campaign.finalizedAt)} · Rules v{campaign.rulesVersion}
              </p>
            </div>
            <span className="font-mono text-sm text-gray-300">Campaign {campaign.code}</span>
          </div>
          <p className="mt-5 border-l-4 border-amber-300/70 pl-4 text-sm text-gray-200">
            Ranked by longest run, then completed lines, then matched tiles. Equal score totals share a rank.
          </p>
        </header>

        {error && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-rose-300/40 bg-rose-500/10 p-3 text-sm text-rose-100" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError("");
                setReloadKey((current) => current + 1);
              }}
              className="inline-flex items-center gap-2 rounded-md border border-rose-200/50 px-3 py-1.5 font-semibold hover:bg-rose-500/20"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        <section className="mt-8" aria-label="Final standings" aria-busy={loading}>
          {results.length === 0 ? (
            <div className="border-y border-white/20 py-12 text-center">
              <h2 className="text-xl font-semibold text-white">No boards were submitted</h2>
              <p className="mt-2 text-gray-300">This campaign finished without player results.</p>
            </div>
          ) : (
            <div className="border-b border-white/20">
              {results.map((result) => {
                return (
                  <article
                    key={result.boardCode}
                    className="grid gap-7 border-t border-white/20 py-7 md:grid-cols-[minmax(0,1fr)_14rem] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="text-4xl font-black text-amber-200">#{result.rank}</span>
                        <PlayerAvatar
                          avatar={result.playerAvatar}
                          name={result.playerName}
                          size={48}
                        />
                        <div>
                          <h2 className="break-words text-2xl font-semibold text-white">
                            {result.playerName || "Anonymous player"}
                          </h2>
                          <p className="mt-1 text-xs font-semibold uppercase text-gray-300">
                            {result.sharedRank ? "Shared rank" : "Final rank"}
                          </p>
                          {result.creditsAwarded > 0 && (
                            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-200">
                              <Coins className="h-4 w-4" aria-hidden="true" />
                              +{result.creditsAwarded} {result.creditsAwarded === 1 ? "token" : "tokens"}
                            </p>
                          )}
                        </div>
                      </div>

                      <dl className="mt-6 grid grid-cols-3 border-y border-white/20 py-4 text-center">
                        <div className="min-w-0 px-2">
                          <dt className="text-xs text-gray-300">Longest run</dt>
                          <dd className="mt-1 text-2xl font-bold text-white">{result.longestRun}</dd>
                        </div>
                        <div className="min-w-0 border-x border-white/20 px-2">
                          <dt className="text-xs text-gray-300">Completed lines</dt>
                          <dd className="mt-1 text-2xl font-bold text-white">{result.completedLineCount}</dd>
                        </div>
                        <div className="min-w-0 px-2">
                          <dt className="text-xs text-gray-300">Matched tiles</dt>
                          <dd className="mt-1 text-2xl font-bold text-white">{result.matchedTileCount}</dd>
                        </div>
                      </dl>

                      <Link
                        href={`/boards/${result.boardCode}`}
                        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-amber-100"
                      >
                        Open board {result.boardCode}
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>

                    <div className="mx-auto aspect-square w-full max-w-56 border border-white/30 bg-black/25 p-2 md:mx-0">
                      <BoardPreview
                        avatar={result.playerAvatar}
                        boardSize={campaign.boardSize}
                        playerName={result.playerName || "Anonymous player"}
                        tiles={result.tiles}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {pagination.totalPages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Leaderboard pages">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError("");
                setPage((current) => Math.max(1, current - 1));
              }}
              disabled={page === 1 || loading}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-white/30 text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
              title="Previous page"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-24 text-center text-sm text-gray-200">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError("");
                setPage((current) => Math.min(pagination.totalPages, current + 1));
              }}
              disabled={page === pagination.totalPages || loading}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-white/30 text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
              title="Next page"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </nav>
        )}
      </main>
      <Footer />
    </div>
  );
}