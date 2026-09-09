"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Grid3X3,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import Background from "../components/background";
import Footer from "../components/footer";
import Header from "../components/header";
import { campaignService } from "../services/campaignService";

const groups = {
  open: {
    label: "Open",
    description: "Campaigns accepting new boards.",
    empty: "No open campaigns match this search.",
  },
  awaiting: {
    label: "Awaiting results",
    description: "Entries are locked while outcomes are reviewed.",
    empty: "No campaigns are awaiting results.",
  },
  results: {
    label: "Results",
    description: "Final standings from completed campaigns.",
    empty: "No completed campaigns match this search.",
  },
};

const statuses = {
  open: { label: "Open", className: "border-emerald-400 text-emerald-100" },
  locked: { label: "Entries locked", className: "border-amber-400 text-amber-100" },
  moderating: { label: "Moderating", className: "border-sky-400 text-sky-100" },
  completed: { label: "Completed", className: "border-emerald-400 text-emerald-100" },
};

const relevantDate = (campaign) => {
  if (campaign.status === "open") return { label: "Published", value: campaign.publishedAt };
  if (campaign.status === "locked") {
    return { label: "Entries closed", value: campaign.boardCreationClosedAt };
  }
  if (campaign.status === "moderating") {
    return { label: "Moderation started", value: campaign.moderationStartedAt };
  }
  return { label: "Finalized", value: campaign.finalizedAt };
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const campaignAction = (campaign) => {
  if (campaign.status === "open") {
    return { href: `/${campaign.code}`, label: "Create board" };
  }
  if (campaign.status === "completed") {
    return { href: `/leaderboards/${campaign.code}`, label: "View leaderboard" };
  }
  return { href: `/${campaign.code}`, label: "Watch campaign" };
};

const BrowseSkeleton = () => (
  <div className="border-b border-line" aria-busy="true" aria-label="Loading campaigns">
    <span className="sr-only">Loading campaigns</span>
    {[0, 1, 2].map((item) => (
      <div key={item} className="grid animate-pulse gap-5 border-t border-line px-3 py-6 md:grid-cols-[1fr_auto]">
        <div>
          <div className="h-6 w-2/3 bg-panel-strong" />
          <div className="mt-3 h-4 w-full max-w-lg bg-panel-strong" />
          <div className="mt-5 h-4 w-3/4 max-w-md bg-panel-strong" />
        </div>
        <div className="h-10 w-36 bg-panel-strong" />
      </div>
    ))}
  </div>
);

function CampaignResults({ group, query }) {
  const [reloadKey, setReloadKey] = useState(0);
  const [request, setRequest] = useState({ status: "loading", campaigns: [], error: "" });

  useEffect(() => {
    let active = true;
    campaignService.getCampaigns({ group, query }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load campaigns");
      if (active) setRequest({ status: "success", campaigns: data, error: "" });
    }).catch((error) => {
      if (active) setRequest({ status: "error", campaigns: [], error: error.message });
    });
    return () => {
      active = false;
    };
  }, [group, query, reloadKey]);

  if (request.status === "loading") return <BrowseSkeleton />;
  if (request.status === "error") {
    return (
      <div className="border-y border-rose-400/60 bg-rose-950/50 px-5 py-8 text-center">
        <p role="alert" className="text-rose-100">{request.error}</p>
        <button
          type="button"
          onClick={() => {
            setRequest({ status: "loading", campaigns: [], error: "" });
            setReloadKey((current) => current + 1);
          }}
          className="ui-button-secondary mt-4"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }
  if (request.campaigns.length === 0) {
    return (
      <div className="border-y border-line px-5 py-12 text-center">
        <Search className="mx-auto h-7 w-7 text-muted" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold text-foreground">Nothing here yet</h2>
        <p className="mt-1 text-muted">{groups[group].empty}</p>
      </div>
    );
  }

  return (
    <div className="border-b border-line">
      {request.campaigns.map((campaign) => {
        const status = statuses[campaign.status];
        const date = relevantDate(campaign);
        const action = campaignAction(campaign);
        return (
          <article
            key={campaign.code}
            className="relative grid gap-5 border-t border-line px-3 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-5"
          >
            <div
              className={`absolute inset-y-5 left-0 w-1 bg-gradient-to-b ${campaign.backgroundPreset?.gradient || "from-cyan-300 to-emerald-400"}`}
              aria-hidden="true"
            />
            <div className="min-w-0 pl-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="break-words text-xl font-semibold text-foreground">{campaign.title}</h2>
                <span className={`ui-status bg-panel-strong ${status.className}`}>{status.label}</span>
              </div>
              <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-muted">
                {campaign.description || "No description provided."}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  {campaign.playerCount} {campaign.playerCount === 1 ? "board" : "boards"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Grid3X3 className="h-4 w-4" aria-hidden="true" />
                  {campaign.boardSize} by {campaign.boardSize}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {date.label}: {formatDate(date.value)}
                </span>
              </div>
            </div>
            <Link href={action.href} className="ui-button-primary ml-3 justify-self-start md:justify-self-end">
              {action.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>
        );
      })}
    </div>
  );
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const requestedGroup = searchParams.get("group");
  const group = Object.hasOwn(groups, requestedGroup) ? requestedGroup : "open";
  const query = searchParams.get("query")?.slice(0, 120) || "";

  return (
    <div className="app-page">
      <Background />
      <Header />
      <main className="relative mx-auto max-w-5xl px-5 pb-16 pt-28 sm:px-6">
        <header className="border-y border-line py-7">
          <h1 className="text-3xl font-bold text-foreground">Browse campaigns</h1>
          <p className="mt-2 max-w-2xl text-muted">Find a campaign by its current stage.</p>
        </header>

        <div className="mt-7 border-b border-line">
          <nav className="flex overflow-x-auto" aria-label="Campaign groups" role="tablist">
            {Object.entries(groups).map(([value, details]) => {
              const params = new URLSearchParams();
              params.set("group", value);
              if (query) params.set("query", query);
              return (
                <Link
                  key={value}
                  href={`/browse?${params.toString()}`}
                  role="tab"
                  aria-selected={group === value}
                  className={`ui-tab whitespace-nowrap ${group === value ? "ui-tab-active" : ""}`}
                >
                  {details.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="grid gap-4 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{groups[group].label}</h2>
            <p className="mt-1 text-sm text-muted">{groups[group].description}</p>
          </div>
          <form action="/browse" method="get" className="flex w-full max-w-md gap-2" role="search">
            <input type="hidden" name="group" value={group} />
            <label htmlFor="campaign-search" className="sr-only">Search campaign titles</label>
            <input
              id="campaign-search"
              name="query"
              type="search"
              defaultValue={query}
              maxLength={120}
              placeholder="Search titles"
              className="ui-field min-w-0"
            />
            <button type="submit" className="ui-button-secondary" aria-label="Search campaign titles">
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>
        </div>

        <CampaignResults key={`${group}:${query}`} group={group} query={query} />
      </main>
      <Footer />
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<BrowseSkeleton />}>
      <BrowseContent />
    </Suspense>
  );
}
