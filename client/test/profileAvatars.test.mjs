import assert from "node:assert/strict";
import test from "node:test";
import {
  clearPendingProfileAvatar,
  DEFAULT_PROFILE_AVATAR_ID,
  getProfileAvatar,
  PROFILE_AVATAR_GROUPS,
  PROFILE_AVATAR_IDS,
  readPendingProfileAvatar,
  rememberPendingProfileAvatar,
} from "../src/app/utils/profileAvatars.mjs";

test("groups Chippy and Lucky avatar variants in numeric order", () => {
  assert.deepEqual(PROFILE_AVATAR_GROUPS.map(({ name }) => name), ["Chippy", "Lucky"]);
  assert.deepEqual(PROFILE_AVATAR_IDS, [
    ...Array.from({ length: 8 }, (_, index) => `chippy-${index + 1}`),
    ...Array.from({ length: 8 }, (_, index) => `lucky-${index + 1}`),
  ]);
  assert.equal(DEFAULT_PROFILE_AVATAR_ID, "chippy-1");
  assert.equal(getProfileAvatar("3").id, "chippy-3");
  assert.equal(getProfileAvatar("unknown").id, "chippy-1");
});

test("keeps a pending registration avatar scoped to its Firebase user", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };

  rememberPendingProfileAvatar(storage, "firebase-one", "lucky-8");
  assert.equal(readPendingProfileAvatar(storage, "firebase-two"), null);
  assert.equal(readPendingProfileAvatar(storage, "firebase-one"), "lucky-8");
  clearPendingProfileAvatar(storage);
  assert.equal(readPendingProfileAvatar(storage, "firebase-one"), null);
});