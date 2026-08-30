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

const getAdvancingWordFeedback = ({
  isSelection,
  attemptProgress,
  wordReading,
} = {}) => {
  const advancing =
    isSelection === false &&
    attemptProgress?.levelCompleted === true &&
    attemptProgress?.nextPromptUnlocked === true &&
    attemptProgress?.retryRequired !== true &&
    wordReading?.attemptStatus === "valid";

  if (!advancing) return null;

  return {
    childFeedback: wordReading.wordCorrect
      ? "Great roar! Leo heard the word clearly."
      : "Great roar! Leo heard you. Let's move to the next word.",
    leoMessage: "You unlocked the next jungle step.",
  };
};

module.exports = {
  getAdvancingWordFeedback,
  getLeoAttemptProgress,
  hasRecognizableSpeech,
  isSuccessfulLeoAttempt,
  shouldAwaitImprovementReadingEvidence,
};
