const test = require("node:test");
const assert = require("node:assert/strict");

const speechProcessingController = require("../controllers/speechProcessing.controller");
const SpeechAttempt = require("../models/speechAttempt.model");
const SpeechSession = require("../models/speechSession.model");
const Student = require("../../common/models/student.model");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test("Grade 4 Story Roar starts with three hard sentences and persists the exact stable selection", async () => {
  const originalStudentFindById = Student.findById;
  const originalStudentUpdate = Student.findByIdAndUpdate;
  const originalAttemptFind = SpeechAttempt.find;
  const originalSessionCreate = SpeechSession.create;
  const originalSessionFindOne = SpeechSession.findOne;
  let createdPayload;
  let latestSession = null;
  let createCount = 0;

  Student.findById = () => ({
    select: async () => ({
      grade: "4",
      accountStatus: "active",
      lexilandProgress: {
        speech: {
          identificationStatus: "completed",
          improvementUnlocked: true,
          completedActivityIds: [],
          checkpointCount: 0,
        },
      },
    }),
  });
  Student.findByIdAndUpdate = async () => null;
  SpeechAttempt.find = () => ({
    sort() { return this; },
    limit() { return this; },
    lean: async () => [],
  });
  SpeechSession.findOne = () => ({
    sort: async () => latestSession,
  });
  SpeechSession.create = async (payload) => {
    createCount += 1;
    createdPayload = payload;
    latestSession = { _id: "session-4", ...payload };
    return latestSession;
  };

  try {
    const request = {
      user: { id: "student-4", type: "student" },
      body: { activityId: "leo_story_roar" },
    };
    const firstResponse = createResponse();
    const secondResponse = createResponse();

    await speechProcessingController.startImprovementSession(request, firstResponse);
    const firstIds = firstResponse.body.data.prompts.map((prompt) => prompt.promptId);
    const firstPayloadIds = [...createdPayload.promptSet];
    await speechProcessingController.startImprovementSession(request, secondResponse);
    const secondIds = secondResponse.body.data.prompts.map((prompt) => prompt.promptId);

    assert.equal(firstResponse.statusCode, 201);
    assert.equal(secondResponse.statusCode, 200);
    assert.equal(secondResponse.body.data.resumed, true);
    assert.equal(createCount, 1);
    assert.equal(firstResponse.body.data.prompts.filter((prompt) => prompt.difficulty === "hard").length, 3);
    assert.deepEqual(firstPayloadIds, firstIds);
    assert.deepEqual(secondIds, firstIds);
    assert.deepEqual(createdPayload.promptSet, firstIds);
  } finally {
    Student.findById = originalStudentFindById;
    Student.findByIdAndUpdate = originalStudentUpdate;
    SpeechAttempt.find = originalAttemptFind;
    SpeechSession.create = originalSessionCreate;
    SpeechSession.findOne = originalSessionFindOne;
  }
});

test("the stable improvement seed changes when its session inputs change", () => {
  const base = {
    studentId: "student-4",
    activityId: "leo_story_roar",
    completedActivityCount: 1,
    checkpointSequence: 0,
  };

  assert.equal(
    speechProcessingController.buildImprovementSelectionSeed(base),
    "student-4:leo_story_roar:1:0"
  );
  assert.notEqual(
    speechProcessingController.buildImprovementSelectionSeed(base),
    speechProcessingController.buildImprovementSelectionSeed({ ...base, checkpointSequence: 1 })
  );
});

test("Story Roar prompt building honors an explicit selector seed", () => {
  const prompts = speechProcessingController.buildImprovementPromptSet({
    activityId: "leo_story_roar",
    grade: 4,
    seed: "session-4",
  });

  assert.deepEqual(
    prompts.map((prompt) => prompt.promptId),
    [
      "LEO_STORY_001",
      "LEO_STORY_002",
      "LEO_SENTENCE_HARD_05",
      "LEO_SENTENCE_HARD_06",
      "LEO_SENTENCE_HARD_07",
    ]
  );
});

test("checkpoint sentence resolution always supplies fluency metadata", () => {
  const prompt = speechProcessingController.resolveCheckpointPrompt("LEO_SENTENCE_HARD_01");

  assert.equal(prompt.taskType, "sentence_read");
  assert.equal(prompt.skill, "fluency");
  assert.equal(prompt.assessmentRole, "checkpoint");
});

