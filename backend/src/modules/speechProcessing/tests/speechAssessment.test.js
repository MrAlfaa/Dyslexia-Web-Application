const test = require("node:test");
const assert = require("node:assert/strict");

const {
  aggregateAssessmentEvidence,
  buildAssessmentSnapshot,
} = require("../services/speechAssessment.service");
const {
  compareAssessmentSnapshots,
  getCheckpointSchedule,
} = require("../services/speechProgressComparison.service");
const speechProcessingController = require("../controllers/speechProcessing.controller");

const attempt = ({
  promptId = "prompt",
  validAudio = true,
  attemptNo = 1,
  prediction = "low_support",
  probabilities = { low_support: 0.7, medium_support: 0.2, high_support: 0.1 },
  wordCorrect = true,
  similarityScore = 1,
  phonemeErrorRate = 0,
  qualityScore = 0.9,
  modelVersion = "pronunciation_support_v1",
} = {}) => ({
  promptId,
  validAudio,
  attemptNo,
  pronunciationModel: validAudio
    ? {
        status: "success",
        prediction,
        probabilities,
        modelName: "pronunciation_support_classifier",
        modelVersion,
      }
    : { status: "skipped" },
  wordReading: validAudio
    ? { attemptStatus: "valid", wordCorrect, similarityScore }
    : { attemptStatus: "invalid_audio" },
  phonemeComparison: validAudio
    ? { status: "completed", phonemeErrorRate }
    : { status: "skipped" },
  audioQuality: { qualityScore },
});

test("assessment evidence keeps uncalibrated probabilities out of the trend score", () => {
  const result = aggregateAssessmentEvidence([
    attempt({ promptId: "p1" }),
    attempt({ promptId: "p2" }),
  ], {
    calibrationVerified: false,
  });

  assert.equal(result.status, "ready");
  assert.equal(result.supportLevel, "low_support");
  assert.equal(result.supportNeedScore, null);
  assert.equal(result.confidence, null);
  assert.equal(result.validModelPredictionCount, 2);
});

test("a missing calibrated support-need score is not converted to 100 percent", () => {
  assert.equal(speechProcessingController.toSupportScore(undefined), undefined);
  assert.equal(speechProcessingController.toSupportScore(null), undefined);
  assert.equal(speechProcessingController.toSupportScore(0.25), 0.75);
});

test("assessment evidence computes calibrated ordinal support need", () => {
  const result = aggregateAssessmentEvidence([
    attempt({ promptId: "p1" }),
    attempt({ promptId: "p2" }),
  ], {
    calibrationVerified: true,
  });

  assert.equal(result.supportNeedScore, 0.2);
  assert.equal(result.confidence, 0.7);
  assert.equal(result.metrics.wordAccuracy, 1);
  assert.equal(result.metrics.meanPhonemeErrorRate, 0);
});

test("sentence evidence stays separate and paragraph practice does not influence support labels", () => {
  const sentenceAttempt = attempt({ promptId: "sentence" });
  sentenceAttempt.taskType = "sentence_read";
  sentenceAttempt.wordReading = undefined;
  sentenceAttempt.phonemeComparison = undefined;
  sentenceAttempt.sentenceReading = {
    status: "valid",
    wordCoverage: 0.625,
    sentenceSimilarity: 0.7,
    wordErrorRate: 0.375,
    wordsPerMinute: null,
  };

  const paragraphAttempt = attempt({
    promptId: "paragraph",
    prediction: "high_support",
  });
  paragraphAttempt.taskType = "paragraph_segment_read";
  paragraphAttempt.wordReading = undefined;
  paragraphAttempt.phonemeComparison = undefined;
  paragraphAttempt.sentenceReading = {
    status: "valid",
    wordCoverage: 0.875,
    sentenceSimilarity: 0.9,
    wordErrorRate: 0.125,
    wordsPerMinute: 80,
  };

  const result = aggregateAssessmentEvidence([sentenceAttempt, paragraphAttempt]);

  assert.equal(result.validModelPredictionCount, 1);
  assert.equal(result.supportLevel, "low_support");
  assert.equal(result.metrics.wordAccuracy, null);
  assert.equal(result.metrics.meanSentenceCoverage, 0.75);
  assert.equal(result.metrics.meanSentenceSimilarity, 0.8);
  assert.equal(result.metrics.meanSentenceWordErrorRate, 0.25);
  assert.equal(result.metrics.meanSentenceWordsPerMinute, 80);
});

