const supportLabels = {
  low_support: "Low support need",
  medium_support: "Medium support need",
  high_support: "High support need",
};

const getSupportLevel = (score) => {
  if (score >= 0.75) return "low_support";
  if (score >= 0.45) return "medium_support";
  return "high_support";
};

const getRecommendations = (supportLevel) => {
  if (supportLevel === "high_support") {
    return ["Robot Nonword Challenge", "Minimal Pair Castle"];
  }

  if (supportLevel === "medium_support") {
    return ["Treasure Word Read"];
  }

  return ["Story Star Reading"];
};

const getLeoRecommendations = (supportLevel) => {
  if (supportLevel === "high_support") {
    return ["leo_first_sound_hunt", "leo_echo_roar", "leo_robot_words"];
  }
  if (supportLevel === "medium_support") {
    return ["leo_sound_twins", "leo_robot_words"];
  }
  return ["leo_story_roar"];
};

exports.createItemResult = (features) => {
  const score = features.pronunciationScorePlaceholder || 0;
  const starsEarned = !features.validAudio
    ? 0
    : score >= 0.8
      ? 3
      : score >= 0.55
        ? 2
        : 1;

  return {
    starsEarned,
    supportHint: features.validAudio
      ? score >= 0.7
        ? "Reading support: keep practicing with story sounds."
        : "Sound practice: let's practice this sound again."
      : "Please record a little longer so your guardian can review your progress.",
    childFeedback: features.validAudio
      ? "Great try! You earned stars."
      : "Great try! Let's record it once more.",
    wordCorrect: features.wordCorrectPlaceholder,
    pronunciationScore: score,
    validAudio: features.validAudio,
  };
};

exports.aggregateSupportLevel = (attempts, options = {}) => {
  // TODO: Replace this placeholder rule set with a trained ML classifier.
  // TODO: Add Whisper/wav2vec2-derived features when real speech processing is introduced.
  // TODO: Replace placeholder phoneme and fluency scores with real audio features.
  const validAttempts = attempts.filter((attempt) => attempt.validAudio);
  const totalAttemptCount = attempts.length;
  const validAttemptCount = validAttempts.length;
  const mode =
    options.mode ||
    attempts.find((attempt) => attempt.features?.mode)?.features?.mode ||
    "";
  const invalidAudioRate = totalAttemptCount
    ? (totalAttemptCount - validAttemptCount) / totalAttemptCount
    : 0;
  const meanPronunciationScore = validAttemptCount
    ? validAttempts.reduce(
        (sum, attempt) =>
          sum +
          (attempt.features?.pronunciationScorePlaceholder ||
            attempt.itemResult?.pronunciationScore ||
            0),
        0
      ) / validAttemptCount
    : 0;
  const retryRate = attempts.length
    ? attempts.filter((attempt) => Number(attempt.attemptNo) > 1).length /
      attempts.length
    : 0;
  const meanPhonemeErrorRatePlaceholder = validAttemptCount
    ? validAttempts.reduce(
        (sum, attempt) =>
          sum + (attempt.features?.phonemeErrorRatePlaceholder || 0),
        0
      ) / validAttemptCount
    : 1;
  const pseudowordAttemptCount = attempts.filter(
    (attempt) => attempt.taskType === "pseudoword_read"
  ).length;
  const pseudowordAttempts = validAttempts.filter(
    (attempt) => attempt.taskType === "pseudoword_read"
  );
  const sentenceAttempts = validAttempts.filter(
    (attempt) => attempt.taskType === "sentence_read"
  );
  const pseudowordAccuracyPlaceholder = pseudowordAttempts.length
    ? pseudowordAttempts.reduce(
        (sum, attempt) =>
          sum + (attempt.features?.pronunciationScorePlaceholder || 0),
        0
      ) / pseudowordAttempts.length
    : meanPronunciationScore;
  const sentenceFluencyPlaceholder = sentenceAttempts.length
    ? sentenceAttempts.reduce(
        (sum, attempt) =>
          sum + (attempt.features?.pronunciationScorePlaceholder || 0),
        0
      ) / sentenceAttempts.length
    : meanPronunciationScore;
  const rawSupportScore =
    mode === "identification"
      ? 0.35 * meanPronunciationScore +
        0.25 * pseudowordAccuracyPlaceholder +
        0.2 * sentenceFluencyPlaceholder +
        0.2 * (1 - meanPhonemeErrorRatePlaceholder)
      : meanPronunciationScore - retryRate * 0.08;
  const supportScore = Number(
    Math.min(Math.max(rawSupportScore, 0), 1).toFixed(2)
  );
  const supportLevel = getSupportLevel(supportScore);
  const recommendations =
    mode === "identification"
      ? getLeoRecommendations(supportLevel)
      : getRecommendations(supportLevel);

  return {
    totalAttemptCount,
    meanPronunciationScore: Number(meanPronunciationScore.toFixed(2)),
    validAttemptCount,
    invalidAudioRate: Number(invalidAudioRate.toFixed(2)),
    retryRate: Number(retryRate.toFixed(2)),
    pseudowordAttemptCount,
    pseudowordAccuracyPlaceholder: Number(
      pseudowordAccuracyPlaceholder.toFixed(2)
    ),
    sentenceFluencyPlaceholder: Number(sentenceFluencyPlaceholder.toFixed(2)),
    meanPhonemeErrorRatePlaceholder: Number(
      meanPhonemeErrorRatePlaceholder.toFixed(2)
    ),
    supportScore,
    supportLevel,
    supportLabel: supportLabels[supportLevel],
    aggregateFeatures: {
      totalAttemptCount,
      validAttemptCount,
      invalidAudioRate: Number(invalidAudioRate.toFixed(2)),
      meanPronunciationScore: Number(meanPronunciationScore.toFixed(2)),
      meanPhonemeErrorRatePlaceholder: Number(
        meanPhonemeErrorRatePlaceholder.toFixed(2)
      ),
      pseudowordAccuracyPlaceholder: Number(
        pseudowordAccuracyPlaceholder.toFixed(2)
      ),
      sentenceFluencyPlaceholder: Number(sentenceFluencyPlaceholder.toFixed(2)),
      retryRate: Number(retryRate.toFixed(2)),
    },
    recommendations,
    recommendedActivityIds:
      mode === "identification" ? getLeoRecommendations(supportLevel) : [],
    modelVersion: "placeholder_v1",
    predictionSource: "placeholder_rule_based",
  };
};
