const toNonNegativeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const toScore = (value) => Number(toNonNegativeNumber(value).toFixed(2));

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

module.exports = { mergeActivityProgress };
