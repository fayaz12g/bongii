"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Grid3X3,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";
import Background from "../components/background";
import Footer from "../components/footer";
import Header from "../components/header";
import { campaignService } from "../services/campaignService";

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function LeaderboardsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    campaignService.getCampaigns({ group: "results" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load leaderboards");
      if (!active) return;
      setCampaigns(data.sort((left, right) => (
          new Date(right.finalizedAt || 0).getTime() - new Date(left.finalizedAt || 0).getTime()
        )));
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  return (
    <div className="min-h-screen">
      <Background />
      <Header />
      <main className="relative mx-auto max-w-5xl px-5 pb-16 pt-28 sm:px-6">
        <header className="border-y border-white/20 py-7">
          <div className="flex items-start gap-4">
            <div className="rounded-md border border-amber-300/50 bg-amber-400/15 p-3 text-amber-100">
              <Trophy className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Leaderboards</h1>
              <p className="mt-2 max-w-2xl text-gray-300">
                Final standings from completed Bongii campaigns.
              </p>
            </div>
          </div>
        </header>

        <section className="mt-8" aria-live="polite">
          {loading && <p className="py-12 text-center text-gray-300">Loading results...</p>}

          {!loading && error && (
            <div className="border-y border-rose-300/40 py-8 text-center">
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
            </div>
          )}

          {!loading && !error && campaigns.length === 0 && (
            <div className="border-y border-white/20 py-12 text-center">
              <Trophy className="mx-auto h-8 w-8 text-gray-400" aria-hidden="true" />
              <h2 className="mt-3 text-xl font-semibold text-white">No completed campaigns yet</h2>
              <p className="mt-2 text-gray-300">Finalized campaigns will appear here.</p>
            </div>
          )}

          {!loading && !error && campaigns.length > 0 && (
            <div className="border-b border-white/20">
              {campaigns.map((campaign) => (
                <Link
                  key={campaign.code}
                  href={`/leaderboards/${campaign.code}`}
                  className="group grid gap-5 border-t border-white/20 px-2 py-6 transition-colors hover:bg-white/10 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="break-words text-2xl font-semibold text-white group-hover:text-amber-100">
                        {campaign.title}
                      </h2>
                      <span className="rounded-md border border-emerald-300/40 bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-100">
                        Completed
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-300">
                      {campaign.description || "No description provided."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-300">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4" aria-hidden="true" />
                        {campaign.playerCount} players
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Grid3X3 className="h-4 w-4" aria-hidden="true" />
                        {campaign.boardSize} by {campaign.boardSize}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" aria-hidden="true" />
                        {formatDate(campaign.finalizedAt)}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 justify-self-start font-semibold text-white sm:justify-self-end">
                    View results
                    <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}