const toFiniteNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    typeof value === "boolean" ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const mean = (values) => {
  if (!values.length) return undefined;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4));
};

const getMeanMetric = (attempts, sources) => {
  for (const source of sources) {
    const values = attempts
      .map((attempt) => toFiniteNumber(source.getValue(attempt)))
      .filter((value) => value !== undefined);

    if (values.length) {
      return { value: mean(values), source: source.name };
    }
  }

  return { value: undefined, source: "unavailable" };
};

const getSelectionMetric = (attempts) => {
  const observed = attempts
    .filter((attempt) => typeof attempt.selectedCorrect === "boolean")
    .map((attempt) => (attempt.selectedCorrect ? 1 : 0));

  if (observed.length) {
    return { value: mean(observed), source: "selected_correct" };
  }

  return getMeanMetric(attempts, [
    {
      name: "placeholder_pronunciation_score",
      getValue: (attempt) => attempt.features?.pronunciationScorePlaceholder,
    },
  ]);
};

const getRecommendationSignals = (attempts = []) => {
  const trainingAttempts = attempts.filter(
    (attempt) => attempt && attempt.attemptPhase !== "checkpoint"
  );
  const selectionAttempts = trainingAttempts.filter((attempt) =>
    ["first_sound", "minimal_pair"].includes(attempt.taskType)
  );
  const pseudowordAttempts = trainingAttempts.filter(
    (attempt) => attempt.taskType === "pseudoword_read"
  );
  const sentenceAttempts = trainingAttempts.filter((attempt) => attempt.taskType === "sentence_read");
  const selection = getSelectionMetric(selectionAttempts);
  const pseudoword = getMeanMetric(pseudowordAttempts, [
    {
      name: "word_reading_similarity_score",
      getValue: (attempt) => attempt.wordReading?.similarityScore,
    },
    {
      name: "pronunciation_model_score",
      getValue: (attempt) => attempt.pronunciationModel?.predictedPronunciationScore,
    },
    {
      name: "placeholder_pronunciation_score",
      getValue: (attempt) => attempt.features?.pronunciationScorePlaceholder,
    },
  ]);
  const sentence = getMeanMetric(sentenceAttempts, [
    {
      name: "sentence_word_coverage",
      getValue: (attempt) => attempt.sentenceReading?.wordCoverage,
    },
    {
      name: "placeholder_pronunciation_score",
      getValue: (attempt) => attempt.features?.pronunciationScorePlaceholder,
    },
  ]);
  const pronunciation = getMeanMetric(trainingAttempts, [
    {
      name: "pronunciation_model_score",
      getValue: (attempt) => attempt.pronunciationModel?.predictedPronunciationScore,
    },
    {
      name: "placeholder_pronunciation_score",
      getValue: (attempt) => attempt.features?.pronunciationScorePlaceholder,
    },
  ]);
  const invalidOrPoor = trainingAttempts.filter(
    (attempt) =>
      attempt.validAudio === false ||
      ["invalid", "poor"].includes(attempt.audioQuality?.qualityLabel)
  );

  return {
    totalAttemptCount: trainingAttempts.length,
    validAttemptCount: trainingAttempts.filter((attempt) => attempt.validAudio === true).length,
    invalidPoorRate: trainingAttempts.length
      ? Number((invalidOrPoor.length / trainingAttempts.length).toFixed(4))
      : 0,
    selectionAccuracy: selection.value,
    pseudowordSimilarity: pseudoword.value,
    sentenceCoverage: sentence.value,
    pronunciationScore: pronunciation.value,
    retryRate: trainingAttempts.length
      ? Number(
          (
            trainingAttempts.filter((attempt) => Number(attempt.attemptNo || 1) > 1).length /
            trainingAttempts.length
          ).toFixed(4)
        )
      : 0,
    evidenceSources: {
      selection: selection.source,
      pseudoword: pseudoword.source,
      sentence: sentence.source,
      pronunciation: pronunciation.source,
    },
  };
};

module.exports = { getRecommendationSignals };
