"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Ban,
  Check,
  CircleDashed,
  ExternalLink,
  Lock,
  Play,
  RefreshCw,
  Send,
  Trophy,
  Unlock,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { campaignService } from "../../services/campaignService";
import ConfirmDialog from "../../components/confirmDialog";
import Header from "../../components/header";
import Footer from "../../components/footer";
import Background from "../../components/background";
import { useBackground } from "../../components/context";
import { useCampaignRealtime } from "../../hooks/useCampaignRealtime";
import { useRequireAuth } from "../../hooks/useRequireAuth";

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
  publish: { label: "Publish", icon: Send, className: "bg-emerald-700 hover:bg-emerald-800" },
  lock: { label: "Lock entries", icon: Lock, className: "bg-amber-600 hover:bg-amber-500" },
  reopen: { label: "Reopen entries", icon: Unlock, className: "bg-sky-600 hover:bg-sky-500" },
  startModeration: { label: "Start moderation", icon: Play, className: "bg-blue-600 hover:bg-blue-500" },
  finalize: { label: "Finalize results", icon: Trophy, className: "bg-emerald-700 hover:bg-emerald-800" },
  cancel: { label: "Cancel campaign", icon: Ban, className: "bg-red-700 hover:bg-red-600" },
};

const publicStatuses = new Set(["open", "locked", "moderating", "completed"]);

const outcomeDetails = {
  pending: {
    label: "Pending",
    icon: CircleDashed,
    className: "border-white/30 bg-white/5 text-gray-200",
    selectedClassName: "border-white bg-white/20 text-white",
  },
  happened: {
    label: "Happened",
    icon: Check,
    className: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100",
    selectedClassName: "border-emerald-300 bg-emerald-700 text-white",
  },
  did_not_happen: {
    label: "Did not happen",
    icon: X,
    className: "border-rose-400/40 bg-rose-500/10 text-rose-100",
    selectedClassName: "border-rose-300 bg-rose-700 text-white",
  },
};

const connectionLabels = {
  connected: "Live updates connected",
  connecting: "Connecting live updates",
  reconnecting: "Syncing live updates",
  error: "Live updates unavailable",
};

