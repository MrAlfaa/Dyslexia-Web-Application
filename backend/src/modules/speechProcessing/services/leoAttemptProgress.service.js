const hasRecognizableSpeech = ({ wordReading, sentenceReading } = {}) => {
  if (sentenceReading) {
    return (
      sentenceReading.status === "valid" &&
      Boolean(String(sentenceReading.asrText || "").trim())
    );
  }

  return (
    wordReading?.attemptStatus === "valid" &&
    Boolean(String(wordReading.normalizedAsrText || wordReading.asrText || "").trim())
  );
};

const shouldAwaitImprovementReadingEvidence = ({
  isSelection,
  validAudio,
  runAsr,
} = {}) => !isSelection && validAudio === true && runAsr === true;

const isSuccessfulLeoAttempt = ({
  isSelection,
  selectedCorrect,
  validAudio,
  wordReading,
  sentenceReading,
} = {}) => {
  const selectionAttempt =
    typeof isSelection === "boolean"
      ? isSelection
      : typeof selectedCorrect === "boolean";

  return selectionAttempt
    ? selectedCorrect === true
    : validAudio === true && hasRecognizableSpeech({ wordReading, sentenceReading });
};

const getLeoAttemptProgress = ({
  isSelection,
  selectedCorrect,
  validAudio,
  wordReading,
  sentenceReading,
} = {}) => {
  const success = isSuccessfulLeoAttempt({
    isSelection,
    selectedCorrect,
    validAudio,
    wordReading,
    sentenceReading,
  });

  return {
    levelCompleted: success,
    retryRequired: !success,
    nextPromptUnlocked: success,
    levelState: success ? "completed" : isSelection ? "incorrect_retry" : "invalid_retry",
  };
};

module.exports = {
  getLeoAttemptProgress,
  hasRecognizableSpeech,
  isSuccessfulLeoAttempt,
  shouldAwaitImprovementReadingEvidence,
};
