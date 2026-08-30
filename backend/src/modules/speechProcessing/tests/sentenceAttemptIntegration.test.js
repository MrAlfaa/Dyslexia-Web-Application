const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const {
  analyzeReadingTask,
  getChildSentenceFeedback,
} = require("../services/sentenceReadingAnalyzer.service");
const SpeechAttempt = require("../models/speechAttempt.model");
const SpeechSession = require("../models/speechSession.model");
const speechProcessingController = require("../controllers/speechProcessing.controller");

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return response;
};

test("sentence tasks use sentence analysis and skip word correctness", () => {
  const result = analyzeReadingTask({
    taskType: "sentence_read",
    targetText: "The cat can run.",
    asrText: "the cat can run",
    audioDurationMs: 3000,
  });

  assert.equal(result.wordReading, undefined);
  assert.equal(result.sentenceReading.exactMatch, true);
});

test("paragraph segments use sentence evidence without creating word evidence", () => {
  const result = analyzeReadingTask({
    taskType: "paragraph_segment_read",
    targetText: "Leo walks beside the river.",
    asrText: "leo walks beside river",
    audioDurationMs: 4000,
    asrProvider: "local_whisper",
    asrModel: "base.en",
  });

  assert.equal(result.wordReading, undefined);
  assert.equal(result.sentenceReading.status, "valid");
  assert.equal(result.sentenceReading.wordCoverage, 0.8);
  assert.equal(result.sentenceReading.asrProvider, "local_whisper");
  assert.equal(result.sentenceReading.asrModel, "base.en");
});

test("word tasks preserve word correctness and do not create sentence evidence", () => {
  const result = analyzeReadingTask({
    taskType: "read_aloud_word",
    targetText: "bat",
    asrText: "pat",
  });

  assert.equal(result.sentenceReading, undefined);
  assert.equal(result.wordReading.wordCorrect, false);
  assert.equal(result.wordReading.initialSoundError, true);
  assert.equal(result.wordReading.attemptStatus, "valid");
});

test("unavailable sentence evidence stays null instead of becoming zero", () => {
  const result = analyzeReadingTask({
    taskType: "sentence_read",
    targetText: "The cat can run.",
    status: "processing",
    warning: "background_processing_pending",
  });

  assert.equal(result.sentenceReading.status, "processing");
  assert.equal(result.sentenceReading.wordCoverage, null);
  assert.equal(result.sentenceReading.wordErrorRate, null);
  assert.equal(result.sentenceReading.wordsPerMinute, null);
  assert.deepEqual(result.sentenceReading.warnings, ["background_processing_pending"]);
});

test("child sentence feedback exposes only state and safe message", () => {
  assert.deepEqual(getChildSentenceFeedback({ status: "valid" }), {
    state: "complete",
    message: "Great reading! Leo heard your story.",
  });
  assert.deepEqual(getChildSentenceFeedback({ status: "processing" }), {
    state: "processing",
    message: "Leo is still listening.",
  });
  assert.deepEqual(getChildSentenceFeedback({ status: "asr_empty" }), {
    state: "saved",
    message: "Your recording was saved. You can continue.",
  });
  assert.deepEqual(getChildSentenceFeedback({ status: "invalid_audio" }), {
    state: "retry",
    message: "හඬ පැහැදිලි නැහැ. නැවත කියවමු.",
  });
});

test("speech attempts persist optional sentence evidence without word evidence", async () => {
  const routed = analyzeReadingTask({
    taskType: "sentence_read",
    targetText: "The cat can run.",
    asrText: "the cat can run",
    audioDurationMs: 3000,
    asrProvider: "local_whisper",
    asrModel: "base.en",
  });
  const attempt = new SpeechAttempt({
    sessionId: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    promptId: "SENTENCE_G2_001",
    taskType: "sentence_read",
    targetText: "The cat can run.",
    attemptNo: 1,
    audioDurationMs: 3000,
    validAudio: true,
    sentenceReading: routed.sentenceReading,
  });

  await attempt.validate();
  assert.equal(attempt.toObject().wordReading, undefined);
  assert.equal(attempt.sentenceReading.exactMatch, true);
  assert.equal(attempt.sentenceReading.targetWordCount, 4);
  assert.deepEqual(attempt.sentenceReading.tokenErrors.omittedWords, []);
  assert.equal(attempt.sentenceReading.asrProvider, "local_whisper");
});

