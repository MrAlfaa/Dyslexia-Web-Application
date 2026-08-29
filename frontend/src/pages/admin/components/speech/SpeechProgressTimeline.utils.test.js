import test from "node:test";
import assert from "node:assert/strict";

import {
  createLatestRequestTracker,
  getSentenceDeltaDetails,
} from "./SpeechProgressTimeline.utils.js";

test("only the latest guardian page request may update visible data", () => {
  const tracker = createLatestRequestTracker();
  const firstRequest = tracker.next();
  const secondRequest = tracker.next();

  assert.equal(tracker.isCurrent(firstRequest), false);
  assert.equal(tracker.isCurrent(secondRequest), true);

  tracker.invalidate();
  assert.equal(tracker.isCurrent(secondRequest), false);
});

test("displayed sub-half-point changes are unchanged", () => {
  assert.deepEqual(getSentenceDeltaDetails(0.8, 0.804, false), {
    direction: "unchanged",
    percentagePoints: 0,
    improved: false,
  });
});

test("higher coverage and lower word error rate are improvements", () => {
  assert.deepEqual(getSentenceDeltaDetails(0.7, 0.82, false), {
    direction: "higher",
    percentagePoints: 12,
    improved: true,
  });
  assert.deepEqual(getSentenceDeltaDetails(0.3, 0.18, true), {
    direction: "lower",
    percentagePoints: 12,
    improved: true,
  });
});

test("missing delta evidence stays null", () => {
  assert.equal(getSentenceDeltaDetails(null, 0.8, false), null);
  assert.equal(getSentenceDeltaDetails(0.8, undefined, false), null);
});
