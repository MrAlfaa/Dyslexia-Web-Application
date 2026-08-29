import test from "node:test";
import assert from "node:assert/strict";

import {
  canPlayTargetAudio,
  canAttemptProgress,
  getAutoSubmitDelay,
  resolveGuardianChildId,
} from "./speechGameFlow.utils.js";

test("target playback is limited to Echo Roar training", () => {
  assert.equal(canPlayTargetAudio({ mode: "identification", taskType: "word_read" }), false);
  assert.equal(canPlayTargetAudio({ mode: "improvement", attemptPhase: "checkpoint", activityId: "leo_echo_roar" }), false);
  assert.equal(canPlayTargetAudio({ mode: "improvement", attemptPhase: "training", activityId: "leo_echo_roar", taskType: "word_read" }), true);
  assert.equal(canPlayTargetAudio({ mode: "improvement", attemptPhase: "training", activityId: "leo_robot_words", taskType: "pseudoword_read" }), false);
});

test("recorded speech progresses only with an explicit valid completion response", () => {
  assert.equal(canAttemptProgress({ validAudio: true, levelCompleted: true, nextPromptUnlocked: true }), true);
  assert.equal(canAttemptProgress({ validAudio: true, levelCompleted: true }), false);
  assert.equal(canAttemptProgress({ levelCompleted: true, nextPromptUnlocked: true }), false);
  assert.equal(canAttemptProgress({ validAudio: true, levelCompleted: true, nextPromptUnlocked: true, retryRequired: true }), false);
});

test("selection prompts require an explicit completed and unlocked response", () => {
  assert.equal(canAttemptProgress({ levelCompleted: true, nextPromptUnlocked: true }, { selectionPrompt: true }), true);
  assert.equal(canAttemptProgress({ levelCompleted: true }, { selectionPrompt: true }), false);
});

test("a ready recording auto-submits after the child review window", () => {
  assert.equal(getAutoSubmitDelay({ recording: { audioBlob: { size: 20 } } }), 2000);
  assert.equal(getAutoSubmitDelay({ recording: null }), null);
  assert.equal(getAutoSubmitDelay({ recording: { audioBlob: { size: 20 } }, submitting: true }), null);
  assert.equal(getAutoSubmitDelay({ recording: { audioBlob: { size: 20 } }, feedback: {} }), null);
});

test("guardian child selection keeps a previously selected owned child", () => {
  const children = [{ _id: "child-a" }, { _id: "child-b" }];
  assert.equal(resolveGuardianChildId(children, "child-b"), "child-b");
  assert.equal(resolveGuardianChildId(children, "unknown"), "child-a");
  assert.equal(resolveGuardianChildId([], "child-b"), "");
});