test("guardian sentence attempts expose summary and transcript without token or reprocess details", () => {
  const attempt = {
    _id: "attempt-4",
    sessionId: "session-4",
    studentId: "student-4",
    activityId: "leo_story_roar",
    attemptPhase: "training",
    promptId: "LEO_STORY_001",
    taskType: "sentence_read",
    targetText: "The little bird can sing.",
    gameType: "sentence_read",
    attemptNo: 1,
    validAudio: true,
    invalidReason: "",
    audioUrl: "/uploads/local-original.webm",
    normalizedAudioUrl: "/uploads/local-normalized.wav",
    audioStorage: {
      provider: "cloudinary",
      uploadStatus: "completed",
      originalPublicId: "private-original-id",
      originalSecureUrl: "https://cdn.example.com/original.webm",
      normalizedPublicId: "private-normalized-id",
      normalizedSecureUrl: "https://cdn.example.com/normalized.wav",
      uploadError: "internal-storage-error",
    },
    audioFilePath: "private/attempt-4.webm",
    normalizedAudioPath: "private/attempt-4.wav",
    processingStatus: "completed",
    processingSteps: { asr: "completed", pronunciationModel: "skipped" },
    extractionStatus: "completed",
    extractionError: "internal-extraction-error",
    extractionVersion: "internal-v3",
    features: { pronunciationScorePlaceholder: 0.91, rawVector: [1, 2, 3] },
    volumeFeatures: { meanVolumeDb: -18, rawSamples: [1, 2] },
    silenceFeatures: { estimatedSpeechSec: 2.4, rawSegments: [1, 2] },
    serverAudioDurationMs: 3200,
    audioQuality: {
      qualityLabel: "good",
      qualityScore: 0.92,
      invalidReason: "",
      rawFfmpegProbe: { secret: true },
    },
    audioQualitySummary: { qualityLabel: "good", qualityScore: 0.92, invalidReason: "" },
    starsEarned: 3,
    childFeedback: "Great reading!",
    itemResult: { starsEarned: 3, childFeedback: "Great reading!", internalScore: 0.91 },
    pronunciationModel: {
      status: "success",
      prediction: "low_support",
      predictedPronunciationScore: 0.84,
      probabilities: { low_support: 0.8 },
      featuresUsedCount: 44,
      modelName: "internal-model",
      modelVersion: "internal-v1",
      audioFeaturesSummary: { rms_mean: 0.12 },
      error: "internal-model-error",
    },
    wordReading: {
      targetWord: "bird",
      asrText: "bird",
      normalizedAsrText: "bird",
      wordCorrect: true,
      possibleError: "",
      initialSoundError: false,
      finalSoundError: false,
      editDistance: 0,
      similarityScore: 1,
      attemptStatus: "valid",
      asrProvider: "internal-provider",
      asrModel: "internal-asr-model",
      error: "internal-asr-error",
    },
    phonemeComparison: {
      status: "completed",
      targetPhonemes: ["B", "ER", "D"],
      asrPhonemes: ["B", "ER", "D"],
      phonemeEditDistance: 0,
      phonemeErrorRate: 0,
      initialSoundError: false,
      finalSoundError: false,
      vowelMismatch: false,
      consonantClusterError: false,
      errorPattern: "none",
      confidence: "high",
      warnings: [],
      deletionCount: 0,
      createdAt: "2026-08-29T00:00:00.000Z",
    },
    sentenceReading: {
      targetText: "The little bird can sing.",
      asrText: "the little bird can sing",
      normalizedTargetText: "the little bird can sing",
      normalizedAsrText: "the little bird can sing",
      wordErrorRate: 0,
      wordCoverage: 1,
      sentenceSimilarity: 1,
      wordsPerMinute: 75,
      omittedWordCount: 0,
      insertedWordCount: 0,
      substitutedWordCount: 0,
      tokenErrors: { omittedWords: [], insertedWords: [], substitutions: [] },
      status: "valid",
    },
  };

  const shaped = speechProcessingController.shapeAttemptForRole(attempt, { superAdmin: false });

  assert.equal(shaped._id, "attempt-4");
  assert.equal(shaped.sessionId, "session-4");
  assert.equal(shaped.promptId, "LEO_STORY_001");
  assert.equal(shaped.targetText, "The little bird can sing.");
  assert.equal(shaped.validAudio, true);
  assert.equal(shaped.audioUrl, "https://cdn.example.com/original.webm");
  assert.equal(shaped.normalizedAudioUrl, "https://cdn.example.com/normalized.wav");
  assert.equal(shaped.processingStatus, "completed");
  assert.equal(shaped.serverAudioDurationMs, 3200);
  assert.deepEqual(shaped.audioQuality, {
    qualityLabel: "good",
    qualityScore: 0.92,
    invalidReason: "",
  });
  assert.deepEqual(shaped.itemResult, {
    starsEarned: 3,
    childFeedback: "Great reading!",
  });
  assert.deepEqual(shaped.pronunciationModel, {
    status: "success",
    prediction: "low_support",
    predictedPronunciationScore: 0.84,
  });
  assert.equal(shaped.wordReading.normalizedAsrText, "bird");
  assert.equal(shaped.wordReading.asrProvider, undefined);
  assert.equal(shaped.phonemeComparison.errorPattern, "none");
  assert.equal(shaped.phonemeComparison.deletionCount, undefined);
  assert.deepEqual(shaped.sentenceReading, {
    targetText: "The little bird can sing.",
    asrText: "the little bird can sing",
    wordCoverage: 1,
    sentenceSimilarity: 1,
    wordsPerMinute: 75,
    omittedWordCount: 0,
    status: "valid",
  });
  for (const deniedField of [
    "audioStorage",
    "audioFilePath",
    "normalizedAudioPath",
    "processingSteps",
    "features",
    "volumeFeatures",
    "silenceFeatures",
    "extractionStatus",
    "extractionError",
    "extractionVersion",
    "reprocessMetadata",
  ]) {
    assert.equal(deniedField in shaped, false, `${deniedField} must not be exposed`);
  }
  for (const deniedModelField of [
    "probabilities",
    "featuresUsedCount",
    "modelName",
    "modelVersion",
    "audioFeaturesSummary",
    "error",
  ]) {
    assert.equal(
      deniedModelField in shaped.pronunciationModel,
      false,
      `pronunciationModel.${deniedModelField} must not be exposed`
    );
  }
});

