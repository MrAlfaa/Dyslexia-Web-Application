import test from "node:test";
import assert from "node:assert/strict";

import {
  canPlayTargetAudio,
  canAttemptProgress,
  getAutoSubmitDelay,
  resolveGuardianChildId,
} from "./speechGameFlow.utils.js";

test("target playback allows only Echo Roar listen-and-repeat training", () => {
  assert.equal(canPlayTargetAudio({
    mode: "improvement",
    attemptPhase: "training",
    activityId: "leo_echo_roar",
    taskType: "listen_repeat",
  }), true);
});

test("target playback denies reading, checkpoint, and identification prompts", () => {
  const deniedContexts = [
    { mode: "improvement", attemptPhase: "training", activityId: "leo_echo_roar" },
    { mode: "improvement", attemptPhase: "training", activityId: "leo_echo_roar", taskType: "read_aloud_word" },
    { mode: "improvement", attemptPhase: "training", activityId: "leo_echo_roar", taskType: "word_read" },
    { mode: "improvement", attemptPhase: "training", activityId: "leo_echo_roar", taskType: "pseudoword_read" },
    { mode: "improvement", attemptPhase: "training", activityId: "leo_echo_roar", taskType: "sentence_read" },
    { mode: "improvement", attemptPhase: "training", activityId: "leo_echo_roar", taskType: "paragraph_segment_read" },
    { mode: "improvement", attemptPhase: "checkpoint", activityId: "leo_echo_roar", taskType: "listen_repeat" },
    { mode: "identification", attemptPhase: "training", activityId: "leo_echo_roar", taskType: "listen_repeat" },
  ];

  deniedContexts.forEach((context) => assert.equal(canPlayTargetAudio(context), false));
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
