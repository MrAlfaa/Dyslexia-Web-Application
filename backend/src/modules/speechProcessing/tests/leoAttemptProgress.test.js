const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getAdvancingWordFeedback,
  getLeoAttemptProgress,
  shouldAwaitImprovementReadingEvidence,
} = require("../services/leoAttemptProgress.service");

test("recording attempts await reading evidence before responding", () => {
  assert.equal(
    shouldAwaitImprovementReadingEvidence({
      isSelection: false,
      validAudio: true,
      runAsr: true,
    }),
    true
  );
  assert.equal(
    shouldAwaitImprovementReadingEvidence({
      isSelection: true,
      validAudio: true,
      runAsr: true,
    }),
    false
  );
});

test("an incorrect selection stays on the same prompt", () => {
  assert.deepEqual(
    getLeoAttemptProgress({ isSelection: true, selectedCorrect: false, validAudio: true }),
    {
      levelCompleted: false,
      retryRequired: true,
      nextPromptUnlocked: false,
      levelState: "incorrect_retry",
    }
  );
});

test("a correct selection advances", () => {
  assert.deepEqual(
    getLeoAttemptProgress({ isSelection: true, selectedCorrect: true }),
    {
      levelCompleted: true,
      retryRequired: false,
      nextPromptUnlocked: true,
      levelState: "completed",
    }
  );
});

test("usable audio without recognizable speech stays on the same prompt", () => {
  assert.deepEqual(
    getLeoAttemptProgress({ isSelection: false, validAudio: true }),
    {
      levelCompleted: false,
      retryRequired: true,
      nextPromptUnlocked: false,
      levelState: "invalid_retry",
    }
  );
});

test("a sentence recording advances after ASR recognizes spoken text", () => {
  assert.deepEqual(
    getLeoAttemptProgress({
      isSelection: false,
      validAudio: true,
      sentenceReading: {
        status: "valid",
        asrText: "the dog can run",
      },
    }),
    {
      levelCompleted: true,
      retryRequired: false,
      nextPromptUnlocked: true,
      levelState: "completed",
    }
  );
});

test("a word recording advances after ASR recognizes spoken text", () => {
  assert.deepEqual(
    getLeoAttemptProgress({
      isSelection: false,
      validAudio: true,
      wordReading: {
        attemptStatus: "valid",
        normalizedAsrText: "pat",
      },
    }),
    {
      levelCompleted: true,
      retryRequired: false,
      nextPromptUnlocked: true,
      levelState: "completed",
    }
  );
});

test("an advancing word attempt never presents retry wording when ASR heard a different word", () => {
  assert.deepEqual(
    getAdvancingWordFeedback({
      isSelection: false,
      attemptProgress: {
        levelCompleted: true,
        nextPromptUnlocked: true,
        retryRequired: false,
      },
      wordReading: {
        attemptStatus: "valid",
        asrText: "Boom!",
        wordCorrect: false,
      },
    }),
    {
      childFeedback: "Great roar! Leo heard you. Let's move to the next word.",
      leoMessage: "You unlocked the next jungle step.",
    }
  );
});

test("a retry attempt does not receive advancing feedback", () => {
  assert.equal(
    getAdvancingWordFeedback({
      isSelection: false,
      attemptProgress: {
        levelCompleted: false,
        nextPromptUnlocked: false,
        retryRequired: true,
      },
      wordReading: { attemptStatus: "asr_empty", asrText: "" },
    }),
    null
  );
});

test("invalid audio stays on the same prompt", () => {
  assert.deepEqual(
    getLeoAttemptProgress({ isSelection: false, validAudio: false }),
    {
      levelCompleted: false,
      retryRequired: true,
      nextPromptUnlocked: false,
      levelState: "invalid_retry",
    }
  );
});