test("super-admin sentence attempts retain token errors and receive reprocess metadata", () => {
  const attempt = {
    _id: "attempt-5",
    validAudio: true,
    normalizedAudioPath: "private/attempt-5.wav",
    processingStatus: "completed",
    processingSteps: { asr: "completed", pronunciationModel: "skipped" },
    sentenceReading: {
      asrText: "the bird sing",
      wordCoverage: 0.75,
      tokenErrors: {
        omittedWords: ["little"],
        insertedWords: [],
        substitutions: [{ expected: "sings", heard: "sing" }],
      },
      status: "valid",
    },
  };

  const shaped = speechProcessingController.shapeAttemptForRole(attempt, { superAdmin: true });

  assert.deepEqual(shaped.sentenceReading.tokenErrors.omittedWords, ["little"]);
  assert.deepEqual(shaped.reprocessMetadata, {
    eligible: true,
    processingStatus: "completed",
    processingSteps: { asr: "completed", pronunciationModel: "skipped" },
  });
});

test("guardian session shaping uses explicit nested allowlists", () => {
  const session = {
    _id: "session-safe",
    studentId: "student-private",
    teacherId: "teacher-private",
    assignmentId: "assignment-private",
    activityId: "leo_story_roar",
    mode: "improvement",
    status: "completed",
    snapshotStatus: "ready",
    supportLevel: "medium_support",
    supportScore: 0.72,
    starsEarned: 9,
    startedAt: "2026-08-29T01:00:00.000Z",
    completedAt: "2026-08-29T01:10:00.000Z",
    createdAt: "2026-08-29T01:00:00.000Z",
    promptSet: ["private-prompt"],
    modelName: "private-model",
    modelVersion: "private-version",
    featureSchemaVersion: "private-schema",
    calibrationVerified: false,
    probabilities: { high_support: 0.7 },
    confidence: 0.7,
    qualityGate: { failures: ["private-failure"] },
    error: "private-error",
    revision: 4,
    pronunciationSummary: {
      status: "ready",
      dominantPrediction: "medium_support",
      meanPronunciationScore: 0.63,
      validPredictionCount: 4,
      meanProbabilities: { medium_support: 0.8 },
      modelVersion: "private-version",
      error: "private-error",
    },
  };
  const attempts = [{
    _id: "attempt-safe",
    taskType: "sentence_read",
    processingStatus: "processing",
    processingSteps: { asr: "processing", pronunciationModel: "processing" },
    sentenceReading: { status: "processing", targetText: "The bird can sing." },
    features: { rawVector: [1, 2, 3] },
  }];
  const activity = {
    activityId: "leo_story_roar",
    title: "Story Roar Trail",
    description: "Read short story sentences.",
    skill: "oral_reading_fluency",
    state: "current",
    starsEarned: 3,
    bestScore: 0.8,
    supportTarget: ["private-support-rule"],
    routeKey: "private-route",
  };

  const shaped = speechProcessingController.shapeSessionForRole(session, {
    attempts,
    activity,
    wordReadingSummary: { wordReadingAccuracy: 0.5 },
    phonemeSummary: { meanPhonemeErrorRate: 0.25 },
    datasetReadiness: { labelledAttemptCount: 1, supportLabelCount: 1, datasetReady: true },
    assessmentSnapshots: [{ probabilities: { private: 1 } }],
    superAdmin: false,
  });

  assert.deepEqual(Object.keys(shaped).sort(), [
    "_id",
    "activity",
    "activityId",
    "attempts",
    "completedAt",
    "createdAt",
    "datasetReadiness",
    "mode",
    "phonemeSummary",
    "pronunciationSummary",
    "sentenceAnalysisProcessing",
    "snapshotStatus",
    "starsEarned",
    "startedAt",
    "status",
    "supportLevel",
    "supportScore",
    "wordReadingSummary",
  ].sort());
  assert.deepEqual(shaped.pronunciationSummary, {
    status: "ready",
    dominantPrediction: "medium_support",
    meanPronunciationScore: 0.63,
    validPredictionCount: 4,
  });
  assert.deepEqual(Object.keys(shaped.activity).sort(), [
    "activityId",
    "bestScore",
    "description",
    "skill",
    "stars",
    "starsEarned",
    "state",
    "title",
  ].sort());
  assert.equal(shaped.sentenceAnalysisProcessing, true);
  assert.equal(shaped.attempts[0].processingSteps, undefined);
  assert.equal(shaped.assessmentSnapshots, undefined);
  assert.equal(shaped.modelVersion, undefined);
  assert.equal(shaped.teacherId, undefined);
  assert.equal(shaped.promptSet, undefined);
});