test("legacy speech attempts remain valid without sentence evidence", async () => {
  const attempt = new SpeechAttempt({
    sessionId: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    promptId: "WORD_G2_001",
    taskType: "read_aloud_word",
    targetText: "bat",
    attemptNo: 1,
    audioDurationMs: 1000,
    validAudio: true,
  });

  await attempt.validate();
  assert.equal(attempt.sentenceReading, undefined);
});

test("Story Roar persists sentence evidence and returns only child-safe sentence feedback", async () => {
  const originalFindOne = SpeechSession.findOne;
  const originalCreate = SpeechAttempt.create;
  const originalBackground = process.env.SPEECH_BACKGROUND_PROCESSING;
  const originalMockAsr = process.env.MOCK_ASR_TEXT;
  const originalNodeEnv = process.env.NODE_ENV;
  let persistedAttempt;

  process.env.SPEECH_BACKGROUND_PROCESSING = "false";
  process.env.MOCK_ASR_TEXT = "the cat sat";
  process.env.NODE_ENV = "test";
  SpeechSession.findOne = async () => ({
    _id: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    mode: "improvement",
    activityId: "leo_story_roar",
    grade: "2",
    status: "in_progress",
  });
  SpeechAttempt.create = async (payload) => {
    persistedAttempt = payload;
    return { _id: new mongoose.Types.ObjectId(), ...payload };
  };

  try {
    const req = {
      user: { id: new mongoose.Types.ObjectId().toString(), type: "student" },
      body: {
        sessionId: new mongoose.Types.ObjectId().toString(),
        activityId: "leo_story_roar",
        promptId: "LEO_STORY_001",
        taskType: "sentence_read",
        targetText: "The cat sat.",
        attemptNo: 1,
        audioDurationMs: 3000,
        placeholderMode: true,
      },
    };
    const res = createResponse();

    await speechProcessingController.submitImprovementAttempt(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(persistedAttempt.wordReading, undefined);
    assert.equal(persistedAttempt.phonemeComparison, undefined);
    assert.equal(persistedAttempt.sentenceReading.exactMatch, true);
    assert.deepEqual(res.body.data.sentenceFeedback, {
      state: "complete",
      message: "Great reading! Leo heard your story.",
    });
    assert.equal(res.body.data.wordReading, undefined);
    assert.equal(res.body.data.phonemeComparison, undefined);
    assert.equal(res.body.data.sentenceReading, undefined);
    assert.equal(res.body.data.levelCompleted, true);
  } finally {
    SpeechSession.findOne = originalFindOne;
    SpeechAttempt.create = originalCreate;
    if (originalBackground === undefined) delete process.env.SPEECH_BACKGROUND_PROCESSING;
    else process.env.SPEECH_BACKGROUND_PROCESSING = originalBackground;
    if (originalMockAsr === undefined) delete process.env.MOCK_ASR_TEXT;
    else process.env.MOCK_ASR_TEXT = originalMockAsr;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

test("Story Roar does not fabricate sentence pace when observed duration is missing", async () => {
  const originalFindOne = SpeechSession.findOne;
  const originalCreate = SpeechAttempt.create;
  const originalBackground = process.env.SPEECH_BACKGROUND_PROCESSING;
  const originalMockAsr = process.env.MOCK_ASR_TEXT;
  const originalNodeEnv = process.env.NODE_ENV;
  let persistedAttempt;

  process.env.SPEECH_BACKGROUND_PROCESSING = "false";
  process.env.MOCK_ASR_TEXT = "the cat sat";
  process.env.NODE_ENV = "test";
  SpeechSession.findOne = async () => ({
    _id: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    mode: "improvement",
    activityId: "leo_story_roar",
    grade: "2",
    status: "in_progress",
  });
  SpeechAttempt.create = async (payload) => {
    persistedAttempt = payload;
    return { _id: new mongoose.Types.ObjectId(), ...payload };
  };

  try {
    const req = {
      user: { id: new mongoose.Types.ObjectId().toString(), type: "student" },
      body: {
        sessionId: new mongoose.Types.ObjectId().toString(),
        activityId: "leo_story_roar",
        promptId: "LEO_STORY_001",
        taskType: "sentence_read",
        targetText: "The cat sat.",
        attemptNo: 1,
        placeholderMode: true,
      },
    };
    const res = createResponse();

    await speechProcessingController.submitImprovementAttempt(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(persistedAttempt.validAudio, true);
    assert.equal(persistedAttempt.sentenceReading.status, "valid");
    assert.equal(persistedAttempt.sentenceReading.wordsPerMinute, null);
  } finally {
    SpeechSession.findOne = originalFindOne;
    SpeechAttempt.create = originalCreate;
    if (originalBackground === undefined) delete process.env.SPEECH_BACKGROUND_PROCESSING;
    else process.env.SPEECH_BACKGROUND_PROCESSING = originalBackground;
    if (originalMockAsr === undefined) delete process.env.MOCK_ASR_TEXT;
    else process.env.MOCK_ASR_TEXT = originalMockAsr;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

test("paragraph controller attempts skip pronunciation prediction", async () => {
  const originalSessionCreate = SpeechSession.create;
  const originalAttemptCreate = SpeechAttempt.create;
  const originalBackground = process.env.SPEECH_BACKGROUND_PROCESSING;
  const originalMockAsr = process.env.MOCK_ASR_TEXT;
  const originalNodeEnv = process.env.NODE_ENV;
  let persistedAttempt;

  process.env.SPEECH_BACKGROUND_PROCESSING = "false";
  process.env.MOCK_ASR_TEXT = "leo walks beside the river";
  process.env.NODE_ENV = "test";
  SpeechSession.create = async (payload) => ({
    _id: new mongoose.Types.ObjectId(),
    ...payload,
  });
  SpeechAttempt.create = async (payload) => {
    persistedAttempt = payload;
    return { _id: new mongoose.Types.ObjectId(), ...payload };
  };

  try {
    const req = {
      user: { id: new mongoose.Types.ObjectId().toString(), type: "student" },
      body: {
        promptId: "PARAGRAPH_G5_001_SEG_1",
        taskType: "paragraph_segment_read",
        targetText: "Leo walks beside the river.",
        attemptNo: 1,
        audioDurationMs: 4000,
      },
    };
    const res = createResponse();

    await speechProcessingController.analyzeAttempt(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(persistedAttempt.sentenceReading.status, "valid");
    assert.equal(persistedAttempt.pronunciationModel.status, "skipped");
    assert.equal(persistedAttempt.pronunciationModel.error, "paragraph_practice_excluded");
    assert.equal(persistedAttempt.processingSteps.pronunciationModel, "skipped");
  } finally {
    SpeechSession.create = originalSessionCreate;
    SpeechAttempt.create = originalAttemptCreate;
    if (originalBackground === undefined) delete process.env.SPEECH_BACKGROUND_PROCESSING;
    else process.env.SPEECH_BACKGROUND_PROCESSING = originalBackground;
    if (originalMockAsr === undefined) delete process.env.MOCK_ASR_TEXT;
    else process.env.MOCK_ASR_TEXT = originalMockAsr;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

test("legacy paragraph predictions are excluded from controller support outputs", () => {
  const wordAttempt = {
    taskType: "read_aloud_word",
    validAudio: true,
    attemptNo: 1,
    features: {
      mode: "identification",
      pronunciationScorePlaceholder: 0.8,
      phonemeErrorRatePlaceholder: 0.2,
    },
    pronunciationModel: {
      status: "success",
      prediction: "low_support",
      predictedPronunciationScore: 0.8,
      probabilities: { low_support: 0.8, medium_support: 0.15, high_support: 0.05 },
      modelVersion: "v1",
    },
  };
  const legacyParagraphAttempt = {
    taskType: "paragraph_segment_read",
    validAudio: true,
    attemptNo: 1,
    features: {
      mode: "identification",
      pronunciationScorePlaceholder: 0.1,
      phonemeErrorRatePlaceholder: 0.9,
    },
    pronunciationModel: {
      status: "success",
      prediction: "high_support",
      predictedPronunciationScore: 0.1,
      probabilities: { low_support: 0.05, medium_support: 0.15, high_support: 0.8 },
      modelVersion: "legacy-v0",
    },
  };

  const result = speechProcessingController.aggregateOfficialSupportOutputs([
    wordAttempt,
    legacyParagraphAttempt,
  ]);

  assert.equal(result.pronunciationSummary.validPredictionCount, 1);
  assert.equal(result.pronunciationSummary.dominantPrediction, "low_support");
  assert.equal(result.aggregate.totalAttemptCount, 1);
  assert.equal(result.aggregate.meanPronunciationScore, 0.8);
});

test("improvement responses require recognizable sentence evidence", async () => {
  const originalFindOne = SpeechSession.findOne;
  const originalFindById = SpeechSession.findById;
  const originalCreate = SpeechAttempt.create;
  const originalFindByIdAndUpdate = SpeechAttempt.findByIdAndUpdate;
  const originalBackground = process.env.SPEECH_BACKGROUND_PROCESSING;
  const originalAsrMode = process.env.SPEECH_ASR_SYNC_MODE;
  const originalMockAsr = process.env.MOCK_ASR_TEXT;
  const originalNodeEnv = process.env.NODE_ENV;
  const updates = [];
  let persistedAttempt;

  process.env.SPEECH_BACKGROUND_PROCESSING = "false";
  process.env.SPEECH_ASR_SYNC_MODE = "background";
  process.env.MOCK_ASR_TEXT = "the cat sat";
  process.env.NODE_ENV = "test";
  SpeechSession.findOne = async () => ({
    _id: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    mode: "improvement",
    activityId: "leo_story_roar",
    grade: "2",
    status: "in_progress",
  });
  SpeechSession.findById = async () => null;
  SpeechAttempt.create = async (payload) => {
    persistedAttempt = payload;
    return { _id: new mongoose.Types.ObjectId(), ...payload };
  };
  SpeechAttempt.findByIdAndUpdate = async (_id, update) => {
    updates.push(update);
    return null;
  };

  try {
    const req = {
      user: { id: new mongoose.Types.ObjectId().toString(), type: "student" },
      body: {
        sessionId: new mongoose.Types.ObjectId().toString(),
        activityId: "leo_story_roar",
        promptId: "LEO_STORY_001",
        taskType: "sentence_read",
        targetText: "The cat sat.",
        attemptNo: 1,
        audioDurationMs: 3000,
        placeholderMode: true,
      },
    };
    const res = createResponse();

    await speechProcessingController.submitImprovementAttempt(req, res);

    assert.equal(persistedAttempt.wordReading, undefined);
    assert.equal(persistedAttempt.sentenceReading.status, "valid");
    assert.equal(persistedAttempt.processingSteps.asr, "completed");
    assert.deepEqual(res.body.data.sentenceFeedback, {
      state: "complete",
      message: "Great reading! Leo heard your story.",
    });
    assert.equal(res.body.data.levelCompleted, true);
    assert.equal(
      updates.some((update) => update.$set?.sentenceReading),
      false
    );

    process.env.MOCK_ASR_TEXT = "";
    persistedAttempt = undefined;
    const retryResponse = createResponse();
    await speechProcessingController.submitImprovementAttempt(req, retryResponse);

    assert.equal(persistedAttempt.sentenceReading.status, "asr_empty");
    assert.equal(retryResponse.body.data.levelCompleted, false);
    assert.equal(retryResponse.body.data.nextPromptUnlocked, false);
    assert.equal(retryResponse.body.data.retryRequired, true);
    assert.deepEqual(retryResponse.body.data.sentenceFeedback, {
      state: "retry",
      message: "Leo could not hear the words clearly. Please try again.",
    });
  } finally {
    SpeechSession.findOne = originalFindOne;
    SpeechSession.findById = originalFindById;
    SpeechAttempt.create = originalCreate;
    SpeechAttempt.findByIdAndUpdate = originalFindByIdAndUpdate;
    if (originalBackground === undefined) delete process.env.SPEECH_BACKGROUND_PROCESSING;
    else process.env.SPEECH_BACKGROUND_PROCESSING = originalBackground;
    if (originalAsrMode === undefined) delete process.env.SPEECH_ASR_SYNC_MODE;
    else process.env.SPEECH_ASR_SYNC_MODE = originalAsrMode;
    if (originalMockAsr === undefined) delete process.env.MOCK_ASR_TEXT;
    else process.env.MOCK_ASR_TEXT = originalMockAsr;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

test("sentence reprocessing replaces evidence idempotently and keeps word evidence unset", async () => {
  const originalAttemptFindById = SpeechAttempt.findById;
  const originalSessionFindById = SpeechSession.findById;
  const originalMockAsr = process.env.MOCK_ASR_TEXT;
  const attempt = {
    _id: new mongoose.Types.ObjectId(),
    sessionId: new mongoose.Types.ObjectId(),
    taskType: "sentence_read",
    targetText: "The cat sat.",
    validAudio: true,
    normalizedAudioPath: "retained-audio.wav",
    audioDurationMs: 3000,
    serverAudioDurationMs: 3000,
    features: { validAudio: true },
    processingSteps: {},
    wordReading: { targetWord: "the" },
    phonemeComparison: { status: "completed" },
    set(path, value) {
      this[path] = value;
    },
    async save() {},
  };

  process.env.MOCK_ASR_TEXT = "the cat sat";
  SpeechAttempt.findById = async () => attempt;
  SpeechSession.findById = async () => null;

  try {
    const firstResponse = createResponse();
    const secondResponse = createResponse();
    const req = { params: { attemptId: attempt._id.toString() } };

    await speechProcessingController.reprocessAttemptAnalysis(req, firstResponse);
    const firstEvidence = JSON.parse(JSON.stringify(attempt.sentenceReading));
    await speechProcessingController.reprocessAttemptAnalysis(req, secondResponse);
    const secondEvidence = JSON.parse(JSON.stringify(attempt.sentenceReading));
    delete firstEvidence.createdAt;
    delete secondEvidence.createdAt;

    assert.deepEqual(secondEvidence, firstEvidence);
    assert.equal(attempt.wordReading, undefined);
    assert.equal(attempt.phonemeComparison, undefined);
    assert.equal(secondResponse.body.data.sentenceReading.exactMatch, true);
    assert.equal(secondResponse.body.data.wordReading, undefined);
  } finally {
    SpeechAttempt.findById = originalAttemptFindById;
    SpeechSession.findById = originalSessionFindById;
    if (originalMockAsr === undefined) delete process.env.MOCK_ASR_TEXT;
    else process.env.MOCK_ASR_TEXT = originalMockAsr;
  }
});

test("paragraph reprocessing keeps pronunciation prediction skipped", async () => {
  const originalAttemptFindById = SpeechAttempt.findById;
  const originalSessionFindById = SpeechSession.findById;
  const originalMockAsr = process.env.MOCK_ASR_TEXT;
  const attempt = {
    _id: new mongoose.Types.ObjectId(),
    sessionId: new mongoose.Types.ObjectId(),
    taskType: "paragraph_segment_read",
    targetText: "Leo walks beside the river.",
    validAudio: true,
    normalizedAudioPath: "retained-audio.wav",
    serverAudioDurationMs: 4000,
    features: { validAudio: true },
    processingSteps: {},
    pronunciationModel: { status: "success", prediction: "high_support" },
    set(path, value) {
      this[path] = value;
    },
    async save() {},
  };

  process.env.MOCK_ASR_TEXT = "leo walks beside the river";
  SpeechAttempt.findById = async () => attempt;
  SpeechSession.findById = async () => null;

  try {
    const res = createResponse();
    await speechProcessingController.reprocessAttemptAnalysis(
      { params: { attemptId: attempt._id.toString() } },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(attempt.pronunciationModel.status, "skipped");
    assert.equal(attempt.pronunciationModel.error, "paragraph_practice_excluded");
    assert.equal(attempt.processingSteps.pronunciationModel, "skipped");
  } finally {
    SpeechAttempt.findById = originalAttemptFindById;
    SpeechSession.findById = originalSessionFindById;
    if (originalMockAsr === undefined) delete process.env.MOCK_ASR_TEXT;
    else process.env.MOCK_ASR_TEXT = originalMockAsr;
  }
});
