"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  classifyCampaignVersion,
  shouldRefreshAfterJoin,
} from "../utils/campaignRealtime.mjs";
import { getServerOrigin } from "../utils/config";

const OUTCOMES = new Set(["pending", "happened", "did_not_happen"]);
const CAMPAIGN_STATUSES = new Set([
  "draft",
  "open",
  "locked",
  "moderating",
  "completed",
  "cancelled",
]);

const isVersionedEvent = (event, type, campaignCode) => (
  event !== null
  && typeof event === "object"
  && event.type === type
  && event.campaignCode === campaignCode
  && Number.isInteger(event.campaignVersion)
  && event.campaignVersion > 0
);

const isOutcomeEvent = (event, campaignCode) => (
  isVersionedEvent(event, "itemOutcome", campaignCode)
  && Number.isInteger(event.itemId)
  && event.itemId > 0
  && OUTCOMES.has(event.status)
  && (event.decidedAt === null || typeof event.decidedAt === "string")
);

const isStatusEvent = (event, campaignCode) => (
  isVersionedEvent(event, "campaignStatus", campaignCode)
  && CAMPAIGN_STATUSES.has(event.status)
);

const isFinalizedEvent = (event, campaignCode) => (
  isVersionedEvent(event, "campaignFinalized", campaignCode)
  && event.status === "completed"
  && typeof event.finalizedAt === "string"
  && event.leaderboardPath === `/leaderboards/${campaignCode}`
);

const isInvalidationEvent = (event, campaignCode) => (
  isVersionedEvent(event, "snapshotInvalidated", campaignCode)
  && typeof event.reason === "string"
);

export const useCampaignRealtime = ({
  campaignCode,
  campaignVersion,
  onFinalized,
  onOutcome,
  onRefreshRequested,
  onStatus,
}) => {
  const [connectionState, setConnectionState] = useState("connecting");
  const socketRef = useRef(null);
  const versionRef = useRef(campaignVersion);
  const callbacksRef = useRef({ onFinalized, onOutcome, onRefreshRequested, onStatus });

  useEffect(() => {
    callbacksRef.current = { onFinalized, onOutcome, onRefreshRequested, onStatus };
  }, [onFinalized, onOutcome, onRefreshRequested, onStatus]);

  useEffect(() => {
    if (Number.isInteger(campaignVersion)) versionRef.current = campaignVersion;
  }, [campaignVersion]);

  useEffect(() => {
    if (!campaignCode) return undefined;

    let active = true;
    let hasJoined = false;
    let refreshPending = false;
    const normalizedCode = campaignCode.toUpperCase();
    const socket = io(getServerOrigin(), { autoConnect: false });
    socketRef.current = socket;

    const requestRefresh = () => {
      if (refreshPending) return;
      refreshPending = true;
      setConnectionState("reconnecting");
      Promise.resolve()
        .then(() => callbacksRef.current.onRefreshRequested?.())
        .then(() => {
          if (active) setConnectionState(socket.connected ? "connected" : "reconnecting");
        })
        .catch(() => {
          if (active) setConnectionState("error");
        })
        .finally(() => {
          refreshPending = false;
        });
    };

    const applyVersionedEvent = (event, validate, apply) => {
      if (!validate(event, normalizedCode)) {
        requestRefresh();
        return;
      }
      const versionState = classifyCampaignVersion(
        versionRef.current,
        event.campaignVersion,
      );
      if (versionState === "stale") return;
      if (versionState !== "apply") {
        requestRefresh();
        return;
      }
      versionRef.current = event.campaignVersion;
      const application = apply?.(event);
      if (application && typeof application.then === "function") {
        setConnectionState("reconnecting");
        application.then(() => {
          if (active) setConnectionState(socket.connected ? "connected" : "reconnecting");
        }).catch(() => {
          if (active) setConnectionState("error");
        });
      }
    };

    const handleConnect = () => {
      if (!active) return;
      setConnectionState("connecting");
      socket.timeout(5000).emit(
        "campaign:join",
        { campaignCode: normalizedCode },
        (error, response) => {
          if (!active) return;
          if (error || !response?.ok) {
            setConnectionState("error");
            requestRefresh();
            return;
          }
          setConnectionState("connected");
          if (shouldRefreshAfterJoin({
            hasJoined,
            currentVersion: versionRef.current,
            serverVersion: response.campaignVersion,
          })) {
            requestRefresh();
          }
          hasJoined = true;
        },
      );
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", () => {
      if (active) {
        socket.auth = { ...socket.auth, reconnecting: true };
        setConnectionState("reconnecting");
      }
    });
    socket.on("connect_error", () => {
      if (active) setConnectionState("error");
    });
    socket.on("campaign:outcome", (event) => {
      applyVersionedEvent(event, isOutcomeEvent, callbacksRef.current.onOutcome);
    });
    socket.on("campaign:finalized", (event) => {
      applyVersionedEvent(event, isFinalizedEvent, callbacksRef.current.onFinalized);
    });
    socket.on("campaign:status", (event) => {
      applyVersionedEvent(event, isStatusEvent, callbacksRef.current.onStatus);
    });
    socket.on("campaign:snapshot-invalidated", (event) => {
      if (!isInvalidationEvent(event, normalizedCode)) {
        requestRefresh();
        return;
      }
      if (event.campaignVersion > versionRef.current) requestRefresh();
    });
    socket.connect();

    return () => {
      active = false;
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [campaignCode]);

  useEffect(() => {
    console.info("Campaign realtime state", { state: connectionState });
  }, [connectionState]);

  const reconnect = () => {
    const socket = socketRef.current;
    if (!socket) return;
    if (socket.connected) socket.disconnect();
    setConnectionState("connecting");
    socket.connect();
  };

  return { connectionState, reconnect };
};