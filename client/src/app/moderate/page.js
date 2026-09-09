"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { ArrowRight, CalendarDays, Grid3X3, Plus, RefreshCw, Users } from "lucide-react";
import { campaignService } from "../services/campaignService";
import Footer from "../components/footer";
import Background from "../components/background";
import Header from "../components/header";

const statuses = {
  draft: { label: "Draft", className: "border-slate-400 text-slate-100" },
  open: { label: "Open", className: "border-emerald-400 text-emerald-100" },
  locked: { label: "Entries locked", className: "border-amber-400 text-amber-100" },
  moderating: { label: "Moderating", className: "border-sky-400 text-sky-100" },
  completed: { label: "Completed", className: "border-emerald-400 text-emerald-100" },
  cancelled: { label: "Cancelled", className: "border-rose-400 text-rose-100" },
};

export default function Moderate() {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [request, setRequest] = useState({ status: "loading", campaigns: [], error: "" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    let active = true;
    campaignService.getUserCampaigns().then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load your campaigns");
      if (active) setRequest({ status: "success", campaigns: data, error: "" });
    }).catch((requestError) => {
      if (active) {
        setRequest({ status: "error", campaigns: [], error: requestError.message });
      }
    });

    return () => {
      active = false;
    };
  }, [reloadKey, router]);

  return (
    <div className="app-page">
      <Background />
      <Header />
      <main className="relative mx-auto max-w-5xl px-5 pb-16 pt-28 sm:px-6">
        <header className="flex flex-col gap-5 border-y border-line py-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-accent">Owner workspace</p>
            <h1 className="mt-1 text-3xl font-bold text-foreground">Your campaigns</h1>
            <p className="mt-2 max-w-2xl text-muted">
              Only campaigns you created appear here. Public campaigns remain under Browse.
            </p>
          </div>
          <Link href="/create" className="ui-button-primary self-start sm:self-auto">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create campaign
          </Link>
        </header>

        <section className="mt-8" aria-live="polite">
          {request.status === "loading" && (
            <div className="border-b border-line" aria-busy="true" aria-label="Loading your campaigns">
              {[0, 1].map((item) => (
                <div key={item} className="grid animate-pulse gap-5 border-t border-line px-3 py-6 md:grid-cols-[1fr_auto]">
                  <div className="space-y-3">
                    <div className="h-6 w-1/2 bg-panel-strong" />
                    <div className="h-4 w-3/4 bg-panel-strong" />
                  </div>
                  <div className="h-10 w-36 bg-panel-strong" />
                </div>
              ))}
            </div>
          )}

          {request.status === "error" && (
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
          )}

          {request.status === "success" && request.campaigns.length === 0 && (
            <div className="border-y border-line py-12 text-center">
              <h2 className="text-xl font-semibold text-foreground">No campaigns yet</h2>
              <p className="mt-2 text-muted">Create a campaign to start accepting boards.</p>
            </div>
          )}

          {request.status === "success" && request.campaigns.length > 0 && (
            <div className="border-b border-line">
              {request.campaigns.map((campaign) => {
                const status = statuses[campaign.status] || statuses.draft;
                const action = campaign.status === "completed"
                  ? { href: `/leaderboards/${campaign.code}`, label: "View results" }
                  : { href: `/moderate/${campaign.code}`, label: "Manage campaign" };
                return (
                  <article key={campaign.code} className="grid gap-5 border-t border-line px-3 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="break-words text-xl font-semibold text-foreground">{campaign.title}</h2>
                        <span className={`ui-status bg-panel-strong ${status.className}`}>{status.label}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted">
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
                          Created {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(campaign.createdAt))}
                        </span>
                      </div>
                    </div>
                    <Link href={action.href} className="ui-button-secondary justify-self-start md:justify-self-end">
                      {action.label}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
