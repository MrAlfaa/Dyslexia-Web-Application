import assert from "node:assert/strict";
import test from "node:test";

import {
  clearAdminSession,
  getAdminSessionState,
  isAdminAuthFailure,
} from "./adminSession.utils.js";

const authenticatedStorage = {
  getItem: (key) => (key === "adminToken" ? "token" : null),
};

const anonymousStorage = {
  getItem: () => null,
};

test("guardian auth endpoint 401s do not expire an existing session", () => {
  assert.equal(
    isAdminAuthFailure(
      { response: { status: 401 }, config: { url: "/admin/login" } },
      "authenticated",
    ),
    false,
  );
  assert.equal(
    isAdminAuthFailure(
      { response: { status: 401 }, config: { url: "/admin/register" } },
      "authenticated",
    ),
    false,
  );
});

test("a protected 401 expires only an authenticated guardian session", () => {
  const error = {
    response: { status: 401 },
    config: { url: "/admin/students" },
  };

  assert.equal(isAdminAuthFailure(error, "authenticated"), true);
  assert.equal(isAdminAuthFailure(error, "anonymous"), false);
});

test("403 and network errors never expire an authenticated guardian session", () => {
  assert.equal(
    isAdminAuthFailure(
      { response: { status: 403 }, config: { url: "/admin/students" } },
      "authenticated",
    ),
    false,
  );
  assert.equal(
    isAdminAuthFailure(
      { message: "Network Error", config: { url: "/admin/students" } },
      "authenticated",
    ),
    false,
  );
});

test("clearing a guardian session removes both token and user", () => {
  const values = new Map([["adminToken", "token"], ["adminUser", "{}"]]);

  clearAdminSession({ removeItem: (key) => values.delete(key) });

  assert.equal(values.has("adminToken"), false);
  assert.equal(values.has("adminUser"), false);
});

test("session state is authenticated only when a guardian token exists", () => {
  assert.equal(
    getAdminSessionState(authenticatedStorage),
    "authenticated",
  );
  assert.equal(
    getAdminSessionState(anonymousStorage),
    "anonymous",
  );
});