test("guardian snapshot shaping allowlists metrics and super-admin keeps full detail", () => {
  const snapshot = {
    _id: "snapshot-1",
    studentId: "student-private",
    sessionId: "session-private",
    baselineSnapshotId: "baseline-private",
    previousSnapshotId: "previous-private",
    kind: "checkpoint",
    sequenceNo: 2,
    revision: 3,
    status: "ready",
    modelName: "private-model",
    modelVersion: "private-version",
    featureSchemaVersion: "private-schema",
    calibrationVerified: false,
    supportLevel: "medium_support",
    supportNeedScore: 0.4,
    confidence: 0.8,
    probabilities: { medium_support: 0.8 },
    qualityGate: { passed: true },
    baselineComparison: { deltas: { private: 1 } },
    previousComparison: { deltas: { private: 1 } },
    trendStatus: "positive_trend",
    meaningfulDecision: true,
    crossVersionComparisonBlocked: false,
    comparisonReason: "private-reason",
    error: "private-error",
    createdAt: "2026-08-29T02:00:00.000Z",
    metrics: {
      wordAccuracy: 0.8,
      meanSimilarityScore: 0.7,
      meanPhonemeErrorRate: 0.2,
      retryRate: 0.1,
      meanSentenceCoverage: 0.85,
      meanSentenceWordErrorRate: 0.15,
      meanSentenceSimilarity: 0.9,
      meanSentenceWordsPerMinute: 82,
      meanAudioQualityScore: 0.95,
      invalidAudioRate: 0,
    },
  };

  const guardian = speechProcessingController.shapeSnapshotForRole(snapshot, { superAdmin: false });
  const superAdmin = speechProcessingController.shapeSnapshotForRole(snapshot, { superAdmin: true });

  assert.deepEqual(Object.keys(guardian).sort(), [
    "_id",
    "createdAt",
    "kind",
    "meaningfulDecision",
    "metrics",
    "sequenceNo",
    "status",
    "supportLevel",
    "trendStatus",
  ].sort());
  assert.deepEqual(Object.keys(guardian.metrics).sort(), [
    "meanPhonemeErrorRate",
    "meanSentenceCoverage",
    "meanSentenceWordErrorRate",
    "meanSimilarityScore",
    "retryRate",
    "wordAccuracy",
  ].sort());
  assert.equal(guardian.modelVersion, undefined);
  assert.equal(guardian.qualityGate, undefined);
  assert.equal(guardian.baselineComparison, undefined);
  assert.deepEqual(superAdmin, snapshot);
});

