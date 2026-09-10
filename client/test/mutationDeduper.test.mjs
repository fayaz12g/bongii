import assert from "node:assert/strict";
import test from "node:test";
import { createMutationDeduper } from "../src/app/utils/mutationDeduper.mjs";

test("coalesces identical pending mutations into one request", async () => {
  const dedupe = createMutationDeduper();
  let resolveRequest;
  let requestCount = 0;
  const execute = () => {
    requestCount += 1;
    return new Promise((resolve) => {
      resolveRequest = resolve;
    });
  };

  const first = dedupe("POST:/campaigns:{}", execute);
  const second = dedupe("POST:/campaigns:{}", execute);
  await Promise.resolve();
  assert.equal(requestCount, 1);
  resolveRequest({ value: "created" });
  assert.deepEqual(await first, { value: "created" });
  assert.deepEqual(await second, { value: "created" });
});

test("does not coalesce mutations with different payload keys", async () => {
  const dedupe = createMutationDeduper();
  let requestCount = 0;
  const execute = async () => ({ request: ++requestCount });

  const [first, second] = await Promise.all([
    dedupe("PUT:/boards/PLAY:{name:A}", execute),
    dedupe("PUT:/boards/PLAY:{name:B}", execute),
  ]);
  assert.equal(requestCount, 2);
  assert.notDeepEqual(first, second);
});