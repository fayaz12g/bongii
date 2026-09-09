import assert from "node:assert/strict";
import { test } from "node:test";
import { loginHref, safeReturnTo } from "../src/app/utils/authRedirect.mjs";

test("keeps internal return paths", () => {
  assert.equal(safeReturnTo("/moderate/ABCD?tab=results"), "/moderate/ABCD?tab=results");
  assert.equal(
    loginHref("/moderate/ABCD?tab=results"),
    "/login?returnTo=%2Fmoderate%2FABCD%3Ftab%3Dresults",
  );
});

test("rejects external and protocol-relative return paths", () => {
  assert.equal(safeReturnTo("https://example.com"), "/home");
  assert.equal(safeReturnTo("//example.com/path"), "/home");
  assert.equal(safeReturnTo(null), "/home");
});