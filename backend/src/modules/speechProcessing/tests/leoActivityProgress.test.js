const test = require("node:test");
const assert = require("node:assert/strict");

const { mergeActivityProgress } = require("../services/leoActivityProgress.service");

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
