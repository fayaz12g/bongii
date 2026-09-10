import { getServerPath } from "./config.js";

const wait = (duration) => new Promise((resolve) => {
  window.setTimeout(resolve, duration);
});

export const createReadinessCoordinator = ({
  fetchReady,
  maxAttempts = 2,
  requestTimeoutMs = 20_000,
  retryDelayMs = 750,
  waitForRetry = wait,
} = {}) => {
  const listeners = new Set();
  let snapshot = { error: null, state: "idle" };
  let inFlight = null;

  const update = (nextSnapshot) => {
    snapshot = nextSnapshot;
    listeners.forEach((listener) => listener());
  };

  const request = fetchReady || (({ signal }) => fetch(`${getServerPath()}/ready`, {
    cache: "no-store",
    signal,
  }));

  const ensure = ({ force = false } = {}) => {
    if (!force && snapshot.state === "ready") return Promise.resolve();
    if (inFlight) return inFlight;

    update({ error: null, state: "checking" });
    inFlight = (async () => {
      let lastError;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
        try {
          const response = await request({ signal: controller.signal });
          if (!response.ok) throw new Error(`API readiness returned ${response.status}`);
          update({ error: null, state: "ready" });
          return;
        } catch (error) {
          lastError = error;
          if (attempt < maxAttempts) await waitForRetry(retryDelayMs);
        } finally {
          clearTimeout(timeout);
        }
      }
      const message = lastError?.name === "AbortError"
        ? "Bongii took too long to wake up."
        : "Bongii could not connect to the server.";
      update({ error: message, state: "error" });
      throw new Error(message);
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  return {
    ensure,
    getSnapshot: () => snapshot,
    retry: () => ensure({ force: true }),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

export const apiReadiness = createReadinessCoordinator();