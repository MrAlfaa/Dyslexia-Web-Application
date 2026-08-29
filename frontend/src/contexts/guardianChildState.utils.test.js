import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveGuardianChildState,
  findGuardianChild,
  getFirstGuardianChildId,
  normalizeGuardianChildren,
} from "./guardianChildState.utils.js";

test("loading takes precedence before a child response is available", () => {
  assert.equal(
    deriveGuardianChildState({
      loading: true,
      error: null,
      children: [],
      selectedChildId: "",
    }),
    "loading"
  );
});

test("a failed request is not reported as an empty child list", () => {
  assert.equal(
    deriveGuardianChildState({
      loading: false,
      error: new Error("offline"),
      children: [],
      selectedChildId: "",
    }),
    "request_failed"
  );
});

test("an owned-child response with no children has its own state", () => {
  assert.equal(
    deriveGuardianChildState({
      loading: false,
      error: null,
      children: [],
      selectedChildId: "",
    }),
    "no_owned_children"
  );
});

test("an unavailable stored child is stale before fallback selection", () => {
  assert.equal(
    deriveGuardianChildState({
      loading: false,
      error: null,
      children: [{ _id: "a" }],
      storedId: "missing",
    }),
    "stale_selected_child"
  );
});

test("a valid selected child is ready and can be resolved", () => {
  const children = [{ _id: "a", fullName: "Asha" }, { id: "b", fullName: "Bela" }];

  assert.equal(
    deriveGuardianChildState({
      loading: false,
      error: null,
      children,
      selectedChildId: "b",
    }),
    "ready"
  );
  assert.deepEqual(findGuardianChild(children, "b"), children[1]);
});

test("child normalization ignores malformed rows and preserves valid records", () => {
  const children = [{ _id: "a" }, null, {}, { id: "b" }];

  assert.deepEqual(normalizeGuardianChildren(children), [children[0], children[3]]);
  assert.equal(getFirstGuardianChildId(children), "a");
  assert.deepEqual(normalizeGuardianChildren({}), []);
});
