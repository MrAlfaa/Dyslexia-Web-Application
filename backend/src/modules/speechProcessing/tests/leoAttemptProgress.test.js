const assert = require("node:assert/strict");
const test = require("node:test");

const { getLeoAttemptProgress } = require("../services/leoAttemptProgress.service");

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

test("a recorded task advances only when its audio is valid", () => {
  assert.deepEqual(
    getLeoAttemptProgress({ isSelection: false, validAudio: true }),
    {
      levelCompleted: true,
      retryRequired: false,
      nextPromptUnlocked: true,
      levelState: "completed",
    }
  );
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
