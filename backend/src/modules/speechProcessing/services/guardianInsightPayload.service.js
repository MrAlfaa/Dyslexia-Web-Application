const clampRatio = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Number(Math.min(1, Math.max(0, number)).toFixed(4));
};

const addRatio = (target, key, value) => {
  const ratio = clampRatio(value);
  if (ratio !== undefined) target[key] = ratio;
};

const normalizeCode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

const getReadingStage = (grade) => {
  const value = Number(grade);
  if (value >= 4) return "upper_primary";
  return "lower_primary";
};

const getApprovedActivityIds = (recommendation) => {
  const candidates = [
    recommendation?.nextActivity,
    ...(recommendation?.recommendedActivities || []),
  ];
  return [...new Set(
    candidates
      .map((activity) => normalizeCode(activity?.activityId || activity?.id))
      .filter((activityId) => /^leo_[a-z0-9_]+$/.test(activityId))
  )].slice(0, 5);
};

const buildGuardianInsightPayload = ({
  child = {},
  latestSession = null,
  latestSnapshot = null,
  checkpointCount: explicitCheckpointCount,
  comparison = null,
  recommendation = null,
  locale = "si-LK",
} = {}) => {
  const wordSummary = latestSession?.wordReadingSummary || {};
  const phonemeSummary = latestSession?.phonemeSummary || {};
  const sentenceSummary = latestSession?.sentenceSummary || {};
  const attemptSummary = latestSession?.attemptSummary || {};
  const snapshotMetrics = latestSnapshot?.metrics || {};
  const metrics = {};

  addRatio(metrics, "wordAccuracy", snapshotMetrics.wordAccuracy ?? wordSummary.wordReadingAccuracy);
  addRatio(metrics, "meanSimilarity", snapshotMetrics.meanSimilarityScore ?? wordSummary.meanSimilarityScore);
  addRatio(metrics, "meanPhonemeErrorRate", snapshotMetrics.meanPhonemeErrorRate ?? phonemeSummary.meanPhonemeErrorRate);
  addRatio(metrics, "sentenceCoverage", snapshotMetrics.sentenceWordCoverage ?? sentenceSummary.meanCoverageScore);
  addRatio(metrics, "sentenceWordErrorRate", snapshotMetrics.sentenceWordErrorRate ?? sentenceSummary.meanWordErrorRate);

  const totalAttempts = Number(attemptSummary.totalAttemptCount);
  const validAttempts = Number(attemptSummary.validAttemptCount);
  if (Number.isFinite(totalAttempts) && totalAttempts > 0 && Number.isFinite(validAttempts)) {
    addRatio(metrics, "retryRate", (totalAttempts - validAttempts) / totalAttempts);
  } else {
    addRatio(metrics, "retryRate", snapshotMetrics.retryRate);
  }

  const analyzedCount = [
    wordSummary.analyzedAttemptCount,
    phonemeSummary.analyzedAttemptCount,
    sentenceSummary.analyzedAttemptCount,
    latestSession?.pronunciationSummary?.validPredictionCount,
  ].reduce((sum, value) => sum + (Number(value) || 0), 0);

  const checkpointCount = explicitCheckpointCount !== undefined
    ? Number(explicitCheckpointCount)
    : Array.isArray(comparison?.checkpoints)
      ? comparison.checkpoints.length
      : Number(comparison?.checkpointCount || 0);

  return {
    schemaVersion: "guardian_speech_insight_v1",
    locale: locale === "en-US" ? "en-US" : "si-LK",
    readingStage: getReadingStage(child.grade),
    evidenceStatus: latestSnapshot?.status === "ready" || analyzedCount > 0 || Object.keys(metrics).length > 0
      ? "ready"
      : "insufficient_data",
    trendStatus: normalizeCode(
      latestSnapshot?.trendStatus || comparison?.currentTrend || comparison?.trendStatus
    ) || "insufficient_data",
    meaningfulDecision: latestSnapshot?.meaningfulDecision === true || comparison?.meaningfulDecision === true,
    checkpointCount: Number.isFinite(checkpointCount) ? Math.max(0, Math.min(3, checkpointCount)) : 0,
    metrics,
    commonErrorPattern: normalizeCode(phonemeSummary.commonErrorPattern) || "none_observed",
    skillFocus: normalizeCode(recommendation?.skillFocus) || "general_speech_reading_practice",
    approvedActivityIds: getApprovedActivityIds(recommendation),
  };
};

module.exports = {
  buildGuardianInsightPayload,
  normalizeCode,
};