test("missing sentence evidence remains null", () => {
  const result = aggregateAssessmentEvidence([
    {
      promptId: "sentence",
      taskType: "sentence_read",
      validAudio: true,
      pronunciationModel: { status: "skipped" },
      sentenceReading: {
        status: "asr_empty",
        wordCoverage: null,
        sentenceSimilarity: null,
        wordErrorRate: null,
        wordsPerMinute: null,
      },
    },
  ]);

  assert.equal(result.metrics.meanSentenceCoverage, null);
  assert.equal(result.metrics.meanSentenceSimilarity, null);
  assert.equal(result.metrics.meanSentenceWordErrorRate, null);
  assert.equal(result.metrics.meanSentenceWordsPerMinute, null);
});

test("audio admitted for ASR does not influence support classification when speech is unrecognized", () => {
  const unrecognized = attempt({ promptId: "borderline-word" });
  unrecognized.wordReading = {
    attemptStatus: "asr_empty",
    asrText: "",
    normalizedAsrText: "",
  };

  const result = aggregateAssessmentEvidence([unrecognized]);

  assert.equal(result.validAttemptCount, 1);
  assert.equal(result.validModelPredictionCount, 0);
  assert.equal(result.supportLevel, "unknown");
  assert.equal(result.status, "insufficient_data");
});

test("assessment snapshot requires enough valid audio and model predictions", () => {
  const result = buildAssessmentSnapshot({
    attempts: [attempt(), attempt({ validAudio: false })],
    kind: "baseline",
    calibrationVerified: true,
    minimumValidAttemptRatio: 0.7,
    minimumModelPredictions: 2,
  });

  assert.equal(result.status, "insufficient_data");
  assert.equal(result.qualityGate.passed, false);
});

test("quality coverage counts unique prompts while retry rate remains attempt based", () => {
  const first = attempt();
  first.promptId = "p1";
  const retry = attempt({ validAudio: false, attemptNo: 2 });
  retry.promptId = "p1";
  const second = attempt();
  second.promptId = "p2";
  const result = buildAssessmentSnapshot({
    attempts: [retry, first, second],
    kind: "baseline",
    expectedPromptCount: 2,
    minimumValidAttemptRatio: 0.7,
    minimumModelPredictions: 2,
  });

  assert.equal(result.status, "ready");
  assert.equal(result.validAttemptRatio, 1);
  assert.equal(result.metrics.retryRate, 0.3333);
});

test("a formal snapshot rejects mixed pronunciation model versions", () => {
  const result = buildAssessmentSnapshot({
    attempts: [
      attempt({ promptId: "p1", modelVersion: "v1" }),
      attempt({ promptId: "p2", modelVersion: "v2" }),
    ],
    kind: "checkpoint",
    expectedPromptCount: 2,
  });

  assert.equal(result.status, "insufficient_data");
  assert.ok(result.qualityGate.failures.includes("mixed_model_versions"));
});

test("hybrid checkpoint schedule is due after two new unique activities and at the final activity", () => {
  assert.deepEqual(
    getCheckpointSchedule({ completedActivityCount: 1, checkpointCount: 0, totalActivityCount: 5 }),
    { due: false, sequence: 1, reason: "more_training_needed" }
  );
  assert.deepEqual(
    getCheckpointSchedule({ completedActivityCount: 2, checkpointCount: 0, totalActivityCount: 5 }),
    { due: true, sequence: 1, reason: "activity_interval" }
  );
  assert.deepEqual(
    getCheckpointSchedule({ completedActivityCount: 5, checkpointCount: 2, totalActivityCount: 5 }),
    { due: true, sequence: 3, reason: "final_activity" }
  );
  assert.deepEqual(
    getCheckpointSchedule({ completedActivityCount: 2, checkpointCount: 1, totalActivityCount: 5 }),
    { due: false, sequence: 2, reason: "more_training_needed" }
  );
});

