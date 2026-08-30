const round = (value, digits = 4) => {
  if (value === null || value === undefined || value === "") return null;
  return Number.isFinite(Number(value)) ? Number(Number(value).toFixed(digits)) : null;
};

const mean = (values) => {
  const usable = values
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map(Number)
    .filter(Number.isFinite);
  return usable.length
    ? usable.reduce((sum, value) => sum + value, 0) / usable.length
    : null;
};

const getDominantLabel = (attempts) => {
  const counts = attempts.reduce((result, attempt) => {
    const label = attempt.pronunciationModel?.prediction;
    if (label) result[label] = (result[label] || 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "unknown";
};

const aggregateProbabilities = (attempts) => {
  const labels = ["low_support", "medium_support", "high_support"];
  return labels.reduce((result, label) => {
    result[label] = round(mean(attempts.map((attempt) => attempt.pronunciationModel?.probabilities?.[label])) || 0);
    return result;
  }, {});
};

const getAudioQualityScore = (attempt) =>
  attempt.audioQuality?.qualityScore ??
  attempt.audioQualitySummary?.qualityScore ??
  attempt.features?.audioQualityScore;

const latestPerPrompt = (attempts) => {
  const map = new Map();
  attempts.forEach((attempt, index) => {
    map.set(String(attempt.promptId || attempt._id || index), attempt);
  });
  return [...map.values()];
};

const aggregateAssessmentEvidence = (attempts = [], options = {}) => {
  const totalAttemptCount = attempts.length;
  const validAttempts = attempts.filter((attempt) => attempt.validAudio);
  const promptIds = attempts.map((attempt) => attempt.promptId).filter(Boolean);
  const validPromptIds = new Set(validAttempts.map((attempt) => attempt.promptId).filter(Boolean));
  const expectedPromptCount = Number(options.expectedPromptCount || new Set(promptIds).size || totalAttemptCount);
  const validPromptCount = validPromptIds.size || validAttempts.length;
  const modelAttempts = latestPerPrompt(
    validAttempts.filter(
      (attempt) =>
        attempt.taskType !== "paragraph_segment_read" &&
        attempt.pronunciationModel?.status === "success"
    )
  );
  const probabilities = aggregateProbabilities(modelAttempts);
  const modelVersions = Array.from(
    new Set(modelAttempts.map((attempt) => attempt.pronunciationModel?.modelVersion).filter(Boolean))
  );
  const modelVersionConsistent = modelVersions.length <= 1;
  const calibrationVerified = Boolean(options.calibrationVerified);
  const supportNeedScore = calibrationVerified && modelAttempts.length
    ? round(probabilities.medium_support * 0.5 + probabilities.high_support)
    : null;
  const confidence = calibrationVerified && modelAttempts.length
    ? round(Math.max(...Object.values(probabilities)))
    : null;
  const wordAttempts = latestPerPrompt(
    validAttempts.filter((attempt) => attempt.wordReading?.attemptStatus === "valid")
  );
  const phonemeAttempts = latestPerPrompt(
    validAttempts.filter((attempt) => attempt.phonemeComparison?.status === "completed")
  );
  const sentenceAttempts = latestPerPrompt(
    validAttempts.filter((attempt) => attempt.sentenceReading?.status === "valid")
  );

  return {
    status: validAttempts.length && modelAttempts.length ? "ready" : "insufficient_data",
    totalAttemptCount,
    validAttemptCount: validAttempts.length,
    expectedPromptCount,
    validPromptCount,
    validAttemptRatio: expectedPromptCount ? round(validPromptCount / expectedPromptCount) : 0,
    validModelPredictionCount: modelAttempts.length,
    supportLevel: getDominantLabel(modelAttempts),
    supportNeedScore,
    confidence,
    probabilities,
    calibrationVerified,
    modelVersionConsistent,
    modelVersions,
    modelName: modelAttempts[0]?.pronunciationModel?.modelName || "",
    modelVersion: modelVersionConsistent ? modelVersions[0] || "" : "",
    metrics: {
      wordAccuracy: wordAttempts.length
        ? round(wordAttempts.filter((attempt) => attempt.wordReading?.wordCorrect).length / wordAttempts.length)
        : null,
      meanSimilarityScore: round(mean(wordAttempts.map((attempt) => attempt.wordReading?.similarityScore))),
      meanPhonemeErrorRate: round(
        mean(phonemeAttempts.map((attempt) => attempt.phonemeComparison?.phonemeErrorRate))
      ),
      meanSentenceCoverage: round(
        mean(sentenceAttempts.map((attempt) => attempt.sentenceReading?.wordCoverage))
      ),
      meanSentenceSimilarity: round(
        mean(sentenceAttempts.map((attempt) => attempt.sentenceReading?.sentenceSimilarity))
      ),
      meanSentenceWordErrorRate: round(
        mean(sentenceAttempts.map((attempt) => attempt.sentenceReading?.wordErrorRate))
      ),
      meanSentenceWordsPerMinute: round(
        mean(sentenceAttempts.map((attempt) => attempt.sentenceReading?.wordsPerMinute))
      ),
      retryRate: totalAttemptCount
        ? round(attempts.filter((attempt) => Number(attempt.attemptNo) > 1).length / totalAttemptCount)
        : 0,
      meanAudioQualityScore: round(mean(validAttempts.map(getAudioQualityScore))),
      invalidAudioRate: totalAttemptCount ? round((totalAttemptCount - validAttempts.length) / totalAttemptCount) : 0,
    },
  };
};

const buildAssessmentSnapshot = ({
  attempts = [],
  kind,
  calibrationVerified = false,
  minimumValidAttemptRatio = 0.7,
  minimumModelPredictions = 2,
  expectedPromptCount,
} = {}) => {
  const evidence = aggregateAssessmentEvidence(attempts, {
    calibrationVerified,
    expectedPromptCount,
  });
  const failures = [];
  if (evidence.validAttemptRatio < minimumValidAttemptRatio) failures.push("insufficient_valid_audio");
  if (evidence.validModelPredictionCount < minimumModelPredictions) {
    failures.push("insufficient_model_predictions");
  }
  if (!evidence.modelVersionConsistent) failures.push("mixed_model_versions");
  const passed = failures.length === 0;

  return {
    kind,
    ...evidence,
    status: passed ? "ready" : "insufficient_data",
    qualityGate: {
      passed,
      failures,
      minimumValidAttemptRatio,
      minimumModelPredictions,
    },
  };
};

module.exports = {
  aggregateAssessmentEvidence,
  buildAssessmentSnapshot,
};
