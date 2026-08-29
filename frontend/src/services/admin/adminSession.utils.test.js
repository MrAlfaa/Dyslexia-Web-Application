import assert from "node:assert/strict";
import test from "node:test";

import {
  clearAdminSession,
  getAdminSessionState,
  isAdminAuthFailure,
} from "./adminSession.utils.js";

test("only 401 responses expire the guardian session", () => {
  assert.equal(isAdminAuthFailure({ response: { status: 401 } }), true);
  assert.equal(isAdminAuthFailure({ response: { status: 403 } }), false);
  assert.equal(isAdminAuthFailure({ message: "Network Error" }), false);
});

test("clearing a guardian session removes both token and user", () => {
  const values = new Map([["adminToken", "token"], ["adminUser", "{}"]]);

  clearAdminSession({ removeItem: (key) => values.delete(key) });

  assert.equal(values.has("adminToken"), false);
  assert.equal(values.has("adminUser"), false);
});

test("session state is authenticated only when a guardian token exists", () => {
  assert.equal(
    getAdminSessionState({ getItem: (key) => (key === "adminToken" ? "token" : null) }),
    "authenticated",
  );
  assert.equal(
    getAdminSessionState({ getItem: () => null }),
    "anonymous",
  );
});