export default function ModerateCampaignPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useRequireAuth();
  const { campaignCode } = useParams();
  const { setSelectedPreset } = useBackground();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingItemId, setPendingItemId] = useState(null);
  const [failedOutcome, setFailedOutcome] = useState(null);
  const [confirmationAction, setConfirmationAction] = useState(null);

  const refreshCampaign = async () => {
    try {
      const response = await campaignService.getModeratorCampaign(campaignCode);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to refresh campaign");
      setCampaign(data);
      setSelectedPreset(data.backgroundPreset);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    }
  };

  const applyOutcome = (campaignVersion, outcome) => {
    setCampaign((current) => {
      if (!current || campaignVersion < current.version) return current;
      if (campaignVersion === current.version) {
        const existingItem = current.categories
          .flatMap((category) => category.items)
          .find((item) => item.id === outcome.itemId);
        if (!existingItem || existingItem.status !== outcome.status) return current;
      }
      return {
        ...current,
        version: Math.max(current.version, campaignVersion),
        categories: current.categories.map((category) => ({
          ...category,
          items: category.items.map((item) => (
            item.id === outcome.itemId
              ? {
                  ...item,
                  status: outcome.status,
                  decidedAt: outcome.decidedAt,
                  decidedBy: outcome.decidedBy === undefined
                    ? item.decidedBy
                    : outcome.decidedBy,
                }
              : item
          )),
        })),
      };
    });
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated) return undefined;

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
  }, [authLoading, campaignCode, isAuthenticated, setSelectedPreset]);

  const { connectionState, reconnect } = useCampaignRealtime({
    campaignCode: publicStatuses.has(campaign?.status) ? campaign.code : null,
    campaignVersion: campaign?.version,
    onFinalized: refreshCampaign,
    onOutcome(event) {
      applyOutcome(event.campaignVersion, event);
    },
    onRefreshRequested: refreshCampaign,
    onStatus: refreshCampaign,
  });

  const performAction = async (action) => {
    setPendingAction(action);
    setError("");
    try {
      const response = action === "finalize"
        ? await campaignService.finalizeCampaign(campaignCode)
        : await campaignService.transitionCampaign(campaignCode, action);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Campaign update failed");
      if (action === "finalize") {
        router.push(`/leaderboards/${campaignCode}`);
      } else {
        setCampaign(data.campaign);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleAction = (action) => {
    if (["lock", "finalize", "cancel"].includes(action)) {
      setConfirmationAction(action);
      return;
    }
    performAction(action);
  };

  const handleOutcome = async (itemId, status) => {
    setPendingItemId(itemId);
    setFailedOutcome(null);
    setError("");
    try {
      const response = await campaignService.updateItemOutcome(campaignCode, itemId, status);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Outcome update failed");
      applyOutcome(data.campaignVersion, data.outcome);
    } catch (requestError) {
      setFailedOutcome({ itemId, status, message: requestError.message });
    } finally {
      setPendingItemId(null);
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
  const campaignItems = campaign.categories.flatMap((category) => category.items);
  const pendingCount = campaignItems.filter((item) => item.status === "pending").length;
  const decidedCount = campaignItems.length - pendingCount;
  const canDecideOutcomes = campaign.status === "moderating";
  const itemLabel = pendingCount === 1 ? "item" : "items";
  const confirmation = {
    lock: {
      title: "Lock board entries?",
      description: campaign.playerCount === 0
        ? "No boards have been submitted. Players will no longer be able to create one unless you reopen entries."
        : `${campaign.playerCount} submitted ${campaign.playerCount === 1 ? "board is" : "boards are"} ready. Players will no longer be able to create another unless you reopen entries.`,
      confirmLabel: "Lock entries",
      tone: "primary",
    },
    finalize: {
      title: "Finalize campaign results?",
      description: `${pendingCount} pending ${itemLabel} will become red. Scores and ranks will be saved permanently, and all results will be locked.`,
      confirmLabel: "Finalize results",
      tone: "primary",
    },
    cancel: {
      title: "Cancel this campaign?",
      description: "The campaign will be hidden from public browsing and cannot be reopened.",
      confirmLabel: "Cancel campaign",
      tone: "danger",
    },
  }[confirmationAction];

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
                <span className={`ui-status ${status.className}`}>
                  {status.label}
                </span>
              </div>
              <p className="text-gray-300 max-w-2xl">{campaign.description || "No description provided."}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-300">
                <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{campaign.playerCount} players</span>
                <span>Code: <span className="font-mono text-white">{campaign.code}</span></span>
                <span>Version {campaign.version}</span>
                <span className="inline-flex items-center gap-1.5" aria-live="polite">
                  {connectionState === "connected" ? (
                    <Wifi className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-amber-300" aria-hidden="true" />
                  )}
                  {connectionLabels[connectionState] || "Connecting live updates"}
                  {connectionState !== "connected" && (
                    <button
                      type="button"
                      onClick={reconnect}
                      className="rounded-md border border-white/30 p-1 hover:bg-white/10"
                      aria-label="Reconnect live updates"
                      title="Reconnect live updates"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {publicStatuses.has(campaign.status) && (
                <Link
                  href={`/${campaign.code}`}
                  className="inline-flex items-center gap-2 text-sm text-white hover:text-sky-200"
                >
                  Open public view <ExternalLink className="h-4 w-4" />
                </Link>
              )}
              {campaign.status === "completed" && (
                <Link
                  href={`/leaderboards/${campaign.code}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100 hover:text-white"
                >
                  View leaderboard <Trophy className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          <div className={`mt-6 border-l-4 px-4 py-3 ${status.className}`}>
            <p>{status.description}</p>
          </div>

          {error && <p role="alert" className="ui-toast mt-4 border-rose-400 text-rose-100">{error}</p>}

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
                    className={`ui-button text-white disabled:cursor-wait ${details.className}`}
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
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">Campaign items</h2>
              <p className="mt-1 text-sm text-gray-300">
                {canDecideOutcomes
                  ? "Decide each outcome as the event unfolds."
                  : "Outcome controls unlock when moderation starts."}
              </p>
            </div>
            <div className="flex gap-2 text-sm font-semibold">
              <span className="rounded-md border border-white/30 bg-white/10 px-3 py-1.5 text-white">
                {pendingCount} pending
              </span>
              <span className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-emerald-100">
                {decidedCount} decided
              </span>
            </div>
          </div>

          <div className="mb-5 min-h-6 text-sm" aria-live="polite">
            {pendingItemId && <p className="text-sky-100">Saving outcome...</p>}
            {failedOutcome && (
              <div role="alert" className="flex flex-wrap items-center gap-3 text-rose-100">
                <span>{failedOutcome.message}</span>
                <button
                  type="button"
                  onClick={() => handleOutcome(failedOutcome.itemId, failedOutcome.status)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-rose-300/60 px-2.5 py-1 font-semibold hover:bg-rose-500/15"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry save
                </button>
              </div>
            )}
          </div>

          <div className="space-y-8">
            {campaign.categories.map((category) => (
              <div key={category.id}>
                <h3 className="text-lg font-semibold text-white mb-3">{category.name}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {category.items.map((item) => {
                    const currentOutcome = outcomeDetails[item.status] || outcomeDetails.pending;
                    return (
                      <div
                        key={item.id}
                        className={`min-w-0 border p-3 ${currentOutcome.className}`}
                      >
                        <div className="mb-3 flex min-h-10 items-start justify-between gap-3">
                          <span className="min-w-0 break-words text-sm font-medium text-white">{item.text}</span>
                          <span className="shrink-0 text-xs font-semibold">{currentOutcome.label}</span>
                        </div>
                        <div
                          className="grid grid-cols-3 overflow-hidden rounded-md border border-white/20"
                          role="group"
                          aria-label={`Outcome for ${item.text}`}
                        >
                          {Object.entries(outcomeDetails).map(([outcome, details]) => {
                            const Icon = details.icon;
                            const selected = item.status === outcome;
                            return (
                              <button
                                key={outcome}
                                type="button"
                                onClick={() => handleOutcome(item.id, outcome)}
                                disabled={!canDecideOutcomes || pendingItemId !== null || selected}
                                aria-label={`Mark as ${details.label}`}
                                aria-pressed={selected}
                                title={details.label}
                                className={`flex h-10 items-center justify-center border-r border-white/20 last:border-r-0 disabled:cursor-not-allowed disabled:opacity-60 ${
                                  selected ? details.selectedClassName : "bg-black/20 text-white hover:bg-white/10"
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <ConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.title || "Confirm action"}
        description={confirmation?.description || ""}
        confirmLabel={confirmation?.confirmLabel || "Confirm"}
        tone={confirmation?.tone}
        busy={pendingAction === confirmationAction}
        onCancel={() => setConfirmationAction(null)}
        onConfirm={() => {
          const action = confirmationAction;
          setConfirmationAction(null);
          performAction(action);
        }}
      />
      <Footer />
    </div>
  );
}
