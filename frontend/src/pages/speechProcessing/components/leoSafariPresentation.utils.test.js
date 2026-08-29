import test from "node:test";
import assert from "node:assert/strict";

import { buildSafariPresentation } from "./leoSafariPresentation.utils.js";

test("the recommended current activity becomes the only primary action", () => {
  const view = buildSafariPresentation({
    activities: [
      { activityId: "sound-hunt", state: "completed", title: "Sound Hunt" },
      { activityId: "echo-roar", state: "current", title: "Echo Roar" },
      { activityId: "robot-words", state: "available", title: "Robot Words" },
    ],
    recommendation: { nextActivityId: "echo-roar" },
  });

  assert.equal(view.primaryAction.activityId, "echo-roar");
  assert.equal(view.primaryAction.kind, "activity");
  assert.deepEqual(view.replayActivities.map((item) => item.activityId), ["sound-hunt"]);
  assert.equal(view.zones.find((item) => item.activityId === "robot-words").isPrimary, false);
});

test("a recommended available activity can be primary", () => {
  const view = buildSafariPresentation({
    activities: [{ activityId: "robot-words", state: "available", title: "Robot Words" }],
    recommendation: { nextActivity: { activityId: "robot-words" } },
  });

  assert.equal(view.primaryAction.activityId, "robot-words");
  assert.equal(view.primaryAction.state, "available");
});

test("completed and replay activities are secondary and never become primary", () => {
  const view = buildSafariPresentation({
    activities: [
      { activityId: "sound-hunt", state: "completed", title: "Sound Hunt" },
      { activityId: "echo-roar", state: "replay", title: "Echo Roar" },
    ],
    recommendation: { nextActivityId: "sound-hunt" },
  });

  assert.equal(view.primaryAction, null);
  assert.deepEqual(view.replayActivities.map((item) => item.activityId), ["sound-hunt", "echo-roar"]);
  assert.deepEqual(view.zones.map((item) => item.state), ["replay", "replay"]);
  assert.deepEqual(view.zones.map((item) => item.backendState), ["completed", "replay"]);
});

test("locked zones keep the backend lock reason exactly", () => {
  const lockReason = "Complete one new game.";
  const view = buildSafariPresentation({
    activities: [{ activityId: "story-trail", state: "locked", lockReason }],
    recommendation: { nextActivityId: "story-trail" },
  });

  assert.equal(view.primaryAction, null);
  assert.equal(view.zones[0].state, "locked");
  assert.equal(view.zones[0].lockReason, lockReason);
});

test("unknown backend states are preserved but fail closed in the presentation", () => {
  const view = buildSafariPresentation({
    activities: [{ activityId: "story-trail", state: "paused", lockReason: "Wait for Leo." }],
    recommendation: { nextActivityId: "story-trail" },
  });

  assert.equal(view.primaryAction, null);
  assert.equal(view.zones[0].backendState, "paused");
  assert.equal(view.zones[0].state, "locked");
  assert.equal(view.zones[0].lockReason, "Wait for Leo.");
});

test("checkpoint due changes the recommended action and trail message", () => {
  const activity = { activityId: "sound-twins", state: "current", title: "Sound Twins" };
  const regular = buildSafariPresentation({
    activities: [activity],
    recommendation: { nextActivityId: "sound-twins" },
    checkpointDue: false,
  });
  const checkpoint = buildSafariPresentation({
    activities: [activity],
    recommendation: { nextActivityId: "sound-twins" },
    checkpointDue: true,
  });

  assert.equal(regular.primaryAction.kind, "activity");
  assert.equal(regular.primaryAction.labelKey, "safari_play_leos_pick");
  assert.equal(regular.trailMessage, "safari_trail_continue");
  assert.equal(checkpoint.primaryAction.kind, "checkpoint");
  assert.equal(checkpoint.primaryAction.labelKey, "safari_start_trail_check");
  assert.equal(checkpoint.trailMessage, "safari_trail_checkpoint_ready");
});

test("building the presentation does not mutate backend activity objects", () => {
  const activities = [{ activityId: "sound-hunt", state: "completed", title: "Sound Hunt" }];
  const snapshot = structuredClone(activities);

  buildSafariPresentation({ activities });

  assert.deepEqual(activities, snapshot);
});
