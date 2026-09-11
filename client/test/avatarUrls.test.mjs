import assert from "node:assert/strict";
import test from "node:test";
import {
  isStorageEmulatorUrl,
  isUploadedAvatarUrl,
} from "../src/app/utils/avatarUrls.mjs";

const emulatorHost = "127.0.0.1:44199";
const emulatorAvatar = "http://127.0.0.1:44199/v0/b/demo-bongii.appspot.com/o/avatars%2Fuser-one%2Favatar.png?alt=media";
const productionAvatar = "https://firebasestorage.googleapis.com/v0/b/bongii-prod.appspot.com/o/avatars%2Fuser-one%2Favatar.png?alt=media";

test("recognizes only the configured HTTP Storage emulator", () => {
  assert.equal(isStorageEmulatorUrl(emulatorAvatar, emulatorHost), true);
  assert.equal(isStorageEmulatorUrl(emulatorAvatar, "localhost:44199"), false);
  assert.equal(isStorageEmulatorUrl(productionAvatar, emulatorHost), false);
  assert.equal(isStorageEmulatorUrl("not-a-url", emulatorHost), false);
});

test("accepts owned production and emulator avatar objects", () => {
  assert.equal(isUploadedAvatarUrl(productionAvatar, "user-one", emulatorHost), true);
  assert.equal(isUploadedAvatarUrl(emulatorAvatar, "user-one", emulatorHost), true);
  assert.equal(isUploadedAvatarUrl(emulatorAvatar, "user-two", emulatorHost), false);
  assert.equal(isUploadedAvatarUrl(
    "http://127.0.0.1:44199/v0/b/demo-bongii.appspot.com/o/public%2Favatar.png",
    "user-one",
    emulatorHost,
  ), false);
});