"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { apiReadiness } from "../utils/readiness.mjs";

const serverSnapshot = { error: null, state: "idle" };

export default function ReadinessStatus() {
  const readiness = useSyncExternalStore(
    apiReadiness.subscribe,
    apiReadiness.getSnapshot,
    () => serverSnapshot,
  );
  useEffect(() => {
    apiReadiness.ensure().catch(() => {});
  }, []);
  if (readiness.state !== "checking" && readiness.state !== "error") return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-page/95 px-6 ${readiness.state === "checking" ? "readiness-checking" : ""}`}>
      <div className="app-panel max-w-sm p-6 text-center" role={readiness.state === "error" ? "alert" : "status"}>
        <RefreshCw
          className={`mx-auto mb-4 h-7 w-7 ${readiness.state === "checking" ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
        <h2 className="text-xl font-semibold text-white">
          {readiness.state === "checking" ? "Waking Bongii" : "Bongii is unavailable"}
        </h2>
        {readiness.error && <p className="mt-2 text-sm text-muted">{readiness.error}</p>}
        {readiness.state === "error" && (
          <button
            type="button"
            className="ui-button-primary mt-5"
            onClick={() => apiReadiness.retry().catch(() => {})}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}