test("guardian speech progress shaping excludes internal links and model state", () => {
  const speech = {
    identificationStatus: "completed",
    supportLevel: "medium_support",
    supportScore: 0.71,
    identificationCompletedAt: "2026-08-29T00:00:00.000Z",
    improvementUnlocked: true,
    recommendedActivityIds: ["leo_story_roar"],
    completedActivityIds: ["leo_echo_roar"],
    currentActivityId: "leo_story_roar",
    stars: 12,
    weakSkillFocus: "fluency",
    checkpointCount: 1,
    activitiesSinceCheckpoint: 0,
    baselineRetestRequired: false,
    activityProgress: [
      {
        _id: "private-progress-subdocument-id",
        activityId: "leo_story_roar",
        status: "completed",
        starsEarned: 3,
        attemptsCompleted: 2,
        bestScore: 0.88,
        stars: 3,
        completedAt: "2026-08-29T01:00:00.000Z",
        lastPlayedAt: "2026-08-29T01:05:00.000Z",
        internalSecret: "private-future-field",
      },
    ],
    baselineSnapshotId: "private-baseline-id",
    latestSnapshotId: "private-latest-id",
    assignmentId: "private-assignment",
    teacherId: "private-teacher",
    promptSet: ["private-prompt"],
    modelVersion: "private-model",
    featureSchemaVersion: "private-schema",
    calibrationVerified: false,
    probabilities: { private: 1 },
    confidence: 0.9,
    qualityGate: { private: true },
    error: "private-error",
  };

  const guardian = speechProcessingController.shapeSpeechProgressForRole(speech, { superAdmin: false });
  const superAdmin = speechProcessingController.shapeSpeechProgressForRole(speech, { superAdmin: true });

  assert.deepEqual(Object.keys(guardian).sort(), [
    "activitiesSinceCheckpoint",
    "activityProgress",
    "baselineRetestRequired",
    "checkpointCount",
    "completedActivityIds",
    "currentActivityId",
    "identificationCompletedAt",
    "identificationStatus",
    "improvementUnlocked",
    "recommendedActivityIds",
    "stars",
    "supportLevel",
    "supportScore",
    "weakSkillFocus",
  ].sort());
  assert.equal(guardian.baselineSnapshotId, undefined);
  assert.equal(guardian.modelVersion, undefined);
  assert.deepEqual(guardian.activityProgress, [
    {
      activityId: "leo_story_roar",
      status: "completed",
      starsEarned: 3,
      attemptsCompleted: 2,
      bestScore: 0.88,
      stars: 3,
      completedAt: "2026-08-29T01:00:00.000Z",
      lastPlayedAt: "2026-08-29T01:05:00.000Z",
    },
  ]);
  assert.equal(guardian.activityProgress[0]._id, undefined);
  assert.equal(guardian.activityProgress[0].internalSecret, undefined);
  assert.deepEqual(superAdmin, speech);

  const malformedGuardian = speechProcessingController.shapeSpeechProgressForRole(
    { activityProgress: { leo_story_roar: { stars: 3 } } },
    { superAdmin: false }
  );
  assert.deepEqual(malformedGuardian.activityProgress, []);
});

test("sentence processing is true for pending sentence ASR", () => {
  assert.equal(
    speechProcessingController.hasPendingSentenceAnalysis([
      {
        taskType: "sentence_read",
        sentenceReading: { status: "processing" },
        processingSteps: { asr: "processing", pronunciationModel: "completed" },
      },
    ]),
    true
  );
});

test("sentence processing ignores non-sentence model processing", () => {
  assert.equal(
    speechProcessingController.hasPendingSentenceAnalysis([
      {
        taskType: "word_read",
        processingStatus: "processing",
        processingSteps: { asr: "completed", pronunciationModel: "processing" },
      },
    ]),
    false
  );
});

test("sentence processing is false after sentence ASR completes", () => {
  assert.equal(
    speechProcessingController.hasPendingSentenceAnalysis([
      {
        taskType: "paragraph_segment_read",
        sentenceReading: { status: "valid" },
        processingSteps: { asr: "completed", pronunciationModel: "skipped" },
      },
    ]),
    false
  );
});

