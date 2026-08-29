import test from "node:test";
import assert from "node:assert/strict";

import { getCanRepairChildOwnership } from "./studentOwnershipCapability.utils.js";

test("ownership repair capability accepts only an explicit server true value", () => {
  assert.equal(
    getCanRepairChildOwnership({ viewer: { canRepairChildOwnership: true } }),
    true,
  );
});

test("ownership repair capability fails closed for absent false or malformed values", () => {
  assert.equal(getCanRepairChildOwnership(), false);
  assert.equal(getCanRepairChildOwnership({}), false);
  assert.equal(
    getCanRepairChildOwnership({ viewer: { canRepairChildOwnership: false } }),
    false,
  );
  assert.equal(
    getCanRepairChildOwnership({ viewer: { canRepairChildOwnership: "true" } }),
    false,
  );
});
