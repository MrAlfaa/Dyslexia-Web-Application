import test from "node:test";
import assert from "node:assert/strict";

import { isSelfManagedChildStateRoute } from "./adminLayoutRouteState.utils.js";

test("speech monitoring pages own their child request state", () => {
  assert.equal(isSelfManagedChildStateRoute("/admin/speech-session-history"), true);
});

test("the children page owns its empty-state create action", () => {
  assert.equal(isSelfManagedChildStateRoute("/admin/students"), true);
  assert.equal(isSelfManagedChildStateRoute("/admin/students/"), true);
});

test("other guardian pages retain the shell child request state", () => {
  assert.equal(isSelfManagedChildStateRoute("/admin/subscription"), false);
});