test("Grade 5 completion requires five unique valid prompts from the persisted seven-prompt set", () => {
  const promptSet = [
    "LEO_STORY_001",
    "LEO_SENTENCE_HARDER_16",
    "LEO_SENTENCE_HARDER_17",
    "LEO_SENTENCE_HARDER_18",
    "LEO_PARAGRAPH_1_1",
    "LEO_PARAGRAPH_1_2",
    "LEO_PARAGRAPH_1_3",
  ];
  const attempts = promptSet.map((promptId, index) => ({
    promptId,
    attemptPhase: "training",
    validAudio: index < 4,
    sentenceReading: index < 4
      ? { status: "valid", asrText: "recognizable speech" }
      : { status: "invalid_audio", asrText: "" },
  }));
  attempts.push({
    promptId: "LEO_STORY_001",
    attemptPhase: "training",
    validAudio: true,
    sentenceReading: { status: "valid", asrText: "recognizable speech" },
  });
  attempts.push({
    promptId: "LEO_CP_1_1",
    attemptPhase: "checkpoint",
    validAudio: true,
  });

  const fourOfSeven = speechProcessingController.getTrainingPromptCoverage({
    session: { activityId: "leo_story_roar", promptSet },
    attempts,
  });
  const fiveOfSeven = speechProcessingController.getTrainingPromptCoverage({
    session: { activityId: "leo_story_roar", promptSet },
    attempts: attempts.map((attempt) =>
      attempt.promptId === "LEO_PARAGRAPH_1_1"
        ? {
            ...attempt,
            validAudio: true,
            sentenceReading: { status: "valid", asrText: "recognizable speech" },
          }
        : attempt
    ),
  });

  assert.deepEqual(fourOfSeven, {
    expectedPromptCount: 7,
    completedPromptCount: 4,
    requiredPromptCount: 5,
    complete: false,
  });
  assert.deepEqual(fiveOfSeven, {
    expectedPromptCount: 7,
    completedPromptCount: 5,
    requiredPromptCount: 5,
    complete: true,
  });
});

test("training coverage excludes usable recordings with empty ASR", () => {
  const promptSet = ["p1", "p2", "p3", "p4"];
  const coverage = speechProcessingController.getTrainingPromptCoverage({
    session: { activityId: "leo_story_roar", promptSet },
    attempts: promptSet.map((promptId) => ({
      promptId,
      attemptPhase: "training",
      validAudio: true,
      sentenceReading: { status: "asr_empty", asrText: "" },
    })),
  });

  assert.deepEqual(coverage, {
    expectedPromptCount: 4,
    completedPromptCount: 0,
    requiredPromptCount: 3,
    complete: false,
  });
});

test("improvement completion rejects four valid prompts when Grade 5 persisted seven", async () => {
  const originalSessionFindOne = SpeechSession.findOne;
  const originalAttemptFind = SpeechAttempt.find;
  const originalStudentFindById = Student.findById;
  const promptSet = [
    "LEO_STORY_001",
    "LEO_SENTENCE_HARDER_16",
    "LEO_SENTENCE_HARDER_17",
    "LEO_SENTENCE_HARDER_18",
    "LEO_PARAGRAPH_1_1",
    "LEO_PARAGRAPH_1_2",
    "LEO_PARAGRAPH_1_3",
  ];

  SpeechSession.findOne = async () => ({
    _id: "grade-5-session",
    activityId: "leo_story_roar",
    assessmentRole: "training",
    promptSet,
    status: "in_progress",
  });
  SpeechAttempt.find = () => ({
    sort: async () => promptSet.slice(0, 4).map((promptId) => ({
      promptId,
      attemptPhase: "training",
      validAudio: true,
      sentenceReading: { status: "valid", asrText: "recognizable speech" },
    })),
  });
  Student.findById = () => ({
    select: async () => ({ lexilandProgress: { speech: {} } }),
  });

  try {
    const response = createResponse();
    await speechProcessingController.completeImprovementSession(
      {
        params: { sessionId: "grade-5-session" },
        user: { id: "student-5", type: "student" },
      },
      response
    );

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body.data, {
      completedPromptCount: 4,
      requiredPromptCount: 5,
      expectedPromptCount: 7,
    });
  } finally {
    SpeechSession.findOne = originalSessionFindOne;
    SpeechAttempt.find = originalAttemptFind;
    Student.findById = originalStudentFindById;
  }
});
