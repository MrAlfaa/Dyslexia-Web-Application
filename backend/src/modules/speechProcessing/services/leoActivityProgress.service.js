const toNonNegativeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const toScore = (value) => Number(toNonNegativeNumber(value).toFixed(2));

const getActivityAward = (attempts = []) => {
  const bestStarsByPrompt = new Map();

  attempts.forEach((attempt) => {
    if (
      !attempt?.promptId ||
      attempt.attemptPhase === "checkpoint" ||
      attempt.validAudio !== true ||
      attempt.selectedCorrect === false
    ) {
      return;
    }

    const starsEarned = Math.max(
      toNonNegativeNumber(attempt.starsEarned),
      toNonNegativeNumber(attempt.itemResult?.starsEarned)
    );
    const promptId = String(attempt.promptId);
    bestStarsByPrompt.set(
      promptId,
      Math.max(bestStarsByPrompt.get(promptId) || 0, starsEarned)
    );
  });

  return Array.from(bestStarsByPrompt.values()).reduce((sum, stars) => sum + stars, 0);
};

const mergeActivityProgress = ({
  previous,
  sessionAttemptCount,
  starsEarned,
  bestScore,
  now,
} = {}) => {
  const previousStars = toNonNegativeNumber(previous?.starsEarned ?? previous?.stars);
  const mergedStars = Math.max(previousStars, toNonNegativeNumber(starsEarned));

  return {
    status: "completed",
    stars: mergedStars,
    starsEarned: mergedStars,
    attemptsCompleted:
      toNonNegativeNumber(previous?.attemptsCompleted) +
      toNonNegativeNumber(sessionAttemptCount),
    bestScore: Math.max(toScore(previous?.bestScore), toScore(bestScore)),
    completedAt: previous?.completedAt || now,
    lastPlayedAt: now,
  };
};

module.exports = { getActivityAward, mergeActivityProgress };
