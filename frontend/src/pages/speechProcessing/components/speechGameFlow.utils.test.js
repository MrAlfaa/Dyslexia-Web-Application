import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import * as speechGameFlow from "./speechGameFlow.utils.js";

const {
  canPlayTargetAudio,
  canAttemptProgress,
  canSubmitLeoPrompt,
  createSubmissionFailureFeedback,
  getAutoSubmitDelay,
  getLeoPromptPrimaryAction,
  resolveGuardianChildId,
} = speechGameFlow;

const readSiblingSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

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

test("a failed automatic submission becomes a resolved re-record state", () => {
  const feedback = createSubmissionFailureFeedback({
    promptId: "prompt-7",
    childFeedback: "Leo could not check that recording.",
    leoMessage: "Let's record it again.",
  });

  assert.deepEqual(feedback, {
    promptId: "prompt-7",
    childFeedback: "Leo could not check that recording.",
    leoMessage: "Let's record it again.",
    levelCompleted: false,
    nextPromptUnlocked: false,
    retryRequired: true,
    submissionFailed: true,
    starsEarned: 0,
    levelState: "submission_failed",
  });
  assert.equal(getLeoPromptPrimaryAction({ feedback }), "retry");
  assert.equal(canSubmitLeoPrompt({ prompt: { promptId: "prompt-7" }, feedback }), false);
  assert.equal(canSubmitLeoPrompt({ prompt: { promptId: "prompt-7" }, feedback: null }), true);
});

test("prompt lifecycle exposes only one primary action", () => {
  assert.equal(getLeoPromptPrimaryAction({}), "record");
  assert.equal(getLeoPromptPrimaryAction({ selectionPrompt: true }), "submit");
  assert.equal(getLeoPromptPrimaryAction({ submitting: true }), "checking");
  assert.equal(getLeoPromptPrimaryAction({
    submitting: true,
    feedback: { retryRequired: true },
  }), "retry");
  assert.equal(getLeoPromptPrimaryAction({ feedback: { retryRequired: true } }), "retry");
  assert.equal(getLeoPromptPrimaryAction({ feedback: { nextPromptUnlocked: false } }), "retry");
  assert.equal(getLeoPromptPrimaryAction({ feedback: { nextPromptUnlocked: true } }), "next");

  assert.equal(canSubmitLeoPrompt({ prompt: null }), false);
  assert.equal(canSubmitLeoPrompt({ prompt: { promptId: "prompt-7" }, submitting: true }), false);
});

test("the start overlay localizes defaults and places Start before the mobile map", () => {
  const overlaySource = readSiblingSource("./LeoGameStartOverlay.jsx");
  const panelSource = readSiblingSource("./LeoCurrentLevelPanel.jsx");
  const renderStart = overlaySource.indexOf("return (");
  const startAction = overlaySource.indexOf("onClick={onStart}", renderStart);
  const levelMap = overlaySource.indexOf("<LeoLevelMap", renderStart);

  assert.ok(startAction > renderStart);
  assert.ok(levelMap > startAction);
  assert.doesNotMatch(overlaySource, /startLabel = "Start Adventure"/);
  assert.doesNotMatch(overlaySource, /backLabel = "Back to Safari"/);
  assert.doesNotMatch(overlaySource, />\{completedLevels\}\/\{totalLevels\} levels</);
  assert.doesNotMatch(overlaySource, /"sound gems"|"Follow Leo's sound path\."|"Let's find your sound path!"/);
  assert.match(overlaySource, /t\("start_adventure"\)/);
  assert.match(overlaySource, /t\("start_overlay_level_progress"/);
  assert.match(panelSource, /prompt\?\.targetText \|\| t\("sound"\)/);
});

test("both API failure paths surface re-record feedback, including long reading", () => {
  const identificationSource = readSiblingSource("../LeoIdentificationGame.jsx");
  const activitySource = readSiblingSource("./LeoActivityPlay.jsx");
  const panelSource = readSiblingSource("./LeoCurrentLevelPanel.jsx");

  assert.match(identificationSource, /setLatestResult\(createSubmissionFailureFeedback\(/);
  assert.match(activitySource, /setFeedback\(createSubmissionFailureFeedback\(/);
  assert.match(activitySource, /feedback\?\.submissionFailed\s*\?\s*feedback\.leoMessage/);
  assert.match(panelSource, /feedback\.submissionFailed\s*\?\s*feedback\.childFeedback/);
});

test("guardian child selection keeps a previously selected owned child", () => {
  const children = [{ _id: "child-a" }, { _id: "child-b" }];
  assert.equal(resolveGuardianChildId(children, "child-b"), "child-b");
  assert.equal(resolveGuardianChildId(children, "unknown"), "child-a");
  assert.equal(resolveGuardianChildId([], "child-b"), "");
});
