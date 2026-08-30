import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import * as speechGameFlow from "./speechGameFlow.utils.js";
import { LEO_ACTIVITY_THEMES } from "./leoActivityThemes.js";

const {
  canPlayTargetAudio,
  canAttemptProgress,
  canSubmitLeoPrompt,
  canUsePromptPlayback,
  createSubmissionFailureFeedback,
  getAutoSubmitDelay,
  getLeoGuideTranslationKeys,
  getLeoPromptPrimaryAction,
  getSubmissionFailurePresentation,
  getSubmissionRetryLabelKey,
  claimSessionStart,
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

test("a game mount claims one session start per activity", () => {
  const startRef = { current: "" };

  assert.equal(claimSessionStart(startRef, "leo_first_sound_hunt"), true);
  assert.equal(claimSessionStart(startRef, "leo_first_sound_hunt"), false);
  assert.equal(claimSessionStart(startRef, "leo_echo_roar"), true);
});

test("identification and improvement flows guard development remount session starts", () => {
  const improvementSource = readSiblingSource("./LeoActivityPlay.jsx");
  const identificationSource = readSiblingSource("../LeoIdentificationGame.jsx");

  assert.match(improvementSource, /claimSessionStart\(/);
  assert.match(identificationSource, /claimSessionStart\(/);
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

test("Leo guide copy matches selection, long-reading, and recording tasks", () => {
  assert.deepEqual(getLeoGuideTranslationKeys({ selectionPrompt: true }), {
    headingKey: "selection_guide_heading",
    descriptionKey: "selection_guide_desc",
  });
  assert.deepEqual(getLeoGuideTranslationKeys({ longReadingPrompt: true }), {
    headingKey: "leo_ready_for_reading",
    descriptionKey: "sentence_send_desc",
  });
  assert.deepEqual(getLeoGuideTranslationKeys(), {
    headingKey: "leo_is_listening",
    descriptionKey: "send_level_desc",
  });
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
    retryAction: "recording",
    submissionFailed: true,
    starsEarned: 0,
    levelState: "submission_failed",
  });
  assert.equal(getLeoPromptPrimaryAction({ feedback }), "retry");
  assert.equal(canSubmitLeoPrompt({ prompt: { promptId: "prompt-7" }, feedback }), false);
  assert.equal(canSubmitLeoPrompt({ prompt: { promptId: "prompt-7" }, feedback: null }), true);
});

test("feedback and checking states suppress Echo Roar prompt playback", () => {
  assert.equal(canUsePromptPlayback({ allowPromptPlayback: true }), true);
  assert.equal(canUsePromptPlayback({ allowPromptPlayback: true, isRecording: true }), false);
  assert.equal(canUsePromptPlayback({ allowPromptPlayback: true, submitting: true }), false);
  assert.equal(canUsePromptPlayback({
    allowPromptPlayback: true,
    feedback: { retryRequired: true },
  }), false);
  assert.equal(canUsePromptPlayback({
    allowPromptPlayback: true,
    feedback: { nextPromptUnlocked: true },
  }), false);

  const panelSource = readSiblingSource("./LeoCurrentLevelPanel.jsx");
  assert.match(panelSource, /const promptPlaybackAvailable = canUsePromptPlayback\(/);
  assert.match(panelSource, /\{promptPlaybackAvailable && \(/);
});

test("every activity start overlay resolves title, guide, and collectible labels through i18n", () => {
  const english = JSON.parse(readSiblingSource("../../../locales/en/sp.json"));
  const sinhala = JSON.parse(readSiblingSource("../../../locales/si/sp.json"));
  const activitySource = readSiblingSource("./LeoActivityPlay.jsx");
  const overlaySource = readSiblingSource("./LeoGameStartOverlay.jsx");

  Object.values(LEO_ACTIVITY_THEMES).forEach((theme) => {
    for (const keyName of ["titleKey", "animalMessageKey", "collectibleKey", "rewardNameKey"]) {
      const translationKey = theme[keyName];
      assert.equal(typeof english[translationKey], "string");
      assert.equal(typeof sinhala[translationKey], "string");
      assert.notEqual(sinhala[translationKey], english[translationKey]);
    }
  });

  assert.match(activitySource, /title=\{t\(theme\.titleKey/);
  assert.match(activitySource, /guideMessage=\{t\(theme\.animalMessageKey/);
  assert.match(activitySource, /collectibleLabel=\{t\(theme\.collectibleKey/);
  assert.match(activitySource, /rewardLabel=\{t\(theme\.rewardNameKey/);
  assert.doesNotMatch(activitySource, /defaultValue:\s*activity\.title/);
  assert.match(activitySource, /theme=\{localizedTheme\}/);
  assert.doesNotMatch(overlaySource, /theme\?\.(?:collectible|animalMessage|rewardName)/);

  const mapSource = readSiblingSource("./LeoLevelMap.jsx");
  const nodeSource = readSiblingSource("./LeoLevelNode.jsx");
  const rewardSource = readSiblingSource("./LeoRewardChest.jsx");
  assert.doesNotMatch(mapSource, /Jungle Level Path|Help Leo collect every sound gem|\} levels/);
  assert.doesNotMatch(nodeSource, /"Locked"|"Ready"|"Retry"|`Level \$\{/);
  assert.doesNotMatch(rewardSource, /Final Reward|Jungle Sound Badge|stars collected|Finish every level/);
});

test("every literal Leo map, node, and reward translation key exists in both locales", () => {
  const english = JSON.parse(readSiblingSource("../../../locales/en/sp.json"));
  const sinhala = JSON.parse(readSiblingSource("../../../locales/si/sp.json"));
  const componentSources = [
    readSiblingSource("./LeoLevelMap.jsx"),
    readSiblingSource("./LeoLevelNode.jsx"),
    readSiblingSource("./LeoRewardChest.jsx"),
  ];
  const literalTranslationKeys = new Set(
    componentSources.flatMap((source) =>
      [...source.matchAll(/\bt\(\s*["']([^"']+)["']/g)].map((match) => match[1])),
  );

  assert.ok(literalTranslationKeys.size > 0);
  for (const translationKey of literalTranslationKeys) {
    for (const [localeName, locale] of [["English", english], ["Sinhala", sinhala]]) {
      assert.equal(
        Object.hasOwn(locale, translationKey),
        true,
        `${localeName} locale is missing ${translationKey}`,
      );
      assert.equal(
        typeof locale[translationKey] === "string" && locale[translationKey].trim().length > 0,
        true,
        `${localeName} locale has an empty ${translationKey} translation`,
      );
    }
  }
});

test("selection API failures use selection retry copy and action", () => {
  for (const taskType of ["first_sound", "minimal_pair"]) {
    assert.deepEqual(getSubmissionFailurePresentation({ taskType }), {
      childFeedbackKey: "selection_check_failed",
      leoMessageKey: "selection_check_failed_hint",
      retryAction: "selection",
    });
  }
  assert.deepEqual(getSubmissionFailurePresentation({ taskType: "word_read" }), {
    childFeedbackKey: "recording_check_failed",
    leoMessageKey: "recording_check_failed_hint",
    retryAction: "recording",
  });

  const feedback = createSubmissionFailureFeedback({
    promptId: "sound-twins-2",
    childFeedback: "Leo could not check that choice.",
    leoMessage: "Choose the sound again.",
    retryAction: "selection",
  });

  assert.equal(feedback.retryAction, "selection");
  assert.equal(getSubmissionRetryLabelKey({ feedback }), "selection_try_again");
  assert.equal(getSubmissionRetryLabelKey({
    feedback: createSubmissionFailureFeedback({ promptId: "echo-2" }),
  }), "recorder_again");

  const activitySource = readSiblingSource("./LeoActivityPlay.jsx");
  assert.match(activitySource, /getSubmissionFailurePresentation\(\{\s*taskType:\s*prompt\.taskType/);
  assert.match(activitySource, /t\(failurePresentation\.childFeedbackKey\)/);
  assert.match(activitySource, /retryAction:\s*failurePresentation\.retryAction/);
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
