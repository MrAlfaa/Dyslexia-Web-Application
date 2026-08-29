const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getActivityAward,
  mergeActivityProgress,
} = require("../services/leoActivityProgress.service");

test("a wrong selection followed by a correct retry awards only the correct result", () => {
  const award = getActivityAward([
    {
      promptId: "prompt-1",
      attemptPhase: "training",
      validAudio: true,
      selectedCorrect: false,
      starsEarned: 1,
    },
    {
      promptId: "prompt-1",
      attemptPhase: "training",
      validAudio: true,
      selectedCorrect: true,
      itemResult: { starsEarned: 3 },
    },
  ]);

  assert.equal(award, 3);
});

test("repeated successful attempts award the best result once per prompt", () => {
  const award = getActivityAward([
    { promptId: "prompt-1", attemptPhase: "training", validAudio: true, starsEarned: 1 },
    { promptId: "prompt-1", attemptPhase: "training", validAudio: true, starsEarned: 3 },
    { promptId: "prompt-2", attemptPhase: "training", validAudio: true, itemResult: { starsEarned: 2 } },
  ]);

  assert.equal(award, 5);
});

test("invalid recordings and checkpoint attempts award no stars", () => {
  const award = getActivityAward([
    { promptId: "invalid", attemptPhase: "training", validAudio: false, starsEarned: 3 },
    { promptId: "checkpoint", attemptPhase: "checkpoint", validAudio: true, starsEarned: 3 },
    { promptId: "wrong-selection", attemptPhase: "training", validAudio: true, selectedCorrect: false, starsEarned: 3 },
  ]);

  assert.equal(award, 0);
});

test("a replay preserves first completion and accumulates attempts", () => {
  const merged = mergeActivityProgress({
    previous: {
      completedAt: new Date("2026-08-01"),
      attemptsCompleted: 5,
      starsEarned: 3,
      bestScore: 0.9,
    },
    sessionAttemptCount: 4,
    starsEarned: 2,
    bestScore: 0.8,
    now: new Date("2026-08-29"),
  });

  assert.equal(merged.completedAt.toISOString(), new Date("2026-08-01").toISOString());
  assert.equal(merged.attemptsCompleted, 9);
  assert.equal(merged.starsEarned, 3);
  assert.equal(merged.stars, 3);
  assert.equal(merged.bestScore, 0.9);
  assert.equal(merged.lastPlayedAt.toISOString(), new Date("2026-08-29").toISOString());
});
