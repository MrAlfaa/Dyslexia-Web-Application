const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getRecommendationSignals,
} = require("../services/leoRecommendationSignals.service");
const { getActivityPlan } = require("../services/leoActivityRecommendation.service");

test("selection accuracy uses observed selectedCorrect instead of placeholder pronunciation", () => {
  const signals = getRecommendationSignals([
    {
      taskType: "first_sound",
      selectedCorrect: false,
      features: { pronunciationScorePlaceholder: 0.99 },
    },
    {
      taskType: "minimal_pair",
      selectedCorrect: true,
      features: { pronunciationScorePlaceholder: 0.99 },
    },
  ]);

  assert.equal(signals.selectionAccuracy, 0.5);
  assert.equal(signals.evidenceSources.selection, "selected_correct");
});

test("sentence recommendations use observed word coverage", () => {
  const signals = getRecommendationSignals([
    { taskType: "sentence_read", sentenceReading: { wordCoverage: 0.4 } },
    { taskType: "sentence_read", sentenceReading: { wordCoverage: 0.8 } },
  ]);

  assert.equal(signals.sentenceCoverage, 0.6);
  assert.equal(signals.evidenceSources.sentence, "sentence_word_coverage");
});

test("pseudoword similarity uses persisted word-reading evidence before pronunciation", () => {
  const signals = getRecommendationSignals([
    {
      taskType: "pseudoword_read",
      wordReading: { similarityScore: 0.2 },
      pronunciationModel: { predictedPronunciationScore: 0.95 },
    },
    {
      taskType: "pseudoword_read",
      wordReading: { similarityScore: 0.4 },
      pronunciationModel: { predictedPronunciationScore: 0.95 },
    },
  ]);

  assert.equal(signals.pseudowordSimilarity, 0.3);
  assert.equal(signals.evidenceSources.pseudoword, "word_reading_similarity_score");
});

test("pseudoword similarity ignores diagnostic pronunciation and uses the named placeholder fallback", () => {
  const signals = getRecommendationSignals([
    {
      taskType: "pseudoword_read",
      pronunciationModel: { predictedPronunciationScore: 0.4 },
      features: { pronunciationScorePlaceholder: 0.99 },
    },
    {
      taskType: "pseudoword_read",
      pronunciationModel: { predictedPronunciationScore: 0.6 },
      features: { pronunciationScorePlaceholder: 0.99 },
    },
  ]);

  assert.equal(signals.pseudowordSimilarity, 0.99);
  assert.equal(signals.pronunciationScore, 0.5);
  assert.equal(signals.evidenceSources.pseudoword, "placeholder_pronunciation_score");
  assert.equal(
    signals.evidenceSources.pronunciation,
    "diagnostic_only_pronunciation_model_score"
  );
});

test("pseudoword similarity is unavailable when only an unverified pronunciation score exists", () => {
  const signals = getRecommendationSignals([
    {
      taskType: "pseudoword_read",
      pronunciationModel: { predictedPronunciationScore: 0.1 },
    },
  ]);

  assert.equal(signals.pseudowordSimilarity, undefined);
  assert.equal(signals.evidenceSources.pseudoword, "unavailable");
  assert.equal(signals.pronunciationScore, 0.1);
  assert.equal(
    signals.evidenceSources.pronunciation,
    "diagnostic_only_pronunciation_model_score"
  );
});

test("unavailable evidence remains unavailable instead of becoming zero", () => {
  const signals = getRecommendationSignals([
    {
      taskType: "pseudoword_read",
      wordReading: { similarityScore: null },
      pronunciationModel: { predictedPronunciationScore: null },
      features: { pronunciationScorePlaceholder: null },
    },
    { taskType: "sentence_read", sentenceReading: { wordCoverage: undefined } },
    { taskType: "first_sound", selectedCorrect: undefined },
  ]);

  assert.equal(signals.selectionAccuracy, undefined);
  assert.equal(signals.pseudowordSimilarity, undefined);
  assert.equal(signals.sentenceCoverage, undefined);
  assert.equal(signals.pronunciationScore, undefined);
  assert.deepEqual(signals.evidenceSources, {
    selection: "unavailable",
    pseudoword: "unavailable",
    sentence: "unavailable",
    pronunciation: "unavailable",
  });
});

test("checkpoint attempts are excluded from training recommendation signals", () => {
  const signals = getRecommendationSignals([
    { taskType: "first_sound", selectedCorrect: true, attemptPhase: "training" },
    { taskType: "first_sound", selectedCorrect: false, attemptPhase: "checkpoint" },
  ]);

  assert.equal(signals.totalAttemptCount, 1);
  assert.equal(signals.selectionAccuracy, 1);
});

test("retry rate uses training attempt numbers and excludes checkpoints", () => {
  const signals = getRecommendationSignals([
    { taskType: "first_sound", selectedCorrect: true, attemptNo: 1 },
    { taskType: "first_sound", selectedCorrect: true, attemptNo: 2 },
    { taskType: "first_sound", selectedCorrect: false, attemptNo: 3, attemptPhase: "checkpoint" },
  ]);

  assert.equal(signals.retryRate, 0.5);
});

test("placeholder pronunciation is explicitly marked as the final fallback", () => {
  const signals = getRecommendationSignals([
    {
      taskType: "pseudoword_read",
      features: { pronunciationScorePlaceholder: 0.25 },
    },
  ]);

  assert.equal(signals.pseudowordSimilarity, 0.25);
  assert.equal(signals.evidenceSources.pseudoword, "placeholder_pronunciation_score");
});

test("selection routing keeps observed correct selections ahead of low placeholder scores", () => {
  const plan = getActivityPlan({
    speech: { supportLevel: "medium_support" },
    recentAttempts: [
      {
        taskType: "first_sound",
        selectedCorrect: true,
        features: { pronunciationScorePlaceholder: 0.1 },
      },
    ],
  });

  assert.equal(plan.reasonCode, "sequence_next");
  assert.equal(plan.nextActivityId, "leo_sound_twins");
});

test("sentence routing keeps observed coverage ahead of low placeholder scores", () => {
  const plan = getActivityPlan({
    speech: { supportLevel: "medium_support" },
    recentAttempts: [
      {
        taskType: "sentence_read",
        sentenceReading: { wordCoverage: 0.9 },
        features: { pronunciationScorePlaceholder: 0.1 },
      },
    ],
  });

  assert.equal(plan.reasonCode, "sequence_next");
  assert.equal(plan.nextActivityId, "leo_sound_twins");
});

test("pseudoword routing keeps observed similarity ahead of low placeholder scores", () => {
  const plan = getActivityPlan({
    speech: { supportLevel: "unknown" },
    recentAttempts: [
      {
        taskType: "pseudoword_read",
        wordReading: { similarityScore: 0.9 },
        features: { pronunciationScorePlaceholder: 0.1 },
      },
    ],
  });

  assert.equal(plan.reasonCode, "sequence_next");
  assert.equal(plan.nextActivityId, "leo_first_sound_hunt");
});

test("pseudoword routing never uses an unverified pronunciation score against the similarity threshold", () => {
  const plan = getActivityPlan({
    speech: { supportLevel: "unknown" },
    recentAttempts: [
      {
        taskType: "pseudoword_read",
        pronunciationModel: { predictedPronunciationScore: 0.1 },
      },
    ],
  });

  assert.equal(plan.reasonCode, "sequence_next");
  assert.equal(plan.nextActivityId, "leo_first_sound_hunt");
});
