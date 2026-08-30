const DEFAULT_THRESHOLDS = {
  wordAccuracy: 0.1,
  meanSimilarityScore: 0.08,
  meanPhonemeErrorRate: 0.1,
  retryRate: 0.1,
  supportNeedScore: 0.08,
};

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const round = (value) => {
  const parsed = toFiniteNumber(value);
  return parsed === null ? null : Number(parsed.toFixed(4));
};

const getCheckpointSchedule = ({
  completedActivityCount = 0,
  checkpointCount = 0,
  totalActivityCount = 5,
} = {}) => {
  const sequence = Math.min(Number(checkpointCount || 0) + 1, 3);
  if (completedActivityCount >= totalActivityCount && checkpointCount < 3) {
    return { due: true, sequence: 3, reason: "final_activity" };
  }
  if (completedActivityCount - checkpointCount * 2 >= 2) {
    return { due: true, sequence, reason: "activity_interval" };
  }
  return { due: false, sequence, reason: "more_training_needed" };
};

const comparePair = (reference, current, thresholds) => {
  if (!reference || reference.status !== "ready" || current?.status !== "ready") {
    return {
      status: "insufficient_data",
      improvedMetrics: [],
      worsenedMetrics: [],
      stableMetrics: [],
      deltas: {},
      supportNeedDelta: null,
    };
  }

  const improvedMetrics = [];
  const worsenedMetrics = [];
  const stableMetrics = [];
  const deltas = {};
  const directions = {
    wordAccuracy: 1,
    meanSimilarityScore: 1,
    meanPhonemeErrorRate: -1,
    retryRate: -1,
  };

  Object.entries(directions).forEach(([metric, direction]) => {
    const before = toFiniteNumber(reference.metrics?.[metric]);
    const after = toFiniteNumber(current.metrics?.[metric]);
    if (before === null || after === null) return;
    const delta = round(after - before);
    const directedDelta = delta * direction;
    deltas[metric] = delta;
    if (directedDelta >= thresholds[metric]) improvedMetrics.push(metric);
    else if (directedDelta <= -thresholds[metric]) worsenedMetrics.push(metric);
    else stableMetrics.push(metric);
  });

  const sameModelVersion = Boolean(
    reference.modelVersion && current.modelVersion && reference.modelVersion === current.modelVersion
  );
  let supportNeedDelta = null;
  const referenceSupportNeedScore = toFiniteNumber(reference.supportNeedScore);
  const currentSupportNeedScore = toFiniteNumber(current.supportNeedScore);
  if (
    sameModelVersion &&
    referenceSupportNeedScore !== null &&
    currentSupportNeedScore !== null
  ) {
    supportNeedDelta = round(currentSupportNeedScore - referenceSupportNeedScore);
    if (supportNeedDelta <= -thresholds.supportNeedScore) improvedMetrics.push("supportNeedScore");
    else if (supportNeedDelta >= thresholds.supportNeedScore) worsenedMetrics.push("supportNeedScore");
    else stableMetrics.push("supportNeedScore");
  }

  let status = "stable";
  if (improvedMetrics.length >= 3 && worsenedMetrics.length <= 1) status = "positive_trend";
  else if (worsenedMetrics.length >= 3) status = "needs_review";
  else if (improvedMetrics.length >= 2 && worsenedMetrics.length >= 2) status = "mixed";

  return { status, improvedMetrics, worsenedMetrics, stableMetrics, deltas, supportNeedDelta };
};

const compareAssessmentSnapshots = ({ baseline, previous, current, thresholds = {} } = {}) => {
  const resolvedThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const baselineComparison = comparePair(baseline, current, resolvedThresholds);
  const previousComparison = previous
    ? comparePair(previous, current, resolvedThresholds)
    : null;
  const crossVersionComparisonBlocked = Boolean(
    baseline?.modelVersion && current?.modelVersion && baseline.modelVersion !== current.modelVersion
  );
  const currentComparisonsAgree = Boolean(
    previousComparison &&
      ["positive_trend", "needs_review"].includes(baselineComparison.status) &&
      previousComparison.status === baselineComparison.status
  );
  const previousCheckpointConfirmsDirection = Boolean(
    previous?.kind === "checkpoint" &&
      previous?.trendStatus === baselineComparison.status
  );
  const sameDirection = currentComparisonsAgree && previousCheckpointConfirmsDirection;

  return {
    status: baselineComparison.status,
    baselineComparison,
    previousComparison,
    crossVersionComparisonBlocked,
    meaningfulDecision: sameDirection && !crossVersionComparisonBlocked,
    reason: crossVersionComparisonBlocked
      ? "model_version_rescore_required"
      : sameDirection
        ? "consecutive_checkpoint_trend"
        : "needs_consecutive_checkpoint",
    thresholds: resolvedThresholds,
  };
};

module.exports = {
  DEFAULT_THRESHOLDS,
  compareAssessmentSnapshots,
  getCheckpointSchedule,
};
