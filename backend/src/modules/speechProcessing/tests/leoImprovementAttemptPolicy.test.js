const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildLeoImprovementAttemptPolicy,
} = require("../services/leoImprovementAttemptPolicy.service");
const { getLeoAttemptProgress } = require("../services/leoAttemptProgress.service");
const {
  canUsePlaceholderAudio,
  extractPlaceholderFeatures,
} = require("../services/placeholderFeatureExtractor.service");

const firstSoundPrompt = {
  promptId: "LEO_FSH_001",
  taskType: "first_sound",
  targetText: "cat",
  targetSound: "K",
  targetPhonemes: ["K", "AE", "T"],
};

test("a selection prompt remains a selection when selectedAnswer is omitted", () => {
  const policy = buildLeoImprovementAttemptPolicy({
    prompt: firstSoundPrompt,
    attemptPhase: "training",
  });

  assert.equal(policy.isSelection, true);
  assert.equal(policy.selectedAnswerProvided, false);
  assert.equal(policy.selectedCorrect, false);
  assert.equal(policy.requiresRecording, false);
  assert.equal(
    getLeoAttemptProgress({
      isSelection: policy.isSelection,
      selectedCorrect: policy.selectedCorrect,
      validAudio: true,
    }).nextPromptUnlocked,
    false
  );
});

test("a wrong selection remains incorrect", () => {
  const policy = buildLeoImprovementAttemptPolicy({
    prompt: firstSoundPrompt,
    attemptPhase: "training",
    selectedAnswer: "B",
  });

  assert.equal(policy.selectedAnswerProvided, true);
  assert.equal(policy.selectedCorrect, false);
  assert.equal(
    getLeoAttemptProgress({
      isSelection: policy.isSelection,
      selectedCorrect: policy.selectedCorrect,
      validAudio: true,
    }).retryRequired,
    true
  );
});

test("a correct selection is accepted", () => {
  const policy = buildLeoImprovementAttemptPolicy({
    prompt: firstSoundPrompt,
    attemptPhase: "training",
    selectedAnswer: " k ",
  });

  assert.equal(policy.selectedCorrect, true);
  assert.equal(
    getLeoAttemptProgress({
      isSelection: policy.isSelection,
      selectedCorrect: policy.selectedCorrect,
    }).nextPromptUnlocked,
    true
  );
});

test("prompt metadata is canonical even when caller metadata is spoofed", () => {
  const policy = buildLeoImprovementAttemptPolicy({
    prompt: firstSoundPrompt,
    attemptPhase: "training",
    selectedAnswer: "K",
    taskType: "listen_repeat",
    targetText: "spoofed text",
    expectedAnswer: "B",
    targetPhonemes: ["S", "P", "UW", "F"],
  });

  assert.equal(policy.taskType, "first_sound");
  assert.equal(policy.targetText, "cat");
  assert.equal(policy.expectedAnswer, "K");
  assert.deepEqual(policy.targetPhonemes, ["K", "AE", "T"]);
  assert.equal(policy.selectedCorrect, true);
});

test("minimal-pair expected answer comes from the server prompt", () => {
  const policy = buildLeoImprovementAttemptPolicy({
    prompt: {
      promptId: "LEO_TWIN_001",
      taskType: "minimal_pair",
      targetText: "bat",
      targetSound: "B",
      correctAnswer: "bat",
      targetPhonemes: [],
    },
    attemptPhase: "training",
    selectedAnswer: "bat",
  });

  assert.equal(policy.isSelection, true);
  assert.equal(policy.expectedAnswer, "bat");
  assert.equal(policy.selectedCorrect, true);
});

