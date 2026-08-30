const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildGuardianInsightPayload,
} = require("../services/guardianInsightPayload.service");

test("guardian insight payload contains aggregate evidence without child identifiers or transcripts", () => {
  const payload = buildGuardianInsightPayload({
    child: {
      _id: "child-private-id",
      fullName: "Private Child",
      username: "private-user",
      email: "private@example.test",
      school: "Private School",
      grade: "4",
    },
    latestSession: {
      _id: "session-private-id",
      transcript: "private spoken sentence",
      audioUrl: "https://media.example/private.wav",
      wordReadingSummary: {
        analyzedAttemptCount: 6,
        wordReadingAccuracy: 0.67,
        meanSimilarityScore: 0.72,
      },
      phonemeSummary: {
        analyzedAttemptCount: 5,
        meanPhonemeErrorRate: 0.25,
        commonErrorPattern: "initial sound confusion",
      },
      pronunciationSummary: {
        validPredictionCount: 4,
        dominantPrediction: "medium_support",
        meanProbabilities: { medium_support: 0.8 },
      },
      sentenceSummary: {
        analyzedAttemptCount: 2,
        meanCoverageScore: 0.78,
        meanWordErrorRate: 0.22,
      },
      attemptSummary: {
        totalAttemptCount: 8,
        validAttemptCount: 6,
      },
    },
    comparison: {
      currentTrend: "mixed",
      meaningfulDecision: false,
      checkpoints: [{ sequenceNo: 1 }],
    },
    recommendation: {
      skillFocus: "oral_reading_fluency",
      recommendedActivities: [{ activityId: "leo_story_roar" }],
    },
    locale: "si-LK",
  });

  assert.equal(payload.schemaVersion, "guardian_speech_insight_v1");
  assert.equal(payload.readingStage, "upper_primary");
  assert.equal(payload.metrics.wordAccuracy, 0.67);
  assert.equal(payload.metrics.retryRate, 0.25);
  assert.deepEqual(payload.approvedActivityIds, ["leo_story_roar"]);

  const serialized = JSON.stringify(payload);
  for (const forbidden of [
    "Private Child",
    "private-user",
    "private@example.test",
    "Private School",
    "child-private-id",
    "session-private-id",
    "private spoken sentence",
    "https://media.example/private.wav",
    "meanProbabilities",
    "medium_support",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `payload leaked ${forbidden}`);
  }
});

test("guardian insight payload reports insufficient evidence without inventing zero metrics", () => {
  const payload = buildGuardianInsightPayload({
    child: { grade: "2" },
    latestSession: null,
    comparison: null,
    recommendation: null,
  });

  assert.equal(payload.evidenceStatus, "insufficient_data");
  assert.equal(payload.readingStage, "lower_primary");
  assert.deepEqual(payload.metrics, {});
});

test("guardian insight payload maps immutable assessment snapshot metrics", () => {
  const payload = buildGuardianInsightPayload({
    child: { grade: "5" },
    latestSnapshot: {
      status: "ready",
      trendStatus: "positive_trend",
      meaningfulDecision: true,
      metrics: {
        wordAccuracy: 0.8,
        meanSimilarityScore: 0.84,
        meanPhonemeErrorRate: 0.12,
        sentenceWordCoverage: 0.9,
        sentenceWordErrorRate: 0.1,
        retryRate: 0.15,
      },
    },
    checkpointCount: 2,
    recommendation: { skillFocus: "sentence_reading" },
  });

  assert.equal(payload.evidenceStatus, "ready");
  assert.equal(payload.trendStatus, "positive_trend");
  assert.equal(payload.meaningfulDecision, true);
  assert.equal(payload.checkpointCount, 2);
  assert.deepEqual(payload.metrics, {
    wordAccuracy: 0.8,
    meanSimilarity: 0.84,
    meanPhonemeErrorRate: 0.12,
    sentenceCoverage: 0.9,
    sentenceWordErrorRate: 0.1,
    retryRate: 0.15,
  });
});