test("comparison requires the same formal direction twice before a meaningful decision", () => {
  const baseline = {
    status: "ready",
    metrics: { wordAccuracy: 0.4, meanSimilarityScore: 0.55, meanPhonemeErrorRate: 0.4, retryRate: 0.35 },
  };
  const previous = {
    kind: "checkpoint",
    trendStatus: "positive_trend",
    status: "ready",
    metrics: { wordAccuracy: 0.5, meanSimilarityScore: 0.64, meanPhonemeErrorRate: 0.29, retryRate: 0.24 },
  };
  const current = {
    status: "ready",
    metrics: { wordAccuracy: 0.63, meanSimilarityScore: 0.74, meanPhonemeErrorRate: 0.17, retryRate: 0.12 },
  };

  const result = compareAssessmentSnapshots({ baseline, previous, current });

  assert.equal(result.baselineComparison.status, "positive_trend");
  assert.equal(result.previousComparison.status, "positive_trend");
  assert.equal(result.meaningfulDecision, true);
  assert.equal(result.reason, "consecutive_checkpoint_trend");
});

test("comparison does not treat two comparisons inside one checkpoint as consecutive checkpoints", () => {
  const baseline = {
    status: "ready",
    metrics: { wordAccuracy: 0.2, meanSimilarityScore: 0.35, meanPhonemeErrorRate: 0.65, retryRate: 0.2 },
  };
  const previous = {
    kind: "checkpoint",
    trendStatus: "stable",
    status: "ready",
    metrics: { wordAccuracy: 0.3, meanSimilarityScore: 0.45, meanPhonemeErrorRate: 0.55, retryRate: 0.2 },
  };
  const current = {
    status: "ready",
    metrics: { wordAccuracy: 0.6, meanSimilarityScore: 0.75, meanPhonemeErrorRate: 0.2, retryRate: 0.05 },
  };

  const result = compareAssessmentSnapshots({ baseline, previous, current });

  assert.equal(result.baselineComparison.status, "positive_trend");
  assert.equal(result.previousComparison.status, "positive_trend");
  assert.equal(result.meaningfulDecision, false);
  assert.equal(result.reason, "needs_consecutive_checkpoint");
});

test("comparison does not convert missing metrics or uncalibrated support scores to zero", () => {
  const baseline = {
    status: "ready",
    modelVersion: "v1",
    supportNeedScore: null,
    metrics: { wordAccuracy: null, retryRate: 0 },
  };
  const current = {
    status: "ready",
    modelVersion: "v1",
    supportNeedScore: null,
    metrics: { wordAccuracy: 0.5, retryRate: 0 },
  };

  const result = compareAssessmentSnapshots({ baseline, previous: null, current });

  assert.equal(result.baselineComparison.deltas.wordAccuracy, undefined);
  assert.equal(result.baselineComparison.supportNeedDelta, null);
  assert.ok(!result.baselineComparison.stableMetrics.includes("supportNeedScore"));
});

test("comparison reports a preliminary positive trend from observable metrics", () => {
  const baseline = {
    status: "ready",
    metrics: {
      wordAccuracy: 0.45,
      meanSimilarityScore: 0.6,
      meanPhonemeErrorRate: 0.35,
      retryRate: 0.3,
    },
  };
  const current = {
    status: "ready",
    metrics: {
      wordAccuracy: 0.6,
      meanSimilarityScore: 0.7,
      meanPhonemeErrorRate: 0.2,
      retryRate: 0.15,
    },
  };

  const result = compareAssessmentSnapshots({ baseline, previous: null, current });

  assert.equal(result.baselineComparison.status, "positive_trend");
  assert.equal(result.meaningfulDecision, false);
  assert.equal(result.reason, "needs_consecutive_checkpoint");
});

test("comparison requires the same model version for calibrated support-score deltas", () => {
  const baseline = {
    status: "ready",
    modelVersion: "v1",
    supportNeedScore: 0.7,
    metrics: {},
  };
  const current = {
    status: "ready",
    modelVersion: "v2",
    supportNeedScore: 0.4,
    metrics: {},
  };

  const result = compareAssessmentSnapshots({ baseline, previous: null, current });

  assert.equal(result.crossVersionComparisonBlocked, true);
  assert.equal(result.baselineComparison.supportNeedDelta, null);
  assert.equal(result.meaningfulDecision, false);
  assert.equal(result.reason, "model_version_rescore_required");
});