test("checkpoint prompts remain recording tasks", () => {
  const policy = buildLeoImprovementAttemptPolicy({
    prompt: {
      promptId: "LEO_CP_1_1",
      taskType: "read_aloud_word",
      targetText: "sun",
      targetPhonemes: ["S", "AH", "N"],
    },
    attemptPhase: "checkpoint",
    selectedAnswer: "anything",
  });

  assert.equal(policy.isSelection, false);
  assert.equal(policy.requiresRecording, true);
  assert.equal(policy.selectedCorrect, undefined);
  assert.equal(policy.taskType, "read_aloud_word");
  assert.equal(policy.targetText, "sun");
});

test("checkpoint answer metadata cannot turn a missing recording into a selection", () => {
  const policy = buildLeoImprovementAttemptPolicy({
    prompt: {
      promptId: "LEO_CP_1_1",
      taskType: "read_aloud_word",
      targetText: "sun",
      targetPhonemes: ["S", "AH", "N"],
    },
    attemptPhase: "checkpoint",
    selectedAnswer: "sun",
  });

  const features = extractPlaceholderFeatures({
    isSelection: policy.isSelection,
    taskType: policy.taskType,
    promptId: "LEO_CP_1_1",
    targetText: policy.targetText,
    targetPhonemes: policy.targetPhonemes,
    selectedAnswer: policy.selectedAnswer,
    expectedAnswer: policy.expectedAnswer,
    attemptNo: 1,
    mode: "improvement",
  });

  assert.equal(policy.isSelection, false);
  assert.equal(features.validAudio, false);
  assert.equal(features.invalidReason, "missing_audio_file");
  assert.notEqual(features.audioQualityLabel, "selection");
});

test("training recording answer metadata cannot bypass missing audio", () => {
  const policy = buildLeoImprovementAttemptPolicy({
    prompt: {
      promptId: "LEO_ECHO_001",
      taskType: "listen_repeat",
      targetText: "rabbit",
      targetPhonemes: ["R", "AE", "B", "IH", "T"],
    },
    attemptPhase: "training",
    selectedAnswer: "rabbit",
  });

  const features = extractPlaceholderFeatures({
    isSelection: policy.isSelection,
    taskType: policy.taskType,
    promptId: "LEO_ECHO_001",
    targetText: policy.targetText,
    selectedAnswer: policy.selectedAnswer,
    expectedAnswer: policy.expectedAnswer,
    attemptNo: 1,
    mode: "improvement",
  });

  assert.equal(policy.requiresRecording, true);
  assert.equal(features.validAudio, false);
  assert.equal(features.invalidReason, "missing_audio_file");
});

test("production placeholderMode cannot bypass a missing recording", () => {
  assert.equal(
    canUsePlaceholderAudio({
      nodeEnv: "production",
      placeholderRequested: true,
      hasFile: false,
      isSelection: false,
    }),
    false
  );
});

test("placeholder audio requires an explicit request in a non-production environment", () => {
  assert.equal(
    canUsePlaceholderAudio({
      nodeEnv: "test",
      placeholderRequested: false,
      hasFile: false,
      isSelection: false,
    }),
    false
  );
  assert.equal(
    canUsePlaceholderAudio({
      nodeEnv: "test",
      placeholderRequested: true,
      hasFile: false,
      isSelection: false,
    }),
    true
  );
});

test("an explicit server selection still uses selection features without audio", () => {
  const policy = buildLeoImprovementAttemptPolicy({
    prompt: firstSoundPrompt,
    attemptPhase: "training",
    selectedAnswer: "K",
  });

  const features = extractPlaceholderFeatures({
    isSelection: policy.isSelection,
    taskType: policy.taskType,
    promptId: firstSoundPrompt.promptId,
    targetText: policy.targetText,
    targetPhonemes: policy.targetPhonemes,
    selectedAnswer: policy.selectedAnswer,
    expectedAnswer: policy.expectedAnswer,
    attemptNo: 1,
    mode: "improvement",
  });

  assert.equal(policy.isSelection, true);
  assert.equal(features.validAudio, true);
  assert.equal(features.audioQualityLabel, "selection");
  assert.equal(features.selectedCorrectPlaceholder, true);
});
