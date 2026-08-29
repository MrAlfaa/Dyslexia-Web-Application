const getLeoAttemptProgress = ({ isSelection, selectedCorrect, validAudio } = {}) => {
  const success = isSelection ? selectedCorrect === true : validAudio === true;

  return {
    levelCompleted: success,
    retryRequired: !success,
    nextPromptUnlocked: success,
    levelState: success ? "completed" : isSelection ? "incorrect_retry" : "invalid_retry",
  };
};

module.exports = { getLeoAttemptProgress };
