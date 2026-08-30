import test from "node:test";
import assert from "node:assert/strict";

import { formatStatusBadgeLabel } from "./guardianStatusBadge.utils.js";

test("formats unknown stored status identifiers as readable labels", () => {
  assert.equal(formatStatusBadgeLabel("needs_review"), "Needs review");
  assert.equal(formatStatusBadgeLabel("positive-trend"), "Positive trend");
});

test("uses Unknown for an empty status", () => {
  assert.equal(formatStatusBadgeLabel(""), "Unknown");
});
