import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sharedSource = fs.readFileSync(new URL("./shared.jsx", import.meta.url), "utf8");

test("admin speech modals escape transformed page content and start near the viewport top", () => {
  assert.match(sharedSource, /createPortal\s*\(/);
  assert.match(sharedSource, /document\.body/);
  assert.match(sharedSource, /items-start/);
  assert.match(sharedSource, /sticky top-0/);
});
