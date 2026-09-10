import assert from "node:assert/strict";
import test from "node:test";
import { createReadinessCoordinator } from "../src/app/utils/readiness.mjs";

test("shares one in-flight readiness request across API consumers", async () => {
  let resolveRequest;
  let requestCount = 0;
  const coordinator = createReadinessCoordinator({
    fetchReady: () => {
      requestCount += 1;
      return new Promise((resolve) => {
        resolveRequest = resolve;
      });
    },
  });

  const first = coordinator.ensure();
  const second = coordinator.ensure();
  assert.strictEqual(first, second);
  assert.equal(requestCount, 1);
  resolveRequest({ ok: true });
  await first;
  assert.equal(coordinator.getSnapshot().state, "ready");
});

test("retries a failed readiness request and preserves the pending action", async () => {
  let requestCount = 0;
  const coordinator = createReadinessCoordinator({
    fetchReady: async () => {
      requestCount += 1;
      return { ok: requestCount === 2, status: 503 };
    },
    waitForRetry: async () => {},
  });

  await coordinator.ensure();
  assert.equal(requestCount, 2);
  assert.equal(coordinator.getSnapshot().state, "ready");
});

test("surfaces a bounded readiness failure and permits retry", async () => {
  let available = false;
  const coordinator = createReadinessCoordinator({
    fetchReady: async () => ({ ok: available, status: 503 }),
    maxAttempts: 1,
  });

  await assert.rejects(coordinator.ensure(), /could not connect/i);
  assert.equal(coordinator.getSnapshot().state, "error");
  available = true;
  await coordinator.retry();
  assert.equal(coordinator.getSnapshot().state, "ready");
});