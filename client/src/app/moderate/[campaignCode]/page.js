"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Ban, ExternalLink, Lock, Play, Send, Unlock, Users } from "lucide-react";
import { campaignService } from "../../services/campaignService";
import Header from "../../components/header";
import Footer from "../../components/footer";
import Background from "../../components/background";
import { useBackground } from "../../components/context";

const statusDetails = {
  draft: {
    label: "Draft",
    description: "Hidden from players until it is published.",
    className: "border-gray-400/40 bg-gray-400/15 text-gray-100",
  },
  open: {
    label: "Open",
    description: "Players can create and submit boards.",
    className: "border-emerald-400/40 bg-emerald-400/15 text-emerald-100",
  },
  locked: {
    label: "Entries locked",
    description: "Board creation is closed. You can reopen entries or begin moderation.",
    className: "border-amber-400/40 bg-amber-400/15 text-amber-100",
  },
  moderating: {
    label: "Moderating",
    description: "Board creation is closed while outcomes are reviewed.",
    className: "border-sky-400/40 bg-sky-400/15 text-sky-100",
  },
  completed: {
    label: "Completed",
    description: "This campaign is finalized and read-only.",
    className: "border-emerald-400/40 bg-emerald-400/15 text-emerald-100",
  },
  cancelled: {
    label: "Cancelled",
    description: "This campaign is hidden and read-only.",
    className: "border-red-400/40 bg-red-400/15 text-red-100",
  },
};

const actionDetails = {
  publish: { label: "Publish", icon: Send, className: "bg-emerald-600 hover:bg-emerald-500" },
  lock: { label: "Lock entries", icon: Lock, className: "bg-amber-600 hover:bg-amber-500" },
  reopen: { label: "Reopen entries", icon: Unlock, className: "bg-sky-600 hover:bg-sky-500" },
  startModeration: { label: "Start moderation", icon: Play, className: "bg-blue-600 hover:bg-blue-500" },
  cancel: { label: "Cancel campaign", icon: Ban, className: "bg-red-700 hover:bg-red-600" },
};

const publicStatuses = new Set(["open", "locked", "moderating", "completed"]);

export default function ModerateCampaignPage() {
  const router = useRouter();
  const { campaignCode } = useParams();
  const { setSelectedPreset } = useBackground();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }

    let active = true;
    campaignService.getModeratorCampaign(campaignCode).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load campaign");
      if (!active) return;
      setCampaign(data);
      setSelectedPreset(data.backgroundPreset);
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [campaignCode, router, setSelectedPreset]);

  const handleAction = async (action) => {
    if (action === "cancel" && !window.confirm("Cancel this campaign? This cannot be reopened.")) return;
    if (action === "lock" && campaign.playerCount === 0
      && !window.confirm("Lock entries with no submitted boards?")) return;

    setPendingAction(action);
    setError("");
    try {
      const response = await campaignService.transitionCampaign(campaignCode, action);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Campaign update failed");
      setCampaign(data.campaign);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPendingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Background />
        <Header />
        <main className="max-w-5xl mx-auto p-6 pt-32 text-center text-gray-300">Loading campaign...</main>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen">
        <Background />
        <Header />
        <main className="max-w-5xl mx-auto p-6 pt-32 text-center">
          <p className="text-red-200">{error || "Campaign not found"}</p>
          <Link href="/moderate" className="mt-4 inline-block text-white underline">Back to campaigns</Link>
        </main>
      </div>
    );
  }

  const status = statusDetails[campaign.status] || statusDetails.draft;

  return (
    <div className="min-h-screen">
      <Background />
      <Header />
      <main className="max-w-5xl mx-auto px-6 pt-32 pb-16">
        <section className="border-y border-white/20 py-6 mb-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-white">{campaign.title}</h1>
                <span className={`rounded-md border px-2.5 py-1 text-sm font-semibold ${status.className}`}>
                  {status.label}
                </span>
              </div>
              <p className="text-gray-300 max-w-2xl">{campaign.description || "No description provided."}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-300">
                <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{campaign.playerCount} players</span>
                <span>Code: <span className="font-mono text-white">{campaign.code}</span></span>
                <span>Version {campaign.version}</span>
              </div>
            </div>
            {publicStatuses.has(campaign.status) && (
              <Link
                href={`/${campaign.code}`}
                className="inline-flex items-center gap-2 text-sm text-white hover:text-sky-200"
              >
                Open public view <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </div>

          <div className={`mt-6 border-l-4 px-4 py-3 ${status.className}`}>
            <p>{status.description}</p>
          </div>

          {error && <p role="alert" className="mt-4 text-sm text-red-200">{error}</p>}

          {campaign.allowedActions.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {campaign.allowedActions.map((action) => {
                const details = actionDetails[action];
                const Icon = details.icon;
                return (
                  <button
                    key={action}
                    type="button"
                    onClick={() => handleAction(action)}
                    disabled={pendingAction !== null}
                    className={`inline-flex items-center gap-2 rounded-md px-4 py-2 font-semibold text-white disabled:cursor-wait disabled:opacity-60 ${details.className}`}
                  >
                    <Icon className="h-4 w-4" />
                    {pendingAction === action ? "Updating..." : details.label}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-5">Campaign items</h2>
          <div className="space-y-8">
            {campaign.categories.map((category) => (
              <div key={category.id}>
                <h3 className="text-lg font-semibold text-white mb-3">{category.name}</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {category.items.map((item) => (
                    <div key={item.id} className="min-h-20 border border-white/20 bg-black/20 p-3 text-center text-sm text-white">
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